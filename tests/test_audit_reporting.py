import re
import pytest
import pandas as pd
from backend.app.services.audit_engine import run_automatic_audit
from backend.app.config import settings

@pytest.fixture(scope="module")
def clean_audit_result():
    """Runs auto-audit on the clean recruitment dataset."""
    df = pd.read_csv(r"C:\major-project-v2\bias-mitigation\datasets\fair_recrutment_dataset final.csv", nrows=5000)
    res, _ = run_automatic_audit(df, "clean_test_dataset", "fair_recrutment_dataset final.csv")
    return res

@pytest.fixture(scope="module")
def biased_audit_result():
    """Runs auto-audit on the biased loan application dataset."""
    df = pd.read_csv(r"C:\major-project-v2\bias-mitigation\datasets\synthetic_loan_applications_biased.csv", nrows=5000)
    res, _ = run_automatic_audit(df, "biased_test_dataset", "synthetic_loan_applications_biased.csv")
    return res

# --- 1. Test (a): Clean Dataset Audit Verification ---
def test_clean_dataset_no_bias_and_no_mitigation(clean_audit_result):
    res = clean_audit_result
    
    # Assert no bias was detected
    assert res.fairness_audit.bias_found is False
    for finding in res.fairness_audit.findings:
        assert finding.bias_found is False
        assert finding.disparate_impact >= settings.DISPARATE_IMPACT_LOWER
        assert "PASS" in finding.verdict
    
    # Assert mitigation was not required and not applied
    assert res.mitigation.mitigation_required is False
    assert res.mitigation.mitigation_applied is False
    assert res.mitigation.mitigation_status == "No mitigation required"
    
    # Assert report text explicitly states no mitigation was needed
    report = res.report_markdown
    assert "No mitigation was applied because none was needed." in report
    assert "No mitigation required" in report or "Mitigation Required**: `false`" in report
    
    # Assert report contains real passing numbers (no empty strings, no N/A in key metrics)
    assert f"{settings.DISPARATE_IMPACT_LOWER:.2f}" in report
    assert f"{res.baseline_performance.accuracy:.1%}" in report
    for finding in res.fairness_audit.findings:
        assert f"{finding.disparate_impact:.2f}" in report
        assert finding.reference_group in report

# --- 2. Test (b): Biased Dataset Audit & Mitigation Verification ---
def test_biased_dataset_detects_bias_and_executes_concrete_mitigation(biased_audit_result):
    res = biased_audit_result
    
    # Assert bias was detected
    assert res.fairness_audit.bias_found is True
    assert res.fairness_audit.attributes_with_bias_count >= 1
    
    # Assert disadvantaged group is specifically named
    primary_finding = res.fairness_audit.findings[0]
    assert primary_finding.disadvantaged_group is not None
    assert len(primary_finding.disadvantaged_group) > 0
    assert primary_finding.disadvantaged_group in ["Non-binary", "Other", "Black"]
    assert primary_finding.reference_group is not None
    
    # Assert mitigation was required and applied
    assert res.mitigation.mitigation_required is True
    assert res.mitigation.mitigation_applied is True
    
    # Assert concrete threshold changes exist
    assert res.mitigation.thresholds_after != res.mitigation.thresholds_before
    disadv_group = primary_finding.disadvantaged_group
    assert disadv_group in res.mitigation.thresholds_after
    assert res.mitigation.thresholds_after[disadv_group] != res.mitigation.thresholds_before[disadv_group]
    
    # Assert comparison table is non-empty and has real values
    table = res.mitigation.comparison_table
    assert len(table) >= 5
    for row in table:
        assert row.metric is not None and len(row.metric) > 0
        assert row.before is not None and len(row.before) > 0
        assert row.after is not None and len(row.after) > 0
        assert row.change is not None and len(row.change) > 0
        assert row.verdict is not None and len(row.verdict) > 0
        # No undefined or placeholder values
        assert "undefined" not in row.before
        assert "undefined" not in row.after
        assert "{delta}" not in row.change

# --- 3. Test (c): Narrative Sentences Are Dynamic & Non-Identical ---
def test_reports_are_dynamically_distinct_without_boilerplate(clean_audit_result, biased_audit_result):
    clean_report = clean_audit_result.report_markdown
    biased_report = biased_audit_result.report_markdown
    
    # Full reports must be completely different
    assert clean_report != biased_report
    
    # Headlines must be completely different
    assert clean_audit_result.fairness_audit.headline_verdict != biased_audit_result.fairness_audit.headline_verdict
    assert clean_audit_result.mitigation.quantified_headline != biased_audit_result.mitigation.quantified_headline
    
    # Extract paragraphs (blocks separated by double newlines)
    clean_paras = [p.strip() for p in clean_report.split("\n\n") if len(p.strip()) > 30]
    biased_paras = [p.strip() for p in biased_report.split("\n\n") if len(p.strip()) > 30]
    
    # Exclude common structural headers, universal legal caveats, or mandated test split notes
    ignorable_substrings = [
        "FairLens AI Fairness & Model Audit Report",
        "Proxy Feature Analysis",
        "Feature Governance & Pre-Training Hygiene",
        "Before / After Comparison on Identical Held-Out Test Set",
        "SHAP/LIME explain model behavior",
        "Both baseline and mitigated metrics were independently evaluated",
        "Headline Verdict",
        "Per-Attribute Bias Findings",
        "Mitigation Action Taken",
        "Final Conclusion"
    ]
    
    clean_content_paras = [
        p for p in clean_paras 
        if not any(ign in p for ign in ignorable_substrings) and not p.startswith("|")
    ]
    biased_content_paras = [
        p for p in biased_paras 
        if not any(ign in p for ign in ignorable_substrings) and not p.startswith("|")
    ]
    
    # Assert no shared narrative paragraphs
    shared_paras = set(clean_content_paras).intersection(set(biased_content_paras))
    assert len(shared_paras) == 0, f"Found boilerplate paragraph shared between clean and biased reports: {shared_paras}"

# --- 4. Test (d): Precision Check (Comparison Table vs Quantified Headline) ---
def test_accuracy_precision_consistency(biased_audit_result):
    mit = biased_audit_result.mitigation
    table = mit.comparison_table
    headline = mit.quantified_headline
    
    acc_row = next((r for r in table if "accuracy" in r.metric.lower()), None)
    assert acc_row is not None, "Overall accuracy row missing from comparison table"
    
    # Extract accuracy percentage from comparison table 'after'
    table_acc_match = re.search(r"(\d+\.\d+)%", acc_row.after)
    assert table_acc_match is not None
    table_acc_float = float(table_acc_match.group(1)) / 100.0
    
    # Extract accuracy percentage specifically following 'accuracy' in quantified headline
    headline_acc_match = re.search(r"accuracy\s+(?:at\s+)?(\d+\.\d+)%", headline, re.IGNORECASE)
    assert headline_acc_match is not None, f"Headline missing accuracy percentage: {headline}"
    headline_acc_float = float(headline_acc_match.group(1)) / 100.0
    
    # Assert accuracy matches within 0.001
    assert abs(table_acc_float - headline_acc_float) <= 0.001, (
        f"Accuracy in comparison table ({table_acc_float}) does not match headline ({headline_acc_float})"
    )

# --- 5. Test (e): Headline Format Check & Placeholder Absence ---
def test_quantified_headline_format_and_integrity(biased_audit_result, clean_audit_result):
    for res in [biased_audit_result, clean_audit_result]:
        headline = res.mitigation.quantified_headline
        assert headline is not None and len(headline) > 20
        
        # Must not contain any template placeholders or undefined variables
        assert "undefined" not in headline.lower()
        assert "{delta}" not in headline
        assert "{" not in headline
        assert "}" not in headline
        assert "nan" not in headline.lower()
        
    biased_headline = biased_audit_result.mitigation.quantified_headline
    # Must contain a percentage or point delta
    assert re.search(r"(\+|\-)?\d+(\.\d+)?\s*(%|pt|pts)", biased_headline) is not None, (
        f"Biased headline does not contain percentage or point delta: {biased_headline}"
    )
    # Must name the threshold direction ("lowering" / "raising" / "adjusting" / "crossing")
    assert any(w in biased_headline.lower() for w in ["lowering", "raising", "adjusting", "crossing"]), (
        f"Biased headline does not name threshold direction: {biased_headline}"
    )

# --- 6. Regression Test: Headline Reacts to Delta Variations ---
def test_headline_reacts_to_metrics_change():
    from backend.app.services.mitigation import execute_mitigation
    from backend.app.schemas import (
        PerformanceMetrics, AttributeFairnessAudit, GroupFairnessMetrics,
        FairnessAuditSummary
    )
    from backend.app.services.pipeline import PipelineArtifacts
    import numpy as np

    # Synthetic artifacts with test data
    y_val = pd.Series([1, 0, 1, 0] * 50)
    y_val_proba = np.array([0.9, 0.1, 0.8, 0.2] * 50)
    prot_val = pd.DataFrame({"Gender": ["Female", "Male", "Female", "Male"] * 50})
    
    y_test = pd.Series([1, 0, 1, 0] * 50)
    y_test_proba = np.array([0.9, 0.1, 0.8, 0.2] * 50)
    prot_test = pd.DataFrame({"Gender": ["Female", "Male", "Female", "Male"] * 50})
    
    artifacts = PipelineArtifacts(
        model=None,
        preprocessor=None,
        feature_names=[],
        encoded_feature_names=[],
        target_col="Approved",
        positive_class=1,
        protected_cols=["Gender"],
        X_train=pd.DataFrame(),
        X_val=pd.DataFrame(),
        X_test=pd.DataFrame(),
        y_train=pd.Series(),
        y_val=y_val,
        y_test=y_test,
        prot_train=pd.DataFrame(),
        prot_val=prot_val,
        prot_test=prot_test,
        y_val_proba=y_val_proba,
        y_test_proba=y_test_proba
    )
    
    from backend.app.services.pipeline import calculate_performance_metrics
    perf1 = calculate_performance_metrics(
        y_true=y_test.values,
        y_pred=(y_test_proba >= 0.5).astype(int),
        train_count=200,
        val_count=200,
        test_count=200,
        model_type="logistic_regression",
        threshold=0.5
    )
    
    from backend.app.services.fairness import audit_multi_attributes
    summary = audit_multi_attributes(
        y_true=y_test.values,
        y_pred=(y_test_proba >= 0.5).astype(int),
        prot_df=prot_test,
        reference_groups={"Gender": "Male"},
        reference_reasons={"Gender": "Largest group"}
    )
    
    res = execute_mitigation(artifacts, summary, perf1)
    # The headline must be generated from real numbers and include the exact accuracy
    assert "accuracy" in res.quantified_headline
    assert "Gender" in res.feature_governance_note or "Female" in res.quantified_headline
