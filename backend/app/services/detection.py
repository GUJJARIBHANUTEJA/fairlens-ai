import re
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from backend.app.schemas import (
    DatasetProfile,
    TargetCandidate,
    ProtectedAttributeCandidate,
    ProxySignal,
    DetectionSummary
)

# Common target naming signals
TARGET_NAME_PATTERNS = {
    # High confidence tokens
    r"\b(target|label|outcome|class|y)\b": 0.45,
    r"\b(status|decision|approved|approval|loan status|credit status|underwriting decision|application status)\b": 0.50,
    r"\b(hired|hiring|selection|hiring decision|recruited|employment decision)\b": 0.50,
    r"\b(pass|passed|result|performance|exam result|test preparation course|test prep)\b": 0.45,
    r"\b(income|income class|salary class|high income|salary)\b": 0.45,
    r"\b(churn|churned|attrition|left)\b": 0.40,
    r"\b(default|defaulter|delinquent|risk flag|bad credit)\b": 0.45,
    r"\b(grant|granted|admitted|admission|accepted)\b": 0.40,
    r"\b(promoted|promotion|survived|response)\b": 0.40,
}

# Positive class mapping tokens
POSITIVE_TOKENS = {
    "1", "1.0", "y", "yes", "true", "approved", "hired", "pass", "passed", "grant", "granted",
    "admitted", "accepted", "selected", "promoted", "good", "high", ">50k", ">=50k", "> 50k",
    "positive", "success", "completed"
}

# Protected attribute naming signals and base scores
PROTECTED_PATTERNS = [
    (r"\b(gender|sex)\b", "Gender", 0.70),
    (r"\b(race|ethnicity|ethnic|heritage)\b", "Race/Ethnicity", 0.70),
    (r"\b(age|age group|age bracket|generation)\b", "Age", 0.60),
    (r"\b(marital|marital status|marriage)\b", "Marital Status", 0.55),
    (r"\b(religion|faith|creed)\b", "Religion", 0.60),
    (r"\b(nationality|citizenship|native country|origin)\b", "Nationality", 0.55),
    (r"\b(disability|handicap|disabled)\b", "Disability", 0.60),
    (r"\b(caste|tribe)\b", "Demographic Group", 0.60),
    (r"\b(veteran|veteran status)\b", "Veteran Status", 0.50),
]

# Value-based signals for protected attributes
GENDER_VALUES = {"male", "female", "m", "f", "non-binary", "transgender", "woman", "man", "boy", "girl"}
MARITAL_VALUES = {"married", "single", "divorced", "widowed", "separated", "civil union"}

def calculate_cramers_v(cat_series_1: pd.Series, cat_series_2: pd.Series) -> float:
    """Calculates Cramér's V correlation between two categorical series."""
    confusion_matrix = pd.crosstab(cat_series_1, cat_series_2)
    if confusion_matrix.empty or confusion_matrix.size <= 1:
        return 0.0
    chi2 = 0.0
    n = confusion_matrix.values.sum()
    if n == 0:
        return 0.0
    row_sums = confusion_matrix.values.sum(axis=1, keepdims=True)
    col_sums = confusion_matrix.values.sum(axis=0, keepdims=True)
    expected = (row_sums @ col_sums) / n
    with np.errstate(divide='ignore', invalid='ignore'):
        chi2_elements = np.nan_to_num((confusion_matrix.values - expected) ** 2 / expected)
    chi2 = float(np.sum(chi2_elements))
    
    r, k = confusion_matrix.shape
    phi2 = chi2 / n
    phi2corr = max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1)) if n > 1 else 0
    rcorr = r - ((r - 1) ** 2) / (n - 1) if n > 1 else r
    kcorr = k - ((k - 1) ** 2) / (n - 1) if n > 1 else k
    denom = min(kcorr - 1, rcorr - 1)
    if denom <= 0:
        return 0.0
    return float(np.sqrt(phi2corr / denom))

def calculate_correlation_ratio(cat_series: pd.Series, num_series: pd.Series) -> float:
    """Calculates Correlation Ratio (eta) between a categorical and a numerical series."""
    clean_df = pd.DataFrame({"cat": cat_series, "num": pd.to_numeric(num_series, errors="coerce")}).dropna()
    if len(clean_df) < 10 or clean_df["cat"].nunique() <= 1:
        return 0.0
    
    overall_mean = clean_df["num"].mean()
    group_stats = clean_df.groupby("cat")["num"].agg(["count", "mean"])
    ss_between = float(np.sum(group_stats["count"] * ((group_stats["mean"] - overall_mean) ** 2)))
    ss_total = float(np.sum((clean_df["num"] - overall_mean) ** 2))
    
    if ss_total <= 0:
        return 0.0
    return float(np.sqrt(min(max(ss_between / ss_total, 0.0), 1.0)))

def detect_positive_class(series: pd.Series, detected_classes: List[Any]) -> Any:
    """Identifies the desirable/positive outcome class."""
    if len(detected_classes) == 2:
        # Check standard binary integers
        set_classes = set(str(c).strip().lower() for c in detected_classes)
        if set_classes == {"0", "1"}:
            for c in detected_classes:
                if str(c).strip() == "1":
                    return c
        if set_classes == {"n", "y"} or set_classes == {"no", "yes"}:
            for c in detected_classes:
                if str(c).strip().lower() in {"y", "yes"}:
                    return c
        
        # Check against positive tokens
        for c in detected_classes:
            c_str = str(c).strip().lower()
            if any(tok in c_str for tok in POSITIVE_TOKENS):
                return c
                
        # Default: pick second class if sorted (e.g. True/False -> True, 0/1 -> 1)
        return sorted(detected_classes, key=lambda x: str(x))[-1]
        
    # If more than 2, check if any token matches
    for c in detected_classes:
        c_str = str(c).strip().lower()
        if any(tok in c_str for tok in POSITIVE_TOKENS):
            return c
            
    return detected_classes[-1] if detected_classes else None

def score_target_candidate(col: str, series: pd.Series, col_idx: int, total_cols: int, profile: DatasetProfile) -> Tuple[float, str]:
    """Calculates confidence score (0.0 - 1.0) and rationale for a column being the prediction target."""
    col_clean = str(col).lower().replace("-", " ").replace("_", " ").replace("/", " ").strip()
    score = 0.0
    reasons: List[str] = []
    
    # Never choose constant, ID, or PII columns
    if col in profile.id_columns or col in profile.pii_columns or col in profile.constant_columns:
        return 0.0, "Column is flagged as ID, PII, or constant."
        
    n_unique = series.nunique(dropna=True)
    if n_unique < 2:
        return 0.0, "Column has fewer than 2 unique values."
        
    # Demographic protected columns must NEVER be chosen as the prediction target
    for pat, _, _ in PROTECTED_PATTERNS:
        if re.search(pat, col_clean):
            return 0.0, "Column is recognized as a protected demographic attribute."
    sample_values_lower = set(str(v).lower().strip() for v in series.dropna().head(10))
    if sample_values_lower.intersection(GENDER_VALUES) and n_unique <= 4:
        return 0.0, "Column contains recognized gender demographic categories."
        
    # Naming patterns
    matched_pattern = False
    for pat, weight in TARGET_NAME_PATTERNS.items():
        if re.search(pat, col_clean):
            score += weight
            reasons.append(f"Column name matches target pattern '{pat}'")
            matched_pattern = True
            break
            
    # Binary cardinality bonus (primary target signal in classification)
    if n_unique == 2:
        score += 0.35
        reasons.append("Binary outcome structure (exactly 2 unique values)")
    elif 3 <= n_unique <= 5:
        score += 0.25
        reasons.append(f"Low-cardinality decision structure ({n_unique} unique values)")
    elif n_unique > 20:
        # High cardinality penalty for classification
        score -= 0.35
        
    # Position bonus: last column or in final 4 columns
    if col_idx == total_cols - 1:
        score += 0.20
        reasons.append("Placed in final column position (standard tabular dataset target position)")
    elif col_idx >= total_cols - 4:
        score += 0.15
        reasons.append("Placed among final columns in schema")
        
    # Target-indicative sample values (e.g. approved, declined, pass, fail, 0/1, yes/no)
    if any(any(tok in str(v).lower() for tok in POSITIVE_TOKENS) for v in series.dropna().head(20)):
        score += 0.15
        reasons.append("Contains positive outcome values (e.g. approved, hired, pass, 1, yes)")
        
    # Clamping
    final_score = max(0.0, min(1.0, score))
    reason_str = "; ".join(reasons) if reasons else "Statistical structure consistent with outcome variable."
    return round(final_score, 3), reason_str

def score_protected_candidate(col: str, series: pd.Series, profile: DatasetProfile) -> Tuple[float, str, List[str], str, str]:
    """Scores if a column is a protected demographic attribute, detecting groups and reference group."""
    col_clean = str(col).lower().replace("-", " ").replace("_", " ").replace("/", " ").strip()
    score = 0.0
    reasons: List[str] = []
    
    # Reject ID, PII, constant
    if col in profile.id_columns or col in profile.pii_columns or col in profile.constant_columns:
        return 0.0, "Column is ID or PII.", [], "", ""
        
    n_unique = series.nunique(dropna=True)
    is_numeric_age = "age" in col_clean and pd.api.types.is_numeric_dtype(series)
    
    if (n_unique < 2 or n_unique > 15) and not is_numeric_age:
        return 0.0, f"Cardinality ({n_unique}) outside demographic group range.", [], "", ""
            
    # Check naming patterns
    for pat, attr_type, weight in PROTECTED_PATTERNS:
        if re.search(pat, col_clean):
            score += weight
            reasons.append(f"Matches sensitive demographic domain: {attr_type}")
            break
            
    # Check value patterns
    sample_values = set(str(v).lower().strip() for v in series.dropna().unique()[:20])
    if sample_values.intersection(GENDER_VALUES):
        score += 0.35
        reasons.append("Values match recognized gender terms")
    if sample_values.intersection(MARITAL_VALUES):
        score += 0.30
        reasons.append("Values match marital status descriptors")
        
    # Categorical/string bonus for demographic columns
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series) or isinstance(series.dtype, pd.CategoricalDtype):
        if 2 <= n_unique <= 8:
            score += 0.15
            reasons.append(f"Distinct demographic group cardinality ({n_unique} groups)")
            
    final_score = max(0.0, min(1.0, score))
    if final_score < 0.35:
        return 0.0, "Not a protected attribute candidate.", [], "", ""
        
    # Detected groups & reference group
    if is_numeric_age and n_unique > 8:
        binned = pd.cut(series.dropna(), bins=[0, 29, 45, 60, 150], labels=["Under 30", "30-45", "46-60", "Over 60"])
        val_counts = binned.value_counts(dropna=True)
        detected_groups = [str(g) for g in val_counts.index.tolist()]
        ref_group = str(val_counts.index[0])
        ref_count = int(val_counts.iloc[0])
        ref_pct = (ref_count / max(len(binned.dropna()), 1)) * 100
        ref_reason = f"Largest sufficiently represented age bracket (N={ref_count:,}, {ref_pct:.1f}% of observations)"
    else:
        val_counts = series.value_counts(dropna=True)
        detected_groups = [str(g) for g in val_counts.index.tolist()[:10]]
        ref_group = str(val_counts.index[0])
        ref_count = int(val_counts.iloc[0])
        ref_pct = (ref_count / max(len(series.dropna()), 1)) * 100
        ref_reason = f"Largest sufficiently represented group in the dataset (N={ref_count:,}, {ref_pct:.1f}% of observations)"
    
    reason_str = "; ".join(reasons)
    return round(final_score, 3), reason_str, detected_groups, ref_group, ref_reason

def detect_proxy_signals(df: pd.DataFrame, protected_cols: List[str], feature_cols: List[str]) -> List[ProxySignal]:
    """Identifies non-protected features that correlate strongly with protected attributes."""
    proxies: List[ProxySignal] = []
    # Sample up to 5,000 rows for high-performance correlation calculation
    calc_df = df.sample(n=min(len(df), 5000), random_state=42) if len(df) > 5000 else df
    for prot in protected_cols:
        prot_series = calc_df[prot].astype(str)
        for feat in feature_cols:
            if feat == prot:
                continue
            feat_series = calc_df[feat]
            corr_val = 0.0
            
            if pd.api.types.is_numeric_dtype(feat_series):
                corr_val = calculate_correlation_ratio(prot_series, feat_series)
            else:
                corr_val = calculate_cramers_v(prot_series, feat_series.astype(str))
                
            if corr_val >= 0.28:
                proxies.append(ProxySignal(
                    feature=feat,
                    protected_attribute=prot,
                    correlation_score=round(corr_val, 3),
                    message=f"'{feat}' shows correlation ({corr_val:.2f}) with protected attribute '{prot}' and should be investigated as a potential proxy."
                ))
    # Sort by correlation descending
    proxies.sort(key=lambda p: p.correlation_score, reverse=True)
    return proxies

def detect_dataset_roles(df: pd.DataFrame, profile: DatasetProfile) -> DetectionSummary:
    """Automatically detects target, protected attributes, groups, reference groups, and proxies."""
    row_count, col_count = df.shape
    
    # 1. Target Candidates
    target_candidates: List[TargetCandidate] = []
    for idx, col in enumerate(df.columns):
        series = df[col]
        score, reason = score_target_candidate(col, series, idx, col_count, profile)
        if score >= 0.35:
            classes = [c for c in series.dropna().unique().tolist()[:10]]
            pos_class = detect_positive_class(series, classes)
            target_candidates.append(TargetCandidate(
                column=str(col),
                confidence=score,
                detected_classes=classes,
                positive_class=pos_class,
                reason=reason
            ))
            
    # Sort candidates by confidence
    target_candidates.sort(key=lambda c: c.confidence, reverse=True)
    
    # Fallback if no target scored above 0.35: take last non-id/pii column with 2-10 unique values
    if not target_candidates:
        candidates_pool = [c for c in reversed(df.columns) if c not in profile.id_columns and c not in profile.pii_columns and c not in profile.constant_columns]
        for c in candidates_pool:
            n_unq = df[c].nunique(dropna=True)
            if 2 <= n_unq <= 10:
                classes = df[c].dropna().unique().tolist()
                pos_class = detect_positive_class(df[c], classes)
                target_candidates.append(TargetCandidate(
                    column=str(c),
                    confidence=0.50,
                    detected_classes=classes,
                    positive_class=pos_class,
                    reason="Selected by position and categorical cardinality fallback."
                ))
                break

    selected_target = target_candidates[0].column if target_candidates else str(df.columns[-1])
    target_confidence = target_candidates[0].confidence if target_candidates else 0.50
    is_target_confident = target_confidence >= 0.70
    positive_class = target_candidates[0].positive_class if target_candidates else None
    
    # Mark in profile
    for col_info in profile.columns:
        if col_info.name == selected_target:
            col_info.is_target_candidate = True

    # 2. Protected Attribute Candidates
    protected_candidates: List[ProtectedAttributeCandidate] = []
    for col in df.columns:
        if col == selected_target:
            continue
        series = df[col]
        score, reason, groups, ref_group, ref_reason = score_protected_candidate(col, series, profile)
        if score >= 0.40:
            protected_candidates.append(ProtectedAttributeCandidate(
                column=str(col),
                confidence=score,
                detected_groups=groups,
                recommended_reference_group=ref_group,
                reference_reason=ref_reason,
                reason=reason
            ))
            
    # Sort protected candidates by confidence
    protected_candidates.sort(key=lambda p: p.confidence, reverse=True)
    
    # Select all protected attributes with confidence >= 0.50 for multi-attribute audit
    selected_protected = [p.column for p in protected_candidates if p.confidence >= 0.50]
    # If none >= 0.50 but some >= 0.40, include top 1
    if not selected_protected and protected_candidates:
        selected_protected = [protected_candidates[0].column]
        
    # Reference groups dict
    reference_groups: Dict[str, str] = {}
    for p in protected_candidates:
        reference_groups[p.column] = p.recommended_reference_group
        for col_info in profile.columns:
            if col_info.name == p.column:
                col_info.is_protected_candidate = True
                
    # 3. Proxy Signals
    feature_cols = [c for c in df.columns if c != selected_target and c not in profile.id_columns and c not in profile.pii_columns]
    detected_proxies = detect_proxy_signals(df, selected_protected, feature_cols)
    
    return DetectionSummary(
        target_candidates=target_candidates,
        selected_target=selected_target,
        target_confidence=target_confidence,
        is_target_confident=is_target_confident,
        positive_class=positive_class,
        protected_attribute_candidates=protected_candidates,
        selected_protected_attributes=selected_protected,
        reference_groups=reference_groups,
        detected_proxies=detected_proxies
    )
