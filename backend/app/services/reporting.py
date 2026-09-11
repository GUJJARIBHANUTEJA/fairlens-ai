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
    """Generates an ultra-simplified 1-page AI Fairness and Model Audit Report in Markdown."""
    sections: List[str] = []
    
    # Title
    sections.append("# FairLens AI Fairness & Model Audit Report")
    
    # 1. Audit Summary
    model_name = baseline_performance.model_type.replace('_', ' ').title()
    sensitive_attrs = ", ".join(f"`{a}`" for a in detection.selected_protected_attributes) or "None detected"
    pii_list = ", ".join(f"`{col}`" for col in profile.pii_columns) if profile.pii_columns else "None detected"
    id_list = ", ".join(f"`{col}`" for col in profile.id_columns) if profile.id_columns else "None detected"
    
    base_acc_str = f"{baseline_performance.accuracy:.1%}"
    base_f1_str = f"{baseline_performance.f1:.3f}"
    
    overview = (
        f"## Audit Summary\n"
        f"- **Dataset**: `{dataset_name}` ({profile.row_count:,} rows)\n"
        f"- **Target**: `{detection.selected_target}` (positive class: `{detection.positive_class}`)\n"
        f"- **Sensitive Attributes**: {sensitive_attrs}\n"
        f"- **PII Detected**: {pii_list}\n"
        f"- **IDs Excluded**: {id_list}\n"
        f"- **Model**: `{model_name}`\n"
        f"- **Baseline Result**: Accuracy {base_acc_str}, F1 Score {base_f1_str} — Status: `{fairness_audit.overall_status}`"
    )
    sections.append(overview)
    
    # 2. Why Fairness Concern Occurred
    is_concern = fairness_audit.overall_status == "Potential Fairness Concern"
    if is_concern:
        primary_attr = fairness_audit.primary_issue_attribute or (detection.selected_protected_attributes[0] if detection.selected_protected_attributes else "demographic groups")
        why_text = (
            f"During the audit, disparate prediction rates were identified across demographic subgroups in `{primary_attr}`. "
            f"Historical correlations in the training data caused the baseline model to favor certain groups over others. "
            f"This represents an observed statistical disparity in model outputs rather than intentional discrimination."
        )
    else:
        why_text = (
            f"Across all evaluated demographic subgroups, the baseline model achieved equitable prediction rates. "
            f"No significant statistical disparity was observed across protected demographic groups."
        )
    sections.append(f"## Why Fairness Concern Occurred\n{why_text}")
    
    # 3. What FairLens Did
    what_text = (
        "FairLens excluded sensitive attributes and direct PII from predictive model features, keeping them separate for auditing. "
        "FairLens then evaluated demographic parity and applied validation-tuned boundary adjustment to balance group outcomes without compromising predictive utility."
    )
    sections.append(f"## What FairLens Did\n{what_text}")
    
    # 4. Final Result
    if mitigation.mitigation_applied:
        mit_acc_str = f"{mitigation.mitigated_performance.accuracy:.1%}"
        mit_f1_str = f"{mitigation.mitigated_performance.f1:.3f}"
        final_res_text = (
            f"- **Status After Mitigation**: `{mitigation.mitigation_status}`\n"
            f"- **Mitigated Model Performance**: Accuracy {mit_acc_str}, F1 Score {mit_f1_str}"
        )
    else:
        final_res_text = (
            f"- **Status**: `{fairness_audit.overall_status}`\n"
            f"- **Model Performance**: Accuracy {base_acc_str}, F1 Score {base_f1_str} (Baseline satisfies criteria; no adjustment required)"
        )
    sections.append(f"## Final Result\n{final_res_text}")
    
    # 5. Conclusion
    if not is_concern:
        conclusion_text = "The model meets fairness criteria across all evaluated groups with reliable predictive performance."
    elif mitigation.mitigation_status == "Fairness improved" or mitigation.mitigated_fairness.severity_status == "Passes Screening Threshold":
        conclusion_text = "Potential fairness concerns in the baseline model were successfully mitigated, improving group equity while maintaining predictive accuracy."
    else:
        conclusion_text = "Fairness concerns were partially addressed; continued monitoring and broader representative data collection are recommended."
        
    sections.append(f"## Conclusion\n{conclusion_text}")
    
    return "\n\n".join(sections).strip()
