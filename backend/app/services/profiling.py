import re
from typing import Any, Dict, List, Tuple
import pandas as pd
import numpy as np

from backend.app.schemas import ColumnInfo, DatasetProfile

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_REGEX = re.compile(r"^(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?[\d]{3}[-.\s]?[\d]{4}$")
SSN_REGEX = re.compile(r"^\d{3}-\d{2}-\d{4}$")

ID_TOKENS = {
    "id", "uuid", "guid", "index", "identifier", "application_id", "applicant_id", 
    "cust_id", "customer_id", "user_id", "account_id", "member_id", "loan_id", 
    "employee_id", "candidate_id", "underwriter_id", "transaction_id", "row_id", "record_id"
}
PII_TOKENS = {
    "email", "phone", "first_name", "last_name", "firstname", "lastname", 
    "full_name", "address", "street", "street_address", "ssn", "social_security", 
    "passport", "mobile", "business_name", "postal_code", "zipcode", "zip_code",
    "telephone", "cellphone", "candidate_name", "applicant_name", "user_name",
    "customer_name", "client_name", "forename", "surname"
}
LEAKAGE_TOKENS = {"post_", "decision_reason", "rejection_reason", "approval_date", "outcome_notes", "granted_amount", "resolved_date", "decision_notes", "decision_date"}

def is_date_column(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    if not (pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)):
        return False
    sample = series.dropna().head(30)
    if len(sample) < 3:
        return False
    date_like_matches = 0
    date_pattern = re.compile(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$")
    for val in sample:
        val_str = str(val).strip()
        if date_pattern.match(val_str):
            date_like_matches += 1
    return date_like_matches / len(sample) >= 0.7

def is_pii_series(name: str, series: pd.Series) -> bool:
    clean_name = name.lower().replace("-", "_").replace(" ", "_").strip()
    name_has_pii = any(token in clean_name for token in PII_TOKENS)
    if clean_name.endswith("_name") and not any(k in clean_name for k in ["model_", "dataset_", "group_", "class_", "file_", "type_"]):
        name_has_pii = True
    
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        sample = series.dropna().astype(str).str.strip().head(50)
        if len(sample) > 0:
            email_matches = sum(bool(EMAIL_REGEX.match(s)) for s in sample)
            phone_matches = sum(bool(PHONE_REGEX.match(s)) for s in sample)
            ssn_matches = sum(bool(SSN_REGEX.match(s)) for s in sample)
            if (email_matches / len(sample) >= 0.3) or (phone_matches / len(sample) >= 0.3) or (ssn_matches / len(sample) >= 0.3):
                return True
        if name_has_pii and series.nunique() > 1:
            return True
    elif name_has_pii:
        return True
    return False

def is_id_series(name: str, series: pd.Series, row_count: int, is_pii: bool = False) -> bool:
    if is_pii:
        return False
        
    clean_name = name.lower().replace("-", "_").replace(" ", "_").strip()
    name_tokens = set(clean_name.split("_"))
    has_id_token = bool(name_tokens.intersection(ID_TOKENS)) or clean_name.endswith("_id") or clean_name.endswith("_uuid") or clean_name == "id"
    
    n_unique = series.nunique(dropna=True)
    uniqueness_ratio = n_unique / max(row_count, 1)
    
    # Obvious ID naming pattern
    if has_id_token:
        if n_unique > 5:
            return True
            
    # Strictly unique sequence or key (excluding personal text columns)
    if row_count >= 20 and uniqueness_ratio >= 0.98:
        if pd.api.types.is_integer_dtype(series):
            sorted_diff = np.diff(np.sort(series.dropna().values[:100]))
            if len(sorted_diff) > 5 and np.all(sorted_diff == 1):
                return True
        elif pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            # Only classify unique strings as ID if name suggests code/id/key/hash
            if any(t in clean_name for t in ["id", "code", "key", "uuid", "guid", "hash", "token"]):
                return True
                
    return False

def mask_pii_sample_value(val: Any) -> Any:
    if pd.isna(val):
        return None
    s = str(val).strip()
    if "@" in s:
        parts = s.split("@", 1)
        domain = parts[1] if len(parts) > 1 else "example.com"
        return f"******@{domain}"
    if any(c.isdigit() for c in s) and ("+" in s or "-" in s or " " in s):
        digits = "".join([c for c in s if c.isdigit()])
        if len(digits) >= 4:
            return f"***-***-{digits[-4:]}"
        return "***-***-****"
    if len(s) > 3:
        return f"{s[0]}****{s[-1]}"
    return "***"

def profile_dataset(df: pd.DataFrame) -> DatasetProfile:
    row_count, col_count = df.shape
    columns_info: List[ColumnInfo] = []
    numerical_cols: List[str] = []
    categorical_cols: List[str] = []
    date_cols: List[str] = []
    id_cols: List[str] = []
    pii_cols: List[str] = []
    constant_cols: List[str] = []
    leakage_cols: List[str] = []
    warnings: List[str] = []
    
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        warnings.append(f"Found {dup_count} duplicate row(s) in the dataset.")
        
    total_missing = int(df.isna().sum().sum())
    if total_missing > 0:
        warnings.append(f"Dataset contains {total_missing} missing value(s) across columns.")

    for col in df.columns:
        series = df[col]
        n_unique = int(series.nunique(dropna=False))
        n_missing = int(series.isna().sum())
        missing_ratio = float(n_missing / max(row_count, 1))
        
        # Constant check
        is_const = (n_unique <= 1)
        if is_const:
            constant_cols.append(col)
            warnings.append(f"Column '{col}' is constant (only {n_unique} unique value).")
            
        # Missingness warning
        if missing_ratio > 0.40:
            warnings.append(f"Column '{col}' has high missingness ({missing_ratio:.1%}).")
            
        # Date check
        is_date = is_date_column(series)
        if is_date:
            date_cols.append(col)
            
        # PII check
        is_pii = is_pii_series(str(col), series)
        if is_pii:
            pii_cols.append(col)
            warnings.append(f"Column '{col}' flagged as potential PII (Personally Identifiable Information).")
            
        # ID check (excluding columns identified as PII)
        is_id = is_id_series(str(col), series, row_count, is_pii=is_pii)
        if is_id:
            id_cols.append(col)
            
        # Leakage check
        col_lower = str(col).lower()
        if any(token in col_lower for token in LEAKAGE_TOKENS):
            leakage_cols.append(col)
            warnings.append(f"Column '{col}' suspected as potential post-decision target leakage.")
            
        # Type inference
        if is_const:
            inferred = "constant"
        elif is_pii:
            inferred = "pii"
        elif is_id:
            inferred = "id"
        elif is_date:
            inferred = "datetime"
        elif pd.api.types.is_bool_dtype(series):
            inferred = "boolean"
            categorical_cols.append(col)
        elif pd.api.types.is_numeric_dtype(series):
            # Check if it's low cardinality categorical coded as int (e.g. 0/1 or 1/2/3)
            if n_unique <= 5 and not is_id and not is_pii:
                inferred = "categorical"
                categorical_cols.append(col)
            else:
                inferred = "numeric"
                numerical_cols.append(col)
        else:
            inferred = "categorical"
            categorical_cols.append(col)
            
        # Extract clean sample values (mask direct PII values)
        if is_pii:
            samples = [mask_pii_sample_value(v) for v in series.dropna().head(5).tolist()]
        else:
            samples = [None if pd.isna(v) else (bool(v) if isinstance(v, (bool, np.bool_)) else (int(v) if isinstance(v, (int, np.integer)) else (round(float(v), 3) if isinstance(v, (float, np.floating)) else str(v)))) for v in series.dropna().head(5).tolist()]
        
        columns_info.append(ColumnInfo(
            name=str(col),
            dtype=str(series.dtype),
            inferred_type=inferred,
            unique_count=n_unique,
            missing_count=n_missing,
            missing_ratio=round(missing_ratio, 4),
            sample_values=samples,
            is_constant=is_const,
            is_id=is_id,
            is_pii=is_pii,
            is_target_candidate=False,
            is_protected_candidate=False
        ))
        
    return DatasetProfile(
        row_count=row_count,
        column_count=col_count,
        columns=columns_info,
        numerical_columns=numerical_cols,
        categorical_columns=categorical_cols,
        date_columns=date_cols,
        id_columns=id_cols,
        pii_columns=pii_cols,
        constant_columns=constant_cols,
        missing_values_count=total_missing,
        duplicate_rows_count=dup_count,
        data_quality_warnings=warnings,
        suspicious_leakage=leakage_cols
    )
