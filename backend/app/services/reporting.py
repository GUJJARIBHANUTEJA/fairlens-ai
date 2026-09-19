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
    """Generates an ultra-clean 1-page synthesis report matching section-by-section requirements."""
    sections: List[str] = []
    
    # Document Title
    sections.append("# FairLens AI Fairness & Model Audit Report")
    
    # 1. Headline Verdict — one line: dataset name, rows, target, model, overall bias status
    model_name = baseline_performance.model_type.replace('_', ' ').title()
    sections.append(
        f"## 1. Headline Verdict\n\n"
        f"Dataset: `{dataset_name}` ({profile.row_count:,} rows) | "
        f"Target: `{detection.selected_target}` | "
        f"Model: `{model_name}` (Accuracy: {baseline_performance.accuracy:.1%}) | "
        f"Status: **{fairness_audit.headline_verdict}**"
    )
    
    # 2. What We Found — for each attribute, at most two lines: group named + one metric that failed + magnitude
    findings_lines: List[str] = []
    for f in fairness_audit.findings:
        di_thresh = f.thresholds_used.get("disparate_impact_pass", 0.80)
        ref_grp = f.reference_group
        disadv_grp = f.disadvantaged_group or f.primary_comparison_group
        di_val = f.disparate_impact if f.disparate_impact is not None else 0.0
        
        if f.bias_found:
            if not f.passes_disparate_impact:
                line = (
                    f"- `{f.attribute_name}`: {disadv_grp} applicants approved at {di_val:.2f}x the rate of "
                    f"{ref_grp} applicants (Disparate Impact {di_val:.2f}, fails {di_thresh:.2f} threshold)."
                )
            elif not f.passes_tpr_parity:
                gap_thresh = f.thresholds_used.get("tpr_fpr_gap_pass", 0.10)
                tpr_gap = f.tpr_gap if f.tpr_gap is not None else (f.tpr_difference or 0.0)
                if abs(tpr_gap) > gap_thresh:
                    line = (
                        f"- `{f.attribute_name}`: True positive rate gap of {tpr_gap:+.1%} between {disadv_grp} "
                        f"and {ref_grp} exceeds ±{gap_thresh:.0%} threshold (Disparate Impact {di_val:.2f})."
                    )
                else:
                    max_diff = abs(f.tpr_difference or 0.0)
                    line = (
                        f"- `{f.attribute_name}`: Subgroup True positive rate disparity of {max_diff:.1%} "
                        f"across groups exceeds ±{gap_thresh:.0%} threshold (Disparate Impact {di_val:.2f})."
                    )
            else:
                line = f"- `{f.attribute_name}`: {f.verdict}"
        else:
            line = (
                f"- `{f.attribute_name}`: Group outcomes satisfy fairness criteria across {ref_grp} and comparison groups "
                f"(Disparate Impact {di_val:.2f}, passes {di_thresh:.2f} threshold)."
            )
        findings_lines.append(line)
    sections.append("## 2. What We Found\n\n" + "\n".join(findings_lines))
    
    # 3. Likely Contributing Features — top 1-2 proxy features only, one line each, plus causal caveat
    disp_attr = explainability.disparity_attribution
    feature_lines: List[str] = []
    if disp_attr and disp_attr.drivers:
        d1 = disp_attr.drivers[0]
        if len(disp_attr.drivers) >= 2:
            d2 = disp_attr.drivers[1]
            feature_lines.append(
                f"`{d1.feature}` shows the largest disparity in contribution between groups ({d1.impact_difference:+.2f} gap), "
                f"followed by `{d2.feature}` ({d2.impact_difference:+.2f} gap)."
            )
        else:
            feature_lines.append(
                f"`{d1.feature}` shows the largest disparity in contribution between groups ({d1.impact_difference:+.2f} gap)."
            )
        feature_lines.append(f"\n> *{disp_attr.caveat}*")
    else:
        feature_lines.append(
            "Feature attribution indicates balanced demographic contributions across evaluated groups. "
            "No proxy features driving score divergence were identified."
        )
        feature_lines.append(
            "\n> *SHAP/LIME explain model behavior and feature correlation. "
            "They identify proxy patterns, not proof of intentional or causal discrimination.*"
        )
    sections.append("## 3. Likely Contributing Features\n\n" + "\n".join(feature_lines))
    
    # 4. What FairLens Did — one paragraph: method used, actual threshold values changed, or no mitigation
    if not mitigation.mitigation_required:
        did_text = "No mitigation was applied because none was needed. Baseline already passed all configured fairness thresholds -- No mitigation required."
    else:
        primary_finding = fairness_audit.findings[0] if fairness_audit.findings else None
        attr = mitigation.primary_attribute or (primary_finding.attribute_name if primary_finding else "demographics")
        disadv_grp = primary_finding.disadvantaged_group if primary_finding else "disadvantaged"
        ref_grp = primary_finding.reference_group if primary_finding else "reference"
        t_after = mitigation.thresholds_after.get(disadv_grp, 0.50)
        t_before = mitigation.thresholds_before.get(disadv_grp, 0.50)
        shift = t_after - t_before
        shift_str = f"{shift:+.2f}" if shift != 0 else "0.00"
        ref_after = mitigation.thresholds_after.get(ref_grp, 0.50)
        did_text = (
            f"Applied {mitigation.mitigation_method}. "
            f"For `{attr}`, calibrated the decision threshold for {disadv_grp} from {t_before:.2f} to {t_after:.2f} ({shift_str} shift) "
            f"while maintaining `{ref_grp}` at {ref_after:.2f}, aligning approval rates toward parity on unseen test evaluations."
        )
    sections.append(f"## 4. What FairLens Did\n\n{did_text}")
    
    # 5. Before / After — one compact table, trimmed to Disparate Impact, TPR gap (if relevant), Accuracy, F1 (and FPR gap only if failed)
    table_lines: List[str] = [
        "| Metric | Before | After | Change | Verdict |",
        "|---|---|---|---|---|"
    ]
    # Check if FPR gap actually failed in baseline
    fpr_failed = False
    if mitigation.baseline_fairness and not mitigation.baseline_fairness.passes_fpr_parity:
        fpr_failed = True
        
    for row in mitigation.comparison_table:
        m_lower = row.metric.lower()
        is_di = "disparate impact" in m_lower
        is_tpr = "tpr gap" in m_lower
        is_fpr = "fpr gap" in m_lower
        is_acc = "accuracy" in m_lower
        is_f1 = "f1" in m_lower
        
        # Include DI, TPR, Accuracy, F1, and FPR only if it failed
        if is_di or is_tpr or is_acc or is_f1 or (is_fpr and fpr_failed):
            metric_label = "Disparate Impact" if is_di else row.metric
            table_lines.append(f"| {metric_label} | {row.before} | {row.after} | {row.change} | {row.verdict} |")
            
    sections.append("## 5. Before / After\n\n" + "\n".join(table_lines))
    
    # 6. Feature Governance — one line, not a column dump
    pii_count = len(profile.pii_columns)
    id_count = len(profile.id_columns)
    gov_line = (
        f"{pii_count} PII column{'s' if pii_count != 1 else ''} and {id_count} ID column{'s' if id_count != 1 else ''} "
        f"were excluded from model features; protected attributes were excluded from prediction and used only for auditing."
    )
    sections.append(f"## 6. Feature Governance\n\n{gov_line}")
    
    # 7. Conclusion — 1-2 sentences generated from structured status
    primary_finding = fairness_audit.findings[0] if fairness_audit.findings else None
    if not fairness_audit.bias_found:
        conclusion_str = (
            f"No protected attribute in `{dataset_name}` showed a fairness violation across all {len(fairness_audit.findings)} "
            f"evaluated demographics; the model satisfies fairness criteria with high utility and requires no mitigation."
        )
    elif mitigation.mitigated_fairness.passes_disparate_impact and mitigation.mitigated_fairness.passes_tpr_parity:
        acc_cost = mitigation.performance_delta.get("accuracy", 0.0) * 100
        cost_phrase = f"at a {abs(acc_cost):.1f}-point accuracy cost" if acc_cost < -0.05 else "with preserved accuracy"
        conclusion_str = (
            f"Bias against {primary_finding.disadvantaged_group} applicants on `{primary_finding.attribute_name}` was successfully mitigated from "
            f"Disparate Impact {primary_finding.disparate_impact:.2f} to {mitigation.mitigated_fairness.disparate_impact:.2f} "
            f"through threshold calibration, bringing the model within the 0.80 threshold {cost_phrase}."
        )
    else:
        conclusion_str = (
            f"Bias mitigation improved Disparate Impact from {primary_finding.disparate_impact:.2f} to {mitigation.mitigated_fairness.disparate_impact:.2f} "
            f"for {primary_finding.disadvantaged_group} applicants, though remaining disparities suggest broader representative training data collection is needed."
        )
    sections.append(f"## 7. Conclusion\n\n{conclusion_str}")
    
    return "\n\n".join(sections).strip()
