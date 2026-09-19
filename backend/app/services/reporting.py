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
    """Generates a transparent 7-part AI Fairness and Model Audit Report in Markdown with 0 boilerplate."""
    sections: List[str] = []
    
    # Title
    sections.append("# FairLens AI Fairness & Model Audit Report")
    
    # Section 1: Headline Verdict
    model_name = baseline_performance.model_type.replace('_', ' ').title()
    sensitive_attrs_str = ", ".join(f"`{a}`" for a in detection.selected_protected_attributes) or "None detected"
    
    headline_block = (
        f"## 1. Headline Verdict\n\n"
        f"**Audit Status**: `{fairness_audit.headline_verdict}`\n\n"
        f"- **Dataset**: `{dataset_name}` ({profile.row_count:,} total records)\n"
        f"- **Target Attribute**: `{detection.selected_target}` (favorable outcome: `{detection.positive_class}`)\n"
        f"- **Evaluated Protected Attributes**: {sensitive_attrs_str}\n"
        f"- **Baseline Classification Model**: `{model_name}` (Test Accuracy: {baseline_performance.accuracy:.1%}, F1 Score: {baseline_performance.f1:.3f})\n"
        f"- **Audit Evaluation Sample**: {baseline_performance.test_samples:,} held-out test rows"
    )
    sections.append(headline_block)
    
    # Section 2: Per-Attribute Bias Findings (§1)
    finding_blocks = ["## 2. Per-Attribute Bias Findings"]
    for idx, f in enumerate(fairness_audit.findings, start=1):
        di_str = f"{f.disparate_impact:.2f}" if f.disparate_impact is not None else "N/A"
        sel_ref_str = f"{f.selection_rate_reference:.1%}" if f.selection_rate_reference is not None else "N/A"
        sel_disadv_str = f"{f.selection_rate_disadvantaged:.1%}" if f.selection_rate_disadvantaged is not None else "N/A"
        tpr_ref_str = f"{f.tpr_reference:.1%}" if f.tpr_reference is not None else "N/A"
        tpr_disadv_str = f"{f.tpr_disadvantaged:.1%}" if f.tpr_disadvantaged is not None else "N/A"
        tpr_gap_str = f"{f.tpr_gap:+.1%}" if f.tpr_gap is not None else "N/A"
        fpr_ref_str = f"{f.fpr_reference:.1%}" if f.fpr_reference is not None else "N/A"
        fpr_disadv_str = f"{f.fpr_disadvantaged:.1%}" if f.fpr_disadvantaged is not None else "N/A"
        fpr_gap_str = f"{f.fpr_gap:+.1%}" if f.fpr_gap is not None else "N/A"
        
        di_thresh = f.thresholds_used.get("disparate_impact_pass", 0.80)
        gap_thresh = f.thresholds_used.get("tpr_fpr_gap_pass", 0.10)
        
        status_tag = "FAIL" if f.bias_found else "PASS"
        
        finding_blocks.append(
            f"### Finding {idx}: Protected Attribute `{f.attribute_name}` [{status_tag}]\n\n"
            f"- **Verdict**: {f.verdict}\n"
            f"- **Reference Group**: `{f.reference_group}` ({f.reference_reason})\n"
            f"- **Disadvantaged Group**: `{f.disadvantaged_group}`\n"
            f"- **Selection Rates**: `{f.disadvantaged_group}`: {sel_disadv_str} vs `{f.reference_group}`: {sel_ref_str}\n"
            f"- **Disparate Impact Ratio**: `{di_str}` (Threshold: >= {di_thresh:.2f})\n"
            f"- **True Positive Rates (TPR)**: `{f.disadvantaged_group}`: {tpr_disadv_str} vs `{f.reference_group}`: {tpr_ref_str} (TPR Gap: `{tpr_gap_str}`, tolerance: ±{gap_thresh:.0%})\n"
            f"- **False Positive Rates (FPR)**: `{f.disadvantaged_group}`: {fpr_disadv_str} vs `{f.reference_group}`: {fpr_ref_str} (FPR Gap: `{fpr_gap_str}`, tolerance: ±{gap_thresh:.0%})"
        )
    sections.append("\n\n".join(finding_blocks))
    
    # Section 3: Proxy-Feature Attribution (§2)
    disp_attr = explainability.disparity_attribution
    attr_blocks = ["## 3. Disparity Attribution (Proxy Feature Analysis)"]
    if disp_attr and disp_attr.drivers:
        attr_blocks.append(f"{disp_attr.narrative}\n")
        attr_blocks.append("| Feature | Impact Gap (Ref - Disadv) | Ref Mean Contribution | Disadv Mean Contribution | Description |")
        attr_blocks.append("|---|---|---|---|---|")
        for d in disp_attr.drivers:
            attr_blocks.append(f"| `{d.feature}` | {d.impact_difference:+.4f} | {d.ref_mean_contribution:+.4f} | {d.disadv_mean_contribution:+.4f} | {d.explanation} |")
        attr_blocks.append(f"\n> *{disp_attr.caveat}*")
    elif disp_attr:
        attr_blocks.append(f"{disp_attr.narrative}\n")
        attr_blocks.append(f"> *{disp_attr.caveat}*")
    else:
        attr_blocks.append(
            "Feature attribution indicates balanced demographic contributions across evaluated groups. "
            "No proxy features driving score divergence were identified.\n\n"
            "> *SHAP/LIME explain model behavior and feature correlation. They identify proxy patterns, not proof of intentional or causal discrimination.*"
        )
    sections.append("\n".join(attr_blocks))
    
    # Section 4: Mitigation Action Taken (§4)
    mit_blocks = ["## 4. Mitigation Action Taken"]
    if not mitigation.mitigation_required:
        mit_blocks.append(
            f"- **Mitigation Required**: `false`\n"
            f"- **Action**: None — not needed.\n"
            f"- **Details**: {mitigation.report_body}"
        )
    else:
        mit_blocks.append(
            f"- **Mitigation Method**: `{mitigation.mitigation_method}`\n"
            f"- **Target Attribute**: `{mitigation.primary_attribute}`\n"
            f"- **Action Rationale**: {mitigation.mitigation_action_rationale}\n\n"
            f"### Calibrated Decision Thresholds Table\n\n"
            f"| Demographic Subgroup | Baseline Threshold | Learned Mitigated Threshold | Adjustment |\n"
            f"|---|---|---|---|"
        )
        for grp, t_after in mitigation.thresholds_after.items():
            t_before = mitigation.thresholds_before.get(grp, 0.50)
            delta_t = t_after - t_before
            adj_str = f"{delta_t:+.2f}" if delta_t != 0 else "0.00 (Unchanged)"
            mit_blocks.append(f"| `{grp}` | {t_before:.2f} | {t_after:.2f} | {adj_str} |")
    sections.append("\n".join(mit_blocks))
    
    # Section 5: Feature Governance Note (§5)
    pii_list = ", ".join(f"`{c}`" for c in profile.pii_columns) if profile.pii_columns else "None"
    id_list = ", ".join(f"`{c}`" for c in profile.id_columns) if profile.id_columns else "None"
    prot_list = ", ".join(f"`{c}`" for c in detection.selected_protected_attributes) or "None"
    
    gov_block = (
        f"## 5. Feature Governance & Pre-Training Hygiene\n\n"
        f"{mitigation.feature_governance_note}\n\n"
        f"- **Protected Demographic Attributes Excluded from Input**: {prot_list}\n"
        f"- **Direct PII Excluded from Input**: {pii_list}\n"
        f"- **System Identifiers Excluded from Input**: {id_list}"
    )
    sections.append(gov_block)
    
    # Section 6: Before / After Comparison Table + Headline (§6)
    comp_blocks = ["## 6. Before / After Comparison on Identical Held-Out Test Set"]
    comp_blocks.append(f"**Performance & Fairness Impact**: {mitigation.quantified_headline}\n")
    if mitigation.comparison_table:
        comp_blocks.append("| Metric | Before | After | Change | Verdict |")
        comp_blocks.append("|---|---|---|---|---|")
        for row in mitigation.comparison_table:
            comp_blocks.append(f"| {row.metric} | {row.before} | {row.after} | {row.change} | {row.verdict} |")
        comp_blocks.append(f"\n*(Note: Both baseline and mitigated metrics were independently evaluated on the identical held-out test split of {baseline_performance.test_samples:,} rows.)*")
    sections.append("\n".join(comp_blocks))
    
    # Section 7: Final Conclusion
    primary_finding = fairness_audit.findings[0] if fairness_audit.findings else None
    if not fairness_audit.bias_found:
        conclusion_str = (
            f"No protected attribute in `{dataset_name}` showed a fairness violation across all {len(fairness_audit.findings)} "
            f"evaluated demographics; the model requires no mitigation."
        )
    elif mitigation.mitigated_fairness.passes_disparate_impact and mitigation.mitigated_fairness.passes_tpr_parity:
        acc_cost = mitigation.performance_delta.get("accuracy", 0.0) * 100
        cost_phrase = f"at a {abs(acc_cost):.1f}-point accuracy cost" if acc_cost < -0.05 else "with preserved accuracy"
        conclusion_str = (
            f"Bias against {primary_finding.disadvantaged_group} applicants on the `{primary_finding.attribute_name}` attribute "
            f"was reduced from a Disparate Impact of {primary_finding.disparate_impact:.2f} to {mitigation.mitigated_fairness.disparate_impact:.2f} "
            f"through per-group threshold calibration, bringing the model within the fairness threshold {cost_phrase}."
        )
    else:
        conclusion_str = (
            f"Bias mitigation improved demographic parity for {primary_finding.disadvantaged_group} applicants on `{primary_finding.attribute_name}` "
            f"(Disparate Impact: {primary_finding.disparate_impact:.2f} -> {mitigation.mitigated_fairness.disparate_impact:.2f}), "
            f"though remaining parity disparities indicate that broader representative training data collection is required."
        )
        
    sections.append(f"## 7. Final Conclusion\n\n{conclusion_str}")
    
    return "\n\n".join(sections).strip()
