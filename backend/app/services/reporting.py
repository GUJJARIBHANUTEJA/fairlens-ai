from typing import Any, Dict, List
from backend.app.schemas import (
    DatasetProfile,
    DetectionSummary,
    ExplainabilityResult,
    FairnessAuditSummary,
    MitigationResult,
    PerformanceMetrics
)

def generate_audit_report(
    dataset_name: str,
    profile: DatasetProfile,
    detection: DetectionSummary,
    baseline_performance: PerformanceMetrics,
    fairness_audit: FairnessAuditSummary,
    mitigation: MitigationResult,
    explainability: ExplainabilityResult
) -> str:
    """Generates a structured 10-section AI Fairness and Model Audit Report in Markdown."""
    sections: List[str] = []
    
    # Title
    sections.append("# FairLens AI Fairness & Model Audit Report")
    
    # Dataset information summary line
    dataset_info = (
        f"**Dataset**: `{dataset_name}` | "
        f"**Rows**: {profile.row_count:,} | "
        f"**Columns**: {profile.column_count} | "
        f"**Target**: `{detection.selected_target}` | "
        f"**Protected Attributes**: {', '.join(f'`{a}`' for a in detection.selected_protected_attributes) or 'None'}"
    )
    sections.append(dataset_info)
    
    # Executive Summary
    exec_summary = (
        f"## Executive Summary\n"
        f"**Fairness Status**: `{fairness_audit.overall_status}`\n\n"
        f"{fairness_audit.summary_explanation}"
    )
    sections.append(exec_summary)
    
    # 1. Dataset & Profiling
    p1 = (
        f"## 1. Dataset & Profiling\n"
        f"- **File**: `{dataset_name}`\n"
        f"- **Dimensions**: {profile.row_count:,} rows x {profile.column_count} columns\n"
        f"- **Missing Values**: {profile.missing_values_count:,}\n"
        f"- **Duplicate Rows**: {profile.duplicate_rows_count:,}\n"
        f"- **Excluded Columns (ID/PII/Constant)**: {len(profile.id_columns)} ID, {len(profile.pii_columns)} PII, {len(profile.constant_columns)} constant"
    )
    sections.append(p1)
    
    # 2. Prediction Target
    p2 = (
        f"## 2. Prediction Target\n"
        f"- **Selected Target**: `{detection.selected_target}`\n"
        f"- **Inference Confidence**: {detection.target_confidence:.1%}\n"
        f"- **Positive Outcome Class**: `{detection.positive_class}`"
    )
    sections.append(p2)
    
    # 3. Protected Attributes
    prot_attrs_str = ", ".join([f"`{p.column}` ({p.confidence:.1%} confidence)" for p in detection.protected_attribute_candidates]) or "None detected with high confidence"
    p3 = (
        f"## 3. Protected Attributes\n"
        f"- **Audited Demographic Attributes**: {prot_attrs_str}"
    )
    sections.append(p3)
    
    # 4. Groups & Reference Groups
    group_lines = []
    for p in detection.protected_attribute_candidates:
        groups_str = ", ".join([f"`{g}`" for g in p.detected_groups])
        group_lines.append(f"- **{p.column}**: {groups_str}\n  - **Reference Group**: `{p.recommended_reference_group}` ({p.reference_reason})")
    p4 = (
        f"## 4. Groups & Reference Groups\n"
        + ("\n".join(group_lines) if group_lines else "- No demographic subgroups identified.")
    )
    sections.append(p4)
    
    # 5. Baseline Model Performance
    p5 = (
        f"## 5. Baseline Model Performance\n"
        f"- **Model Architecture**: `{baseline_performance.model_type.replace('_', ' ').title()}`\n"
        f"- **Accuracy**: {baseline_performance.accuracy:.1%}\n"
        f"- **F1-Score**: {baseline_performance.f1:.3f}\n"
        f"- **Precision**: {baseline_performance.precision:.3f}\n"
        f"- **Recall**: {baseline_performance.recall:.3f}\n"
        f"- **Positive Prediction Rate**: {baseline_performance.positive_prediction_rate:.1%}\n"
        f"- **Evaluation Sample Size**: {baseline_performance.test_samples:,} rows"
    )
    sections.append(p5)
    
    # 6. Fairness Audit
    if fairness_audit.primary_issue_attribute:
        primary_finding = next((f for f in fairness_audit.findings if f.attribute_name == fairness_audit.primary_issue_attribute), None)
        di_val = f"{primary_finding.disparate_impact:.2f}" if (primary_finding and primary_finding.disparate_impact is not None) else "N/A"
        tpr_val = f"{primary_finding.tpr_difference:+.1%}" if (primary_finding and primary_finding.tpr_difference is not None) else "N/A"
        triggering_str = f"Observed disparity in `{fairness_audit.primary_issue_attribute}` driven by {fairness_audit.primary_issue_metric or 'Disparate Impact'} (Disparate Impact: {di_val}, TPR Difference: {tpr_val})."
    else:
        triggering_str = "All evaluated demographic groups satisfied the 80% rule (0.80 <= Disparate Impact <= 1.25) and parity thresholds."
        
    p6 = (
        f"## 6. Fairness Audit\n"
        f"- **Audit Status**: `{fairness_audit.overall_status}`\n"
        f"- **Assessment**: {triggering_str}"
    )
    sections.append(p6)
    
    # 7. Mitigation
    mit_method_title = mitigation.mitigation_method.replace('_', ' ').title() if mitigation.mitigation_method else "Post-Processing"
    p7 = (
        f"## 7. Mitigation\n"
        f"- **Method**: `{mit_method_title}`\n"
        f"- **Status**: `{mitigation.mitigation_status}`"
    )
    if mitigation.mitigation_applied and mitigation.learned_thresholds:
        thresh_items = ", ".join([f"`{k}`: {v:.2f}" for k, v in mitigation.learned_thresholds.items()])
        p7 += f"\n- **Learned Decision Thresholds**: {thresh_items}"
    sections.append(p7)
    
    # 8. Before vs After
    base_acc = baseline_performance.accuracy
    base_f1 = baseline_performance.f1
    mit_acc = mitigation.mitigated_performance.accuracy
    mit_f1 = mitigation.mitigated_performance.f1
    acc_delta_pts = (mit_acc - base_acc) * 100
    
    if mitigation.mitigation_applied:
        base_di = mitigation.baseline_fairness.disparate_impact
        mit_di = mitigation.mitigated_fairness.disparate_impact
        base_tpr = mitigation.baseline_fairness.tpr_difference
        mit_tpr = mitigation.mitigated_fairness.tpr_difference
        
        base_di_str = f"{base_di:.2f}" if base_di is not None else "N/A"
        mit_di_str = f"{mit_di:.2f}" if mit_di is not None else "N/A"
        base_tpr_str = f"{base_tpr:+.1%}" if base_tpr is not None else "N/A"
        mit_tpr_str = f"{mit_tpr:+.1%}" if mit_tpr is not None else "N/A"
        
        tradeoff_points = f"{acc_delta_pts:+.1f} percentage points"
        if abs(acc_delta_pts) < 0.05:
            tradeoff_summary = "Fairness improved while model accuracy was fully maintained."
        else:
            tradeoff_summary = f"Fairness improved while model accuracy changed by {tradeoff_points}."
            
        p8 = (
            f"## 8. Before vs After\n"
            f"### Baseline Model\n"
            f"- Accuracy: {base_acc:.1%}\n"
            f"- F1: {base_f1:.3f}\n"
            f"- Disparate Impact: {base_di_str}\n"
            f"- TPR Difference: {base_tpr_str}\n\n"
            f"### Mitigated Model\n"
            f"- Accuracy: {mit_acc:.1%}\n"
            f"- F1: {mit_f1:.3f}\n"
            f"- Disparate Impact: {mit_di_str}\n"
            f"- TPR Difference: {mit_tpr_str}\n\n"
            f"**Interpretation**: {tradeoff_summary}"
        )
    else:
        p8 = (
            f"## 8. Before vs After\n"
            f"**Interpretation**: Baseline already satisfies the selected fairness criterion. No mitigation required."
        )
    sections.append(p8)
    
    # 9. Explainability
    feat_lines = [f"- `{f.feature}`: {f.importance:.1%} global impact" for f in explainability.global_importance[:5]]
    p9 = (
        f"## 9. Explainability\n"
        f"**Top Predictive Features**:\n"
        + ("\n".join(feat_lines) if feat_lines else "- No features evaluated.")
        + "\n\n*Notice: Feature attribution indicates statistical predictive association utilized by the model, not causal proof of discrimination.*"
    )
    sections.append(p9)
    
    # 10. Final Conclusion
    is_concern = fairness_audit.overall_status == "Potential Fairness Concern"
    if not is_concern:
        conclusion_text = "Baseline already satisfies the selected fairness criterion. No mitigation required."
    elif mitigation.mitigation_applied and (mitigation.mitigated_fairness.severity_status == "Passes Screening Threshold" or mitigation.mitigation_status == "Fairness improved"):
        conclusion_text = "Potential fairness concern detected in the baseline model. Mitigation improved the selected fairness metrics."
    else:
        conclusion_text = "Potential fairness concern remains after mitigation. Further review is recommended."
        
    p10 = (
        f"## 10. Final Conclusion\n"
        f"**Conclusion**: {conclusion_text}\n\n"
        f"- Observed demographic disparity serves as an auditing signal to guide model governance, not automatic proof of algorithmic bias.\n"
        f"- Post-processing mitigation aligns group decision outcomes while transparently acknowledging minor performance trade-offs."
    )
    sections.append(p10)
    
    return "\n\n".join(sections).strip()
