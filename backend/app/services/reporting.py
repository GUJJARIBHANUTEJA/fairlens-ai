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
    """Generates a comprehensive 13-point AI Fairness and Model Audit Report in Markdown."""
    
    # 1. Dataset Analyzed
    p1 = f"**Dataset Analyzed**: `{dataset_name}` ({profile.row_count:,} rows, {profile.column_count} columns). Missing values: {profile.missing_values_count}, Duplicate rows: {profile.duplicate_rows_count}."
    
    # 2. Likely Prediction Target
    p2 = f"**Likely Prediction Target**: `{detection.selected_target}` (Confidence: {detection.target_confidence:.1%}, Positive Class: `{detection.positive_class}`)."
    
    # 3. Protected Attributes Detected
    prot_attrs_str = ", ".join([f"`{p.column}` (Confidence: {p.confidence:.1%})" for p in detection.protected_attribute_candidates]) or "None detected with high confidence"
    p3 = f"**Protected Attributes Detected**: {prot_attrs_str}."
    
    # 4. Groups Found
    group_lines = []
    for p in detection.protected_attribute_candidates:
        groups_str = ", ".join([f"`{g}`" for g in p.detected_groups])
        group_lines.append(f"- **{p.column}**: {groups_str} (Reference Group: `{p.recommended_reference_group}` — {p.reference_reason})")
    p4 = "**Demographic Groups & Reference Baselines**:\n" + ("\n".join(group_lines) if group_lines else "No demographic groups detected.")
    
    # 5. Fairness Issues Detected
    p5 = f"**Fairness Status**: `{fairness_audit.overall_status}`.\n{fairness_audit.summary_explanation}"
    
    # 6. Triggering Metric
    if fairness_audit.primary_issue_attribute:
        primary_finding = next((f for f in fairness_audit.findings if f.attribute_name == fairness_audit.primary_issue_attribute), None)
        di_val = f"{primary_finding.disparate_impact:.2f}" if (primary_finding and primary_finding.disparate_impact is not None) else "N/A"
        tpr_val = f"{primary_finding.tpr_difference:+.2f}" if (primary_finding and primary_finding.tpr_difference is not None) else "N/A"
        p6 = f"**Triggering Metric**: Observed disparity in `{fairness_audit.primary_issue_attribute}` driven by {fairness_audit.primary_issue_metric or 'Disparate Impact'} (Disparate Impact: {di_val}, TPR Difference: {tpr_val})."
    else:
        p6 = "**Triggering Metric**: None. All evaluated groups met the 80% rule (0.80 <= Disparate Impact <= 1.25) and parity thresholds."
        
    # 7. Baseline Performance
    p7 = (
        f"**Baseline Model Performance** (`{baseline_performance.model_type}`):\n"
        f"- Accuracy: {baseline_performance.accuracy:.1%}\n"
        f"- F1-Score: {baseline_performance.f1:.3f}\n"
        f"- Precision: {baseline_performance.precision:.3f}\n"
        f"- Recall: {baseline_performance.recall:.3f}\n"
        f"- Positive Prediction Rate: {baseline_performance.positive_prediction_rate:.1%}\n"
        f"- Test Sample Size: {baseline_performance.test_samples:,}"
    )
    
    # 8. Mitigation Applied
    p8 = f"**Mitigation Applied**: `{mitigation.mitigation_method}` (Status: `{mitigation.mitigation_status}`)."
    if mitigation.mitigation_applied and mitigation.learned_thresholds:
        thresh_items = ", ".join([f"`{k}`: {v:.2f}" for k, v in mitigation.learned_thresholds.items()])
        p8 += f"\nLearned decision thresholds: {thresh_items}."
        
    # 9. Fairness Change
    if mitigation.mitigation_applied:
        base_di = mitigation.baseline_fairness.disparate_impact
        mit_di = mitigation.mitigated_fairness.disparate_impact
        di_str = f"Disparate Impact changed from {base_di:.2f} to {mit_di:.2f} ({mitigation.fairness_delta.get('disparate_impact', 0.0):+.2f})" if base_di and mit_di else "DI delta recorded."
        p9 = f"**Fairness Change**:\n- {di_str}\n- Mitigated Status: `{mitigation.mitigated_fairness.severity_status}`."
    else:
        p9 = "**Fairness Change**: No mitigation was required as baseline already satisfied criteria."
        
    # 10. Performance Change
    if mitigation.mitigation_applied:
        p10 = (
            f"**Performance Trade-off**:\n"
            f"- Accuracy: {mitigation.baseline_performance.accuracy:.1%} → {mitigation.mitigated_performance.accuracy:.1%} ({mitigation.performance_delta.get('accuracy', 0.0):+.1%})\n"
            f"- F1-Score: {mitigation.baseline_performance.f1:.3f} → {mitigation.mitigated_performance.f1:.3f} ({mitigation.performance_delta.get('f1', 0.0):+.3f})\n"
            f"- Summary: {mitigation.trade_off_summary}"
        )
    else:
        p10 = "**Performance Change**: Baseline performance maintained without alteration."
        
    # 11. Top Influencing Features
    feat_lines = [f"{i}. `{f.feature}` ({f.importance:.1%})" for i, f in enumerate(explainability.global_importance[:5], start=1)]
    p11 = "**Top Model Features Influencing Predictions**:\n" + ("\n".join(feat_lines) if feat_lines else "None evaluated.")
    
    # 12. SHAP & LIME Findings
    p12 = (
        "**Explainability (SHAP & LIME)**:\n"
        "Model behavior explanations indicate global and local feature contributions towards outcome probabilities. "
        "Notice: SHAP and LIME reflect predictive correlations utilized by the mathematical model, not causal proof of discrimination."
    )
    
    # 13. Limitations & Disclaimers
    p13 = (
        "**Auditing Limitations & Regulatory Context**:\n"
        "- Observed statistical disparity across demographic groups is an auditing signal, not definitive legal proof of discrimination.\n"
        "- Mitigation via threshold post-processing balances group outcome rates on observed historical distributions; it does not eliminate root socio-economic biases in data collection.\n"
        "- Proxy features (e.g. geographical location or education) may encode latent demographic correlations and require domain expert review."
    )
    
    report_md = f"""# FairLens AI Fairness & Model Audit Report

## Executive Summary
{p5}

---

## 1. Dataset & Profiling
{p1}

## 2. Prediction Target
{p2}

## 3. Protected Demographic Attributes
{p3}

## 4. Subgroup Categories & Reference Baselines
{p4}

## 5. Fairness Audit Findings
{p5}

## 6. Triggering Fairness Metric
{p6}

## 7. Baseline Model Performance
{p7}

## 8. Applied Bias Mitigation
{p8}

## 9. Fairness Outcomes (Before vs After)
{p9}

## 10. Performance Impact & Trade-offs
{p10}

## 11. Feature Attribution Ranking
{p11}

## 12. Model Explainability (SHAP & LIME)
{p12}

## 13. Audit Scope & Methodological Limitations
{p13}

---
*Report generated automatically by FairLens AI Fairness Auditing System.*
"""
    return report_md.strip()
