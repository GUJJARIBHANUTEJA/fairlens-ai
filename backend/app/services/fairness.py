from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.config import settings
from backend.app.schemas import (
    AttributeFairnessAudit,
    FairnessAuditSummary,
    GroupFairnessMetrics
)

def compute_group_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    group_mask: np.ndarray,
    group_name: str
) -> GroupFairnessMetrics:
    """Calculates granular classification and prediction rate metrics for a demographic subgroup."""
    n_samples = int(np.sum(group_mask))
    valid_size = n_samples >= settings.MIN_GROUP_SAMPLE_SIZE
    
    if n_samples == 0:
        return GroupFairnessMetrics(
            group_name=group_name,
            sample_count=0,
            sample_size_valid=False,
            actual_positive_rate=0.0,
            predicted_positive_rate=0.0,
            warning="No observations for this subgroup in the test partition."
        )
        
    y_true_grp = y_true[group_mask]
    y_pred_grp = y_pred[group_mask]
    
    act_pos_rate = float(np.mean(y_true_grp == 1))
    pred_pos_rate = float(np.mean(y_pred_grp == 1))
    
    # TPR (Recall): TP / (TP + FN)
    actual_pos_mask = (y_true_grp == 1)
    n_act_pos = int(np.sum(actual_pos_mask))
    tpr = float(np.mean(y_pred_grp[actual_pos_mask] == 1)) if n_act_pos > 0 else None
    
    # FPR: FP / (FP + TN)
    actual_neg_mask = (y_true_grp == 0)
    n_act_neg = int(np.sum(actual_neg_mask))
    fpr = float(np.mean(y_pred_grp[actual_neg_mask] == 1)) if n_act_neg > 0 else None
    
    # Precision: TP / (TP + FP)
    pred_pos_mask = (y_pred_grp == 1)
    n_pred_pos = int(np.sum(pred_pos_mask))
    precision = float(np.mean(y_true_grp[pred_pos_mask] == 1)) if n_pred_pos > 0 else None
    
    warning = None
    if not valid_size:
        warning = f"Insufficient sample size (N={n_samples} < {settings.MIN_GROUP_SAMPLE_SIZE}) for reliable statistical assessment."
        
    return GroupFairnessMetrics(
        group_name=group_name,
        sample_count=n_samples,
        sample_size_valid=valid_size,
        actual_positive_rate=round(act_pos_rate, 4),
        predicted_positive_rate=round(pred_pos_rate, 4),
        tpr=round(tpr, 4) if tpr is not None else None,
        fpr=round(fpr, 4) if fpr is not None else None,
        precision=round(precision, 4) if precision is not None else None,
        recall=round(tpr, 4) if tpr is not None else None,
        warning=warning
    )

def format_ratio_phrase(disadv_rate: float, ref_rate: float) -> str:
    """Formats a readable human ratio comparison between two rates."""
    if ref_rate <= 0:
        return "at a lower rate than"
    ratio = disadv_rate / ref_rate
    if ratio < 0.05:
        return "at a fraction (< 5%) of"
    if 0.40 <= ratio <= 0.60:
        return "at roughly half"
    if 0.25 <= ratio < 0.40:
        return "at roughly one-third"
    if 0.60 < ratio < 0.80:
        return f"at roughly {ratio:.0%} of"
    return f"at {ratio:.0%} of"

def audit_single_attribute(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    prot_series: pd.Series,
    attribute_name: str,
    reference_group: str,
    reference_reason: str
) -> AttributeFairnessAudit:
    """Conducts a rigorous fairness audit on a single protected attribute across all subgroups."""
    unique_groups = prot_series.unique().tolist()
    
    # Ensure reference group is first
    if reference_group not in unique_groups and len(unique_groups) > 0:
        reference_group = str(unique_groups[0])
        
    ordered_groups = [reference_group] + [g for g in unique_groups if str(g) != reference_group]
    
    groups_metrics: List[GroupFairnessMetrics] = []
    ref_metric: Optional[GroupFairnessMetrics] = None
    
    for g in ordered_groups:
        mask = (prot_series == g).values
        g_metric = compute_group_metrics(y_true, y_pred, mask, str(g))
        if str(g) == reference_group:
            ref_metric = g_metric
        groups_metrics.append(g_metric)
        
    # If ref_metric is not found or has 0 samples
    if ref_metric is None or ref_metric.sample_count == 0:
        return AttributeFairnessAudit(
            attribute_name=attribute_name,
            bias_found=False,
            reference_group=reference_group,
            reference_reason=reference_reason,
            disadvantaged_group="N/A",
            advantaged_group="N/A",
            primary_comparison_group="N/A",
            groups=groups_metrics,
            passes_disparate_impact=False,
            passes_tpr_parity=False,
            passes_fpr_parity=False,
            thresholds_used={
                "disparate_impact_pass": settings.DISPARATE_IMPACT_LOWER,
                "tpr_fpr_gap_pass": settings.TPR_DIFF_TOLERANCE
            },
            severity_status="Insufficient Evidence",
            severity_rank=99,
            verdict="INSUFFICIENT EVIDENCE — Reference group has no valid samples in the evaluation split.",
            explanation=f"Reference group '{reference_group}' has no valid samples in the evaluation split."
        )
        
    # Calculate comparative metrics against reference group
    primary_comp_group = None
    min_di = float("inf")
    max_tpr_diff = 0.0
    max_fpr_diff = 0.0
    max_pred_diff = 0.0
    
    has_valid_comparison = False
    disadv_metric: Optional[GroupFairnessMetrics] = None
    
    for gm in groups_metrics:
        if gm.group_name == reference_group:
            continue
            
        if not gm.sample_size_valid:
            continue
            
        has_valid_comparison = True
        
        # Disparate Impact: PR_comp / PR_ref
        if ref_metric.predicted_positive_rate > 0:
            di_val = gm.predicted_positive_rate / ref_metric.predicted_positive_rate
            gm.disparate_impact = round(di_val, 4)
            if di_val < min_di:
                min_di = di_val
                primary_comp_group = gm.group_name
                disadv_metric = gm
        else:
            gm.disparate_impact = None
            gm.warning = (gm.warning or "") + " Reference group positive prediction rate is 0.0 (cannot divide by zero)."
            if disadv_metric is None:
                disadv_metric = gm
                primary_comp_group = gm.group_name

        # TPR difference: TPR_comp - TPR_ref
        if gm.tpr is not None and ref_metric.tpr is not None:
            tpr_diff = gm.tpr - ref_metric.tpr
            gm.tpr_difference = round(tpr_diff, 4)
            if abs(tpr_diff) > abs(max_tpr_diff):
                max_tpr_diff = tpr_diff

        # FPR difference: FPR_comp - FPR_ref
        if gm.fpr is not None and ref_metric.fpr is not None:
            fpr_diff = gm.fpr - ref_metric.fpr
            gm.fpr_difference = round(fpr_diff, 4)
            if abs(fpr_diff) > abs(max_fpr_diff):
                max_fpr_diff = fpr_diff
                
        # Prediction rate difference
        pred_diff = gm.predicted_positive_rate - ref_metric.predicted_positive_rate
        if abs(pred_diff) > abs(max_pred_diff):
            max_pred_diff = pred_diff

    # Default comparison group if none found with valid size
    if primary_comp_group is None:
        comp_candidates = [gm.group_name for gm in groups_metrics if gm.group_name != reference_group]
        primary_comp_group = comp_candidates[0] if comp_candidates else "None"
        disadv_metric = next((gm for gm in groups_metrics if gm.group_name == primary_comp_group), None)

    # Determine disadvantaged and advantaged groups
    disadvantaged_group = primary_comp_group
    # Find group with highest positive rate
    all_valid_groups = [gm for gm in groups_metrics if gm.sample_size_valid or gm.sample_count > 0]
    advantaged_group = max(all_valid_groups, key=lambda g: g.predicted_positive_rate).group_name if all_valid_groups else reference_group

    # Extract metrics for disadvantaged vs reference
    sel_rate_ref = ref_metric.predicted_positive_rate
    sel_rate_disadv = disadv_metric.predicted_positive_rate if disadv_metric else None
    tpr_ref = ref_metric.tpr
    tpr_disadv = disadv_metric.tpr if disadv_metric else None
    tpr_gap = round(tpr_disadv - tpr_ref, 4) if (tpr_disadv is not None and tpr_ref is not None) else None
    fpr_ref = ref_metric.fpr
    fpr_disadv = disadv_metric.fpr if disadv_metric else None
    fpr_gap = round(fpr_disadv - fpr_ref, 4) if (fpr_disadv is not None and fpr_ref is not None) else None

    # Evaluate criteria
    effective_di = min_di if min_di != float("inf") else (disadv_metric.disparate_impact if disadv_metric else None)
    
    passes_di = True
    if effective_di is not None:
        passes_di = (settings.DISPARATE_IMPACT_LOWER <= effective_di <= settings.DISPARATE_IMPACT_UPPER)
        
    passes_tpr = abs(max_tpr_diff) <= settings.TPR_DIFF_TOLERANCE
    passes_fpr = abs(max_fpr_diff) <= settings.FPR_DIFF_TOLERANCE
    
    thresholds_used = {
        "disparate_impact_pass": float(settings.DISPARATE_IMPACT_LOWER),
        "tpr_fpr_gap_pass": float(settings.TPR_DIFF_TOLERANCE)
    }

    if not has_valid_comparison:
        bias_found = False
        severity_status = "Insufficient Evidence"
        severity_rank = 90
        explanation = f"Insufficient sample size across comparison groups for '{attribute_name}' to draw reliable statistical fairness conclusions."
        verdict = f"INSUFFICIENT EVIDENCE — Subgroup sample sizes for '{attribute_name}' are below the {settings.MIN_GROUP_SAMPLE_SIZE} threshold."
    elif not passes_di or not passes_tpr:
        bias_found = True
        severity_status = "Potential Fairness Concern"
        severity_rank = 1  # Will be refined during multi-attribute ranking
        
        reasons = []
        if effective_di is not None and effective_di < settings.DISPARATE_IMPACT_LOWER:
            reasons.append(f"Disparate Impact ratio is {effective_di:.2f} (below the {settings.DISPARATE_IMPACT_LOWER:.2f} screening threshold) for group '{primary_comp_group}' compared to reference '{reference_group}'")
        if not passes_tpr:
            reasons.append(f"True Positive Rate difference is {max_tpr_diff:+.2f} (exceeds {settings.TPR_DIFF_TOLERANCE:.2f} parity tolerance)")
        if not passes_fpr:
            reasons.append(f"False Positive Rate difference is {max_fpr_diff:+.2f} (exceeds {settings.FPR_DIFF_TOLERANCE:.2f} parity tolerance)")
            
        explanation = f"FairLens detected a potential fairness concern across '{attribute_name}' groups. {'; '.join(reasons)}. Observations suggest the comparison group received positive outcomes at a significantly lower rate than the selected reference group."
        
        # Build dynamic verdict sentence from real numbers
        if effective_di is not None and effective_di < settings.DISPARATE_IMPACT_LOWER:
            ratio_phrase = format_ratio_phrase(sel_rate_disadv or 0.0, sel_rate_ref)
            verdict = (
                f"FAIL — disparate impact {effective_di:.2f} is below the {settings.DISPARATE_IMPACT_LOWER:.2f} threshold; "
                f"{disadvantaged_group} applicants are approved {ratio_phrase} the rate of {reference_group} applicants "
                f"({(sel_rate_disadv or 0.0):.1%} vs {sel_rate_ref:.1%}) for comparable profiles."
            )
        elif not passes_tpr and tpr_gap is not None:
            verdict = (
                f"FAIL — TPR gap {tpr_gap:+.1%} exceeds the ±{settings.TPR_DIFF_TOLERANCE:.0%} threshold; "
                f"qualified {disadvantaged_group} applicants are correctly identified at a lower rate ({tpr_disadv:.1%}) "
                f"than {reference_group} applicants ({tpr_ref:.1%})."
            )
        else:
            verdict = (
                f"FAIL — FPR gap {fpr_gap:+.1%} exceeds the ±{settings.FPR_DIFF_TOLERANCE:.0%} threshold; "
                f"{disadvantaged_group} applicants experience higher false positive rates than {reference_group} applicants."
            )
    else:
        bias_found = False
        severity_status = "Passes Screening Threshold"
        severity_rank = 50
        di_str = f"{effective_di:.2f}" if effective_di is not None else "1.00"
        explanation = f"No potential disparate-impact or parity concerns detected under selected screening thresholds for '{attribute_name}' (DI: {di_str} >= 0.80)."
        tpr_gap_str = f"{max_tpr_diff:+.1%}" if has_valid_comparison else "0.0%"
        fpr_gap_str = f"{max_fpr_diff:+.1%}" if has_valid_comparison else "0.0%"
        disadv_sel_str = f"{(sel_rate_disadv or 0.0):.1%}"
        ref_sel_str = f"{sel_rate_ref:.1%}"
        verdict = (
            f"PASS — disparate impact {di_str} satisfies the {settings.DISPARATE_IMPACT_LOWER:.2f} threshold; "
            f"{disadvantaged_group} applicants have a selection rate of {disadv_sel_str} compared to {ref_sel_str} for {reference_group}; "
            f"TPR gap ({tpr_gap_str}) and FPR gap ({fpr_gap_str}) are within ±{settings.TPR_DIFF_TOLERANCE:.0%} tolerance."
        )

    return AttributeFairnessAudit(
        attribute_name=attribute_name,
        bias_found=bias_found,
        reference_group=reference_group,
        reference_reason=reference_reason,
        disadvantaged_group=disadvantaged_group,
        advantaged_group=advantaged_group,
        primary_comparison_group=primary_comp_group,
        groups=groups_metrics,
        selection_rate_reference=round(sel_rate_ref, 4),
        selection_rate_disadvantaged=round(sel_rate_disadv, 4) if sel_rate_disadv is not None else None,
        disparate_impact=round(effective_di, 4) if effective_di is not None else None,
        tpr_reference=round(tpr_ref, 4) if tpr_ref is not None else None,
        tpr_disadvantaged=round(tpr_disadv, 4) if tpr_disadv is not None else None,
        tpr_difference=round(max_tpr_diff, 4) if has_valid_comparison else None,
        tpr_gap=tpr_gap,
        fpr_reference=round(fpr_ref, 4) if fpr_ref is not None else None,
        fpr_disadvantaged=round(fpr_disadv, 4) if fpr_disadv is not None else None,
        fpr_difference=round(max_fpr_diff, 4) if has_valid_comparison else None,
        fpr_gap=fpr_gap,
        prediction_rate_difference=round(max_pred_diff, 4) if has_valid_comparison else None,
        passes_disparate_impact=passes_di,
        passes_tpr_parity=passes_tpr,
        passes_fpr_parity=passes_fpr,
        thresholds_used=thresholds_used,
        severity_status=severity_status,
        severity_rank=severity_rank,
        verdict=verdict,
        explanation=explanation
    )

def audit_multi_attributes(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    prot_df: pd.DataFrame,
    reference_groups: Dict[str, str],
    reference_reasons: Optional[Dict[str, str]] = None
) -> FairnessAuditSummary:
    """Audits all credible protected attributes automatically, ranking findings by severity."""
    findings: List[AttributeFairnessAudit] = []
    
    for col in prot_df.columns:
        ref_group = reference_groups.get(col, str(prot_df[col].dropna().iloc[0]))
        ref_reason = (reference_reasons or {}).get(
            col, f"Largest sufficiently represented group in the dataset ({ref_group})"
        )
        audit_res = audit_single_attribute(
            y_true=y_true,
            y_pred=y_pred,
            prot_series=prot_df[col],
            attribute_name=col,
            reference_group=ref_group,
            reference_reason=ref_reason
        )
        findings.append(audit_res)
        
    # Sort and rank findings by severity:
    # 1. Potential Fairness Concern (sorted by lowest Disparate Impact)
    # 2. Passes Screening Threshold
    # 3. Insufficient Evidence
    def sort_key(f: AttributeFairnessAudit):
        if f.severity_status == "Potential Fairness Concern":
            di = f.disparate_impact if f.disparate_impact is not None else 0.80
            return (0, di)
        elif f.severity_status == "Passes Screening Threshold":
            return (1, -(f.disparate_impact or 1.0))
        else:
            return (2, 0)
            
    findings.sort(key=sort_key)
    
    # Assign sequential rank 1, 2, 3...
    for rank, f in enumerate(findings, start=1):
        f.severity_rank = rank
        
    # Determine overall status and summary counts
    bias_found = any(f.bias_found for f in findings)
    attributes_audited_count = len(findings)
    attributes_with_bias_count = sum(1 for f in findings if f.bias_found)
    all_insufficient = all(f.severity_status == "Insufficient Evidence" for f in findings) if findings else False
    
    if bias_found:
        overall_status = "Potential Fairness Concern"
        primary_issue = findings[0]
        primary_attr = primary_issue.attribute_name
        metric_name = "Disparate Impact" if not primary_issue.passes_disparate_impact else "Equal Opportunity (TPR)"
        metric_val_str = f"{primary_issue.disparate_impact:.2f}" if primary_issue.disparate_impact is not None else f"{primary_issue.tpr_difference:+.1%}"
        summary_exp = f"FairLens detected potential fairness concerns. Primary issue observed in '{primary_attr}' ({metric_name}: {metric_val_str})."
        headline_verdict = f"Bias found on {attributes_with_bias_count} of {attributes_audited_count} attributes ({primary_attr}: Disparate Impact {metric_val_str})"
    elif all_insufficient:
        overall_status = "Insufficient Evidence"
        primary_attr = None
        metric_name = None
        summary_exp = "Insufficient demographic sample sizes across evaluation partitions to draw reliable fairness conclusions."
        headline_verdict = f"Insufficient demographic sample sizes across all {attributes_audited_count} evaluated attributes."
    else:
        overall_status = "Passes Screening Threshold"
        primary_attr = None
        metric_name = None
        summary_exp = f"All {attributes_audited_count} evaluated protected attributes satisfied the configured fairness thresholds (Disparate Impact >= {settings.DISPARATE_IMPACT_LOWER:.2f}, TPR/FPR gap within ±{settings.TPR_DIFF_TOLERANCE:.0%})."
        headline_verdict = "No bias detected."
        
    return FairnessAuditSummary(
        overall_status=overall_status,
        bias_found=bias_found,
        attributes_audited_count=attributes_audited_count,
        attributes_with_bias_count=attributes_with_bias_count,
        headline_verdict=headline_verdict,
        primary_issue_attribute=primary_attr,
        primary_issue_metric=metric_name,
        summary_explanation=summary_exp,
        findings=findings
    )
