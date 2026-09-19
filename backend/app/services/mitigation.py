from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.config import settings
from backend.app.schemas import (
    AttributeFairnessAudit,
    ComparisonMetricRow,
    FairnessAuditSummary,
    MitigationResult,
    PerformanceMetrics
)
from backend.app.services.fairness import audit_single_attribute
from backend.app.services.pipeline import PipelineArtifacts, calculate_performance_metrics

def optimize_thresholds_on_validation(
    y_val: np.ndarray,
    y_val_proba: np.ndarray,
    prot_val: pd.Series,
    ref_group: str,
    baseline_val_f1: float
) -> Dict[str, float]:
    """Learns group-specific decision thresholds using the validation split to balance fairness and accuracy."""
    unique_groups = [str(g) for g in prot_val.unique()]
    learned_thresholds: Dict[str, float] = {g: 0.50 for g in unique_groups}
    
    # Calculate baseline validation rate for reference group
    ref_mask = (prot_val == ref_group).values
    if np.sum(ref_mask) == 0:
        return learned_thresholds
        
    ref_proba = y_val_proba[ref_mask]
    ref_pred_default = (ref_proba >= 0.50).astype(int)
    ref_pos_rate = float(np.mean(ref_pred_default == 1))
    
    # Candidate thresholds grid
    candidate_thresholds = np.round(np.linspace(0.20, 0.70, 26), 2)
    
    for grp in unique_groups:
        if grp == ref_group:
            continue
            
        grp_mask = (prot_val == grp).values
        n_grp = np.sum(grp_mask)
        if n_grp < settings.MIN_GROUP_SAMPLE_SIZE:
            learned_thresholds[grp] = 0.50
            continue
            
        grp_y_true = y_val[grp_mask]
        grp_proba = y_val_proba[grp_mask]
        
        best_thresh = 0.50
        best_objective = -float("inf")
        
        for t in candidate_thresholds:
            t_val = float(t)
            grp_pred = (grp_proba >= t_val).astype(int)
            grp_pos_rate = float(np.mean(grp_pred == 1))
            
            # Disparate Impact approximation
            if ref_pos_rate > 0:
                di = grp_pos_rate / ref_pos_rate
            else:
                di = 1.0
                
            # Compute subgroup F1
            tp = np.sum((grp_y_true == 1) & (grp_pred == 1))
            fp = np.sum((grp_y_true == 0) & (grp_pred == 1))
            fn = np.sum((grp_y_true == 1) & (grp_pred == 0))
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
            
            # Penalize DI deviation from target 1.0 (rewarding DI >= 0.80)
            fairness_score = -abs(min(di, 1.20) - 1.0)
            if 0.80 <= di <= 1.25:
                fairness_score += 0.50
                
            # Objective: prioritize getting DI into [0.80, 1.25] with minimal F1 degradation
            f1_penalty = (baseline_val_f1 - f1) if (baseline_val_f1 - f1) > 0 else 0
            objective = fairness_score - (f1_penalty * 1.5)
            
            if objective > best_objective:
                best_objective = objective
                best_thresh = t_val
                
        learned_thresholds[grp] = round(best_thresh, 2)
        
    return learned_thresholds

def apply_group_thresholds(
    proba: np.ndarray,
    prot_series: pd.Series,
    thresholds: Dict[str, float]
) -> np.ndarray:
    """Applies learned group-specific thresholds to generate binary classifications."""
    preds = np.zeros(len(proba), dtype=int)
    for i in range(len(proba)):
        grp = str(prot_series.iloc[i])
        t = thresholds.get(grp, 0.50)
        preds[i] = 1 if proba[i] >= t else 0
    return preds

def execute_mitigation(
    artifacts: PipelineArtifacts,
    fairness_summary: FairnessAuditSummary,
    baseline_metrics: PerformanceMetrics
) -> MitigationResult:
    """Executes automatic mitigation decision, optimization, and before/after evaluation on unseen test set."""
    # Check if baseline already passes fairness criteria
    if not fairness_summary.bias_found:
        primary_attr = fairness_summary.findings[0].attribute_name if fairness_summary.findings else "None"
        base_finding = fairness_summary.findings[0] if fairness_summary.findings else None
        
        attrs_detail = "; ".join(
            f"'{f.attribute_name}' (DI: {f.disparate_impact:.2f}, TPR gap: {f.tpr_difference:+.1%})"
            for f in fairness_summary.findings if f.disparate_impact is not None
        ) or f"'{primary_attr}'"
        
        report_head = "No bias detected."
        report_txt = (
            f"All {len(fairness_summary.findings)} protected attributes tested ({attrs_detail}) "
            f"satisfied the configured fairness thresholds (Disparate Impact >= {settings.DISPARATE_IMPACT_LOWER:.2f}, "
            f"TPR/FPR gap within ±{settings.TPR_DIFF_TOLERANCE:.0%}), "
            f"with baseline accuracy at {baseline_metrics.accuracy:.1%}. "
            f"No mitigation was applied because none was needed."
        )
        
        groups_list = base_finding.groups if base_finding else []
        uniform_thresholds = {str(g.group_name): 0.50 for g in groups_list}
        
        base_di_val = f"{base_finding.disparate_impact:.2f}" if (base_finding and base_finding.disparate_impact is not None) else "1.00"
        base_tpr_val = f"{base_finding.tpr_difference:+.1%}" if (base_finding and base_finding.tpr_difference is not None) else "0.0%"
        base_fpr_val = f"{base_finding.fpr_difference:+.1%}" if (base_finding and base_finding.fpr_difference is not None) else "0.0%"
        
        clean_comparison_table = [
            ComparisonMetricRow(metric="Disparate Impact", before=base_di_val, after=base_di_val, change="0.00", verdict="PASS"),
            ComparisonMetricRow(metric="TPR gap", before=base_tpr_val, after=base_tpr_val, change="0.0 pts", verdict="PASS"),
            ComparisonMetricRow(metric="FPR gap", before=base_fpr_val, after=base_fpr_val, change="0.0 pts", verdict="PASS"),
            ComparisonMetricRow(metric="Overall accuracy", before=f"{baseline_metrics.accuracy:.1%}", after=f"{baseline_metrics.accuracy:.1%}", change="0.0 pt", verdict="preserved"),
            ComparisonMetricRow(metric="F1 score", before=f"{baseline_metrics.f1:.3f}", after=f"{baseline_metrics.f1:.3f}", change="0.000", verdict="preserved"),
        ]
        
        feat_gov_note = (
            f"`{primary_attr}` was excluded from the model's input features (used only to audit outcomes, not to predict them). "
            f"The baseline model satisfied all fairness thresholds without requiring post-processing intervention."
        )
        
        return MitigationResult(
            mitigation_required=False,
            mitigation_applied=False,
            mitigation_method="None (Baseline Satisfies Criteria)",
            mitigation_status="No mitigation required",
            primary_attribute=primary_attr,
            thresholds_before=uniform_thresholds,
            thresholds_after=uniform_thresholds,
            learned_thresholds=uniform_thresholds,
            mitigation_action_rationale="No threshold adjustments were required as all evaluated demographic groups met fairness parity criteria.",
            baseline_performance=baseline_metrics,
            mitigated_performance=baseline_metrics,
            baseline_fairness=base_finding or AttributeFairnessAudit(
                attribute_name="None", reference_group="N/A", reference_reason="N/A",
                primary_comparison_group="N/A", groups=[], passes_disparate_impact=True,
                passes_tpr_parity=True, passes_fpr_parity=True, severity_status="Passes Screening Threshold",
                severity_rank=1, explanation="No mitigation required."
            ),
            mitigated_fairness=base_finding or AttributeFairnessAudit(
                attribute_name="None", reference_group="N/A", reference_reason="N/A",
                primary_comparison_group="N/A", groups=[], passes_disparate_impact=True,
                passes_tpr_parity=True, passes_fpr_parity=True, severity_status="Passes Screening Threshold",
                severity_rank=1, explanation="No mitigation required."
            ),
            performance_delta={"accuracy": 0.0, "f1": 0.0, "precision": 0.0, "recall": 0.0},
            fairness_delta={"disparate_impact": 0.0, "tpr_difference": 0.0, "fpr_difference": 0.0},
            comparison_table=clean_comparison_table,
            quantified_headline=report_txt,
            feature_governance_note=feat_gov_note,
            report_headline=report_head,
            report_body=report_txt,
            trade_off_summary=report_txt,
            interpretation="The baseline model demonstrated equitable treatment across demographic subgroups within statistical tolerance."
        )

    # If fairness concern detected, identify primary attribute
    primary_finding = fairness_summary.findings[0]
    primary_attr = primary_finding.attribute_name
    ref_group = primary_finding.reference_group
    disadv_group = primary_finding.disadvantaged_group or primary_finding.primary_comparison_group
    
    # Compute baseline validation F1
    val_pred_baseline = (artifacts.y_val_proba >= 0.50).astype(int)
    from sklearn.metrics import f1_score
    baseline_val_f1 = float(f1_score(artifacts.y_val.values, val_pred_baseline, zero_division=0))
    
    # Optimize group thresholds on validation set
    prot_val_series = artifacts.prot_val[primary_attr].astype(str)
    learned_thresholds = optimize_thresholds_on_validation(
        y_val=artifacts.y_val.values,
        y_val_proba=artifacts.y_val_proba,
        prot_val=prot_val_series,
        ref_group=ref_group,
        baseline_val_f1=baseline_val_f1
    )
    
    # Apply learned thresholds to UNSEEN TEST SET
    prot_test_series = artifacts.prot_test[primary_attr].astype(str)
    y_test_mitigated_pred = apply_group_thresholds(
        proba=artifacts.y_test_proba,
        prot_series=prot_test_series,
        thresholds=learned_thresholds
    )
    
    # Calculate Mitigated Performance on test set
    mitigated_performance = calculate_performance_metrics(
        y_true=artifacts.y_test.values,
        y_pred=y_test_mitigated_pred,
        train_count=len(artifacts.X_train),
        val_count=len(artifacts.X_val),
        test_count=len(artifacts.X_test),
        model_type=baseline_metrics.model_type,
        threshold=0.50
    )
    
    # Calculate Mitigated Fairness on test set
    mitigated_fairness = audit_single_attribute(
        y_true=artifacts.y_test.values,
        y_pred=y_test_mitigated_pred,
        prot_series=prot_test_series,
        attribute_name=primary_attr,
        reference_group=ref_group,
        reference_reason=primary_finding.reference_reason
    )
    
    # Calculate Deltas
    base_di = primary_finding.disparate_impact or 0.0
    mit_di = mitigated_fairness.disparate_impact or 0.0
    di_delta = mit_di - base_di
    
    base_tpr_diff = primary_finding.tpr_difference if primary_finding.tpr_difference is not None else 0.0
    mit_tpr_diff = mitigated_fairness.tpr_difference if mitigated_fairness.tpr_difference is not None else 0.0
    tpr_delta = mit_tpr_diff - base_tpr_diff
    
    base_fpr_diff = primary_finding.fpr_difference if primary_finding.fpr_difference is not None else 0.0
    mit_fpr_diff = mitigated_fairness.fpr_difference if mitigated_fairness.fpr_difference is not None else 0.0
    fpr_delta = mit_fpr_diff - base_fpr_diff
    
    acc_delta = mitigated_performance.accuracy - baseline_metrics.accuracy
    f1_delta = mitigated_performance.f1 - baseline_metrics.f1
    acc_delta_pts = acc_delta * 100
    
    perf_delta_dict = {
        "accuracy": round(acc_delta, 4),
        "f1": round(f1_delta, 4),
        "precision": round(mitigated_performance.precision - baseline_metrics.precision, 4),
        "recall": round(mitigated_performance.recall - baseline_metrics.recall, 4)
    }
    
    fair_delta_dict = {
        "disparate_impact": round(di_delta, 4),
        "tpr_difference": round(tpr_delta, 4),
        "fpr_difference": round(fpr_delta, 4)
    }
    
    # Distance to acceptable DI range [0.80, 1.25]
    def di_distance(val: Optional[float]) -> float:
        if val is None:
            return 1.0
        if 0.80 <= val <= 1.25:
            return 0.0
        if val < 0.80:
            return 0.80 - val
        return val - 1.25
        
    base_dist = di_distance(primary_finding.disparate_impact)
    mit_dist = di_distance(mitigated_fairness.disparate_impact)
    
    di_crossed = mitigated_fairness.passes_disparate_impact and not primary_finding.passes_disparate_impact
    di_improved = (mit_dist < base_dist) or di_crossed
    tpr_crossed = mitigated_fairness.passes_tpr_parity and not primary_finding.passes_tpr_parity
    tpr_improved = (abs(mit_tpr_diff) < abs(base_tpr_diff)) or tpr_crossed
    
    fairness_improved = di_improved or tpr_improved or (mitigated_fairness.passes_disparate_impact and mitigated_fairness.passes_tpr_parity)
    
    # Section 4: Record concrete thresholds
    thresholds_before = {str(g.group_name): 0.50 for g in primary_finding.groups}
    thresholds_after = learned_thresholds
    disadv_thresh = learned_thresholds.get(disadv_group, 0.50)
    
    if disadv_thresh < 0.50:
        mitigation_action_rationale = (
            f"Lowering the decision threshold for the {disadv_group} group from 0.50 to {disadv_thresh:.2f} "
            f"raises their approval rate to close the measured selection-rate gap, "
            f"without changing how the model scores any applicant."
        )
    elif disadv_thresh > 0.50:
        mitigation_action_rationale = (
            f"Adjusting the decision threshold for the {disadv_group} group from 0.50 to {disadv_thresh:.2f} "
            f"calibrates approval rates toward demographic parity, "
            f"without changing how the model scores any applicant."
        )
    else:
        mitigation_action_rationale = (
            f"Calibrated decision thresholds for all '{primary_attr}' groups on validation data "
            f"to align outcome selection rates on unseen test evaluations."
        )
        
    # Section 5: Feature governance note
    feature_governance_note = (
        f"`{primary_attr}` was excluded from the model's input features (used only to audit outcomes, not to predict them). "
        f"This alone did not eliminate bias, because other features can still correlate with this attribute — see §2. "
        f"The actual fix applied was per-group threshold calibration (§4)."
    )
    
    # Section 6: Comparison table
    # Row 1: DI
    if di_crossed:
        di_verdict = "FAIL -> PASS"
    elif di_improved and not mitigated_fairness.passes_disparate_impact:
        di_verdict = "FAIL -> FAIL (improved)"
    elif di_improved:
        di_verdict = "improved"
    elif not mitigated_fairness.passes_disparate_impact:
        di_verdict = "FAIL"
    else:
        di_verdict = "PASS"
        
    # Row 2: TPR gap
    tpr_gap_pts = (abs(base_tpr_diff) - abs(mit_tpr_diff)) * 100
    if tpr_crossed:
        tpr_verdict = "FAIL -> PASS"
    elif tpr_improved:
        tpr_verdict = "improved"
    else:
        tpr_verdict = "maintained"
    tpr_change_str = f"closed by {tpr_gap_pts:.1f} pts" if tpr_gap_pts > 0 else f"widened by {abs(tpr_gap_pts):.1f} pts"
    
    # Row 3: FPR gap
    fpr_gap_pts = (abs(base_fpr_diff) - abs(mit_fpr_diff)) * 100
    fpr_verdict = "improved" if fpr_gap_pts > 0 else "maintained"
    fpr_change_str = f"closed by {fpr_gap_pts:.1f} pts" if fpr_gap_pts > 0 else f"widened by {abs(fpr_gap_pts):.1f} pts"
    
    # Row 4: Accuracy
    if abs(acc_delta) <= settings.ACCURACY_PRESERVED_TOLERANCE:
        acc_verdict = "preserved"
    elif acc_delta > settings.ACCURACY_PRESERVED_TOLERANCE:
        acc_verdict = "improved"
    elif acc_delta >= -0.05:
        acc_verdict = "minor trade-off"
    else:
        acc_verdict = "significant trade-off"
    acc_change_str = f"{acc_delta_pts:+.1f} pt"
    
    # Row 5: F1
    if f1_delta > 0.005:
        f1_verdict = "improved"
    elif abs(f1_delta) <= 0.005:
        f1_verdict = "preserved"
    else:
        f1_verdict = "trade-off"
    f1_change_str = f"{f1_delta:+.3f}"
    
    comparison_table = [
        ComparisonMetricRow(
            metric=f"Disparate Impact ({disadv_group} vs {ref_group})",
            before=f"{base_di:.2f}",
            after=f"{mit_di:.2f}",
            change=f"{di_delta:+.2f}",
            verdict=di_verdict
        ),
        ComparisonMetricRow(
            metric="TPR gap",
            before=f"{base_tpr_diff:+.1%}",
            after=f"{mit_tpr_diff:+.1%}",
            change=tpr_change_str,
            verdict=tpr_verdict
        ),
        ComparisonMetricRow(
            metric="FPR gap",
            before=f"{base_fpr_diff:+.1%}",
            after=f"{mit_fpr_diff:+.1%}",
            change=fpr_change_str,
            verdict=fpr_verdict
        ),
        ComparisonMetricRow(
            metric="Overall accuracy",
            before=f"{baseline_metrics.accuracy:.1%}",
            after=f"{mitigated_performance.accuracy:.1%}",
            change=acc_change_str,
            verdict=acc_verdict
        ),
        ComparisonMetricRow(
            metric="F1 score",
            before=f"{baseline_metrics.f1:.3f}",
            after=f"{mitigated_performance.f1:.3f}",
            change=f1_change_str,
            verdict=f1_verdict
        ),
    ]
    
    # Synthesize quantified headline
    if abs(acc_delta) <= settings.ACCURACY_PRESERVED_TOLERANCE:
        acc_phrase = f"while preserving overall accuracy at {mitigated_performance.accuracy:.1%} ({acc_delta_pts:+.1f} pt)"
    elif acc_delta < 0:
        acc_phrase = f"at a cost of {abs(acc_delta_pts):.1f} accuracy points ({baseline_metrics.accuracy:.1%} -> {mitigated_performance.accuracy:.1%})"
    else:
        acc_phrase = f"while increasing accuracy by {acc_delta_pts:+.1f} points ({baseline_metrics.accuracy:.1%} -> {mitigated_performance.accuracy:.1%})"
        
    tpr_close_phrase = f"closed the TPR gap from {base_tpr_diff:+.1%} to {mit_tpr_diff:+.1%}"
    thresh_dir = "lowering" if disadv_thresh < 0.50 else "raising" if disadv_thresh > 0.50 else "adjusting"
    thresh_dir_phrase = f"by {thresh_dir} the decision threshold for {disadv_group} to {disadv_thresh:.2f}"
    
    if mitigated_fairness.passes_disparate_impact and mitigated_fairness.passes_tpr_parity:
        mitigation_status = "Fairness improved"
        quantified_headline = (
            f"Mitigation improved Disparate Impact from {base_di:.2f} to {mit_di:.2f} "
            f"(crossing the {settings.DISPARATE_IMPACT_LOWER:.2f} fairness threshold {thresh_dir_phrase}) "
            f"and {tpr_close_phrase}, {acc_phrase}."
        )
    elif di_crossed:
        mitigation_status = "Fairness improved"
        quantified_headline = (
            f"Mitigation improved Disparate Impact from {base_di:.2f} to {mit_di:.2f} "
            f"(crossing the {settings.DISPARATE_IMPACT_LOWER:.2f} threshold {thresh_dir_phrase}), "
            f"though TPR gap remains at {mit_tpr_diff:+.1%}, {acc_phrase}."
        )
    elif di_improved or tpr_improved:
        mitigation_status = "Fairness improved"
        if abs(base_tpr_diff) > abs(mit_tpr_diff) and not mitigated_fairness.passes_tpr_parity:
            quantified_headline = (
                f"Mitigation reduced the TPR gap from {base_tpr_diff:+.1%} to {mit_tpr_diff:+.1%} {thresh_dir_phrase}, "
                f"but this remains outside the ±{settings.TPR_DIFF_TOLERANCE:.0%} threshold, {acc_phrase} — fairness concern remains after mitigation."
            )
        else:
            quantified_headline = (
                f"Mitigation improved Disparate Impact from {base_di:.2f} to {mit_di:.2f} {thresh_dir_phrase}, "
                f"but this remains outside the [{settings.DISPARATE_IMPACT_LOWER:.2f}, {settings.DISPARATE_IMPACT_UPPER:.2f}] threshold, {acc_phrase} — fairness concern remains after mitigation."
            )
    elif abs(base_dist - mit_dist) < 0.02:
        mitigation_status = "Fairness maintained"
        quantified_headline = f"Mitigation maintained baseline fairness levels (DI: {mit_di:.2f}) {thresh_dir_phrase} without significant disparity reduction, {acc_phrase}."
    else:
        mitigation_status = "No acceptable mitigation found"
        quantified_headline = f"Post-processing threshold adjustment could not achieve acceptable fairness parity on unseen test data without compromising utility, {acc_phrase}."
        
    trade_off_str = (
        f"Disparate impact changed from {base_di:.2f} to {mit_di:.2f} ({di_delta:+.2f}) and TPR difference from {base_tpr_diff:+.1%} to {mit_tpr_diff:+.1%}. "
        f"Overall test accuracy changed by {acc_delta_pts:+.1f} percentage points ({baseline_metrics.accuracy:.1%} -> {mitigated_performance.accuracy:.1%}) "
        f"and F1 by {f1_delta:+.3f} ({baseline_metrics.f1:.3f} -> {mitigated_performance.f1:.3f})."
    )
    
    return MitigationResult(
        mitigation_required=True,
        mitigation_applied=True,
        mitigation_method="per-group decision threshold calibration (learned on validation set)",
        mitigation_status=mitigation_status,
        primary_attribute=primary_attr,
        thresholds_before=thresholds_before,
        thresholds_after=thresholds_after,
        learned_thresholds=learned_thresholds,
        mitigation_action_rationale=mitigation_action_rationale,
        baseline_performance=baseline_metrics,
        mitigated_performance=mitigated_performance,
        baseline_fairness=primary_finding,
        mitigated_fairness=mitigated_fairness,
        performance_delta=perf_delta_dict,
        fairness_delta=fair_delta_dict,
        comparison_table=comparison_table,
        quantified_headline=quantified_headline,
        feature_governance_note=feature_governance_note,
        report_headline=quantified_headline,
        report_body=trade_off_str,
        trade_off_summary=trade_off_str,
        interpretation=quantified_headline
    )
