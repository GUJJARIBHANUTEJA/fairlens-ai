from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.config import settings
from backend.app.schemas import (
    AttributeFairnessAudit,
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
    # Check if baseline passes
    if fairness_summary.overall_status == "Passes Screening Threshold":
        # No mitigation required
        primary_attr = fairness_summary.findings[0].attribute_name if fairness_summary.findings else "None"
        base_finding = fairness_summary.findings[0] if fairness_summary.findings else None
        
        return MitigationResult(
            mitigation_applied=False,
            mitigation_method="None (Baseline Satisfies Criteria)",
            mitigation_status="No mitigation required",
            primary_attribute=primary_attr,
            learned_thresholds={str(g.group_name): 0.50 for g in (base_finding.groups if base_finding else [])},
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
            trade_off_summary="Baseline model already satisfied the selected fairness criteria (DI >= 0.80). No mitigation was necessary.",
            interpretation="The baseline model demonstrated equitable treatment across demographic subgroups within statistical tolerance."
        )

    # If fairness concern detected, identify primary attribute
    primary_finding = fairness_summary.findings[0]
    primary_attr = primary_finding.attribute_name
    ref_group = primary_finding.reference_group
    
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
    
    acc_delta = mitigated_performance.accuracy - baseline_metrics.accuracy
    f1_delta = mitigated_performance.f1 - baseline_metrics.f1
    
    perf_delta_dict = {
        "accuracy": round(acc_delta, 4),
        "f1": round(f1_delta, 4),
        "precision": round(mitigated_performance.precision - baseline_metrics.precision, 4),
        "recall": round(mitigated_performance.recall - baseline_metrics.recall, 4)
    }
    
    fair_delta_dict = {
        "disparate_impact": round(di_delta, 4),
        "tpr_difference": round(tpr_delta, 4),
        "fpr_difference": round(abs(mitigated_fairness.fpr_difference or 0.0) - abs(primary_finding.fpr_difference or 0.0), 4)
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
    
    di_improved = (mit_dist < base_dist) or (mitigated_fairness.passes_disparate_impact and not primary_finding.passes_disparate_impact)
    tpr_improved = (abs(mit_tpr_diff) < abs(base_tpr_diff)) or (mitigated_fairness.passes_tpr_parity and not primary_finding.passes_tpr_parity)
    
    fairness_improved = di_improved or tpr_improved or (mitigated_fairness.passes_disparate_impact and mitigated_fairness.passes_tpr_parity)
    acc_delta_pts = acc_delta * 100
    
    if fairness_improved:
        mitigation_status = "Fairness improved"
        trade_off_str = (
            f"Disparate impact changed from {base_di:.2f} to {mit_di:.2f} ({di_delta:+.2f}) and TPR difference from {base_tpr_diff:+.1%} to {mit_tpr_diff:+.1%}. "
            f"Overall test accuracy changed by {acc_delta_pts:+.1f} percentage points ({baseline_metrics.accuracy:.1%} → {mitigated_performance.accuracy:.1%}) and F1 by {f1_delta:+.3f} ({baseline_metrics.f1:.3f} → {mitigated_performance.f1:.3f})."
        )
        if abs(acc_delta_pts) < 0.05:
            tradeoff_note = "Model accuracy was fully maintained."
        else:
            tradeoff_note = f"Fairness improved with an observed {acc_delta_pts:+.1f} percentage-point accuracy trade-off."
        interpretation_str = (
            f"Threshold optimization successfully adjusted decision boundaries for '{primary_attr}' groups. {tradeoff_note}"
        )
    elif abs(base_dist - mit_dist) < 0.02 and abs(abs(mit_tpr_diff) - abs(base_tpr_diff)) < 0.02:
        mitigation_status = "Fairness maintained"
        trade_off_str = f"Mitigation maintained baseline fairness levels (DI: {mit_di:.2f}) without significant disparity reduction."
        interpretation_str = "Group thresholds maintained parity without substantial shift on unseen test data."
    else:
        mitigation_status = "No acceptable mitigation found"
        trade_off_str = f"Post-processing threshold adjustment could not achieve acceptable fairness parity on unseen test data without compromising utility."
        interpretation_str = "Alternative in-processing mitigation or data collection strategies may be required."
        
    return MitigationResult(
        mitigation_applied=True,
        mitigation_method="Threshold Optimization (Validation-Tuned Post-Processing)",
        mitigation_status=mitigation_status,
        primary_attribute=primary_attr,
        learned_thresholds=learned_thresholds,
        baseline_performance=baseline_metrics,
        mitigated_performance=mitigated_performance,
        baseline_fairness=primary_finding,
        mitigated_fairness=mitigated_fairness,
        performance_delta=perf_delta_dict,
        fairness_delta=fair_delta_dict,
        trade_off_summary=trade_off_str,
        interpretation=interpretation_str
    )
