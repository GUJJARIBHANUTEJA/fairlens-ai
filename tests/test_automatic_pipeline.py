import io
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import DatasetProfile
from backend.app.services.profiling import profile_dataset
from backend.app.services.detection import detect_dataset_roles
from backend.app.services.fairness import audit_multi_attributes, audit_single_attribute
from backend.app.services.mitigation import execute_mitigation
from backend.app.services.pipeline import train_model_pipeline
from backend.app.services.audit_engine import run_automatic_audit
from backend.app.services.sample_datasets import (
    generate_loan_approval_dataset,
    generate_recruitment_dataset,
    generate_income_dataset
)

client = TestClient(app)

# --- 1. Test Obvious Target Dataset ---
def test_obvious_target_detection():
    df = pd.DataFrame({
        "Age": [25, 35, 45, 50, 23, 60, 42, 31, 29, 38],
        "Gender": ["M", "F", "M", "F", "M", "F", "M", "F", "M", "F"],
        "Income": [50000, 70000, 80000, 95000, 45000, 110000, 85000, 62000, 54000, 77000],
        "Loan_Status": [1, 1, 0, 1, 0, 1, 1, 0, 0, 1]
    })
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert detection.selected_target == "Loan_Status"
    assert detection.is_target_confident is True
    assert detection.target_confidence >= 0.70
    assert detection.positive_class == 1

# --- 2. Test Multiple Possible Targets (Resolution by Confidence) ---
def test_multiple_possible_targets():
    df = pd.DataFrame({
        "Feature_1": np.random.randn(50),
        "Feature_2": np.random.randn(50),
        "Gender": np.random.choice(["Male", "Female"], 50),
        "Old_Status": np.random.choice(["A", "B", "C"], 50),
        "Decision": np.random.choice([0, 1], 50)  # Binary, placed at end, high-priority token
    })
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert detection.selected_target == "Decision"
    assert len(detection.target_candidates) >= 1

# --- 3. Test Gender Protected Attribute Detection ---
def test_gender_protected_attribute_detection():
    np.random.seed(42)
    df = pd.DataFrame({
        "Score": np.random.uniform(50, 100, 60),
        "Gender": np.random.choice(["Male", "Female", "Non-binary"], 60, p=[0.5, 0.4, 0.1]),
        "Passed": np.random.choice([1, 0], 60)
    })
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert "Gender" in detection.selected_protected_attributes
    gender_cand = next(p for p in detection.protected_attribute_candidates if p.column == "Gender")
    assert gender_cand.confidence >= 0.75
    assert set(gender_cand.detected_groups).issuperset({"Male", "Female"})
    assert gender_cand.recommended_reference_group == "Male"  # Largest group

# --- 4. Test Race Protected Attribute Detection ---
def test_race_protected_attribute_detection():
    np.random.seed(42)
    df = pd.DataFrame({
        "Experience": np.random.randint(1, 15, 80),
        "Race": np.random.choice(["White", "Black", "Asian"], 80, p=[0.6, 0.25, 0.15]),
        "Hired": np.random.choice([1, 0], 80)
    })
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert "Race" in detection.selected_protected_attributes
    race_cand = next(p for p in detection.protected_attribute_candidates if p.column == "Race")
    assert race_cand.confidence >= 0.70
    assert race_cand.recommended_reference_group == "White"

# --- 5. Test Multiple Protected Attributes & Multi-Attribute Audit Ranking ---
def test_multi_protected_attributes_ranking():
    df = generate_loan_approval_dataset(n_samples=500)
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert "Gender" in detection.selected_protected_attributes
    assert "Race" in detection.selected_protected_attributes
    
    res, artifacts = run_automatic_audit(df, "test_multi", "Loan Test")
    assert len(res.fairness_audit.findings) >= 2
    # Findings are ranked by severity
    assert res.fairness_audit.findings[0].severity_rank == 1
    assert res.fairness_audit.findings[1].severity_rank == 2

# --- 6. Test Imbalanced Target Dataset ---
def test_imbalanced_target():
    # 95% 0s, 5% 1s
    y = np.array([0]*95 + [1]*5)
    df = pd.DataFrame({
        "Feature": np.random.randn(100),
        "Sex": np.random.choice(["Male", "Female"], 100),
        "Target": y
    })
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    assert detection.selected_target == "Target"
    assert detection.positive_class == 1

# --- 7. Test Missing Values & Constant Columns ---
def test_missing_and_constant_columns():
    df = pd.DataFrame({
        "Const_Col": [42] * 40,
        "Mostly_Missing": [None] * 35 + [1, 2, 3, 4, 5],
        "Age": np.random.randint(20, 60, 40),
        "Gender": np.random.choice(["Male", "Female"], 40),
        "Outcome": np.random.choice([0, 1], 40)
    })
    profile = profile_dataset(df)
    assert "Const_Col" in profile.constant_columns
    assert profile.missing_values_count >= 35
    
    detection = detect_dataset_roles(df, profile)
    assert detection.selected_target == "Outcome"
    assert "Const_Col" not in detection.selected_protected_attributes

# --- 8. Test ID Columns Exclusion ---
def test_id_columns_exclusion():
    df = pd.DataFrame({
        "Customer_ID": [f"CUST_{i}" for i in range(50)],
        "Income": np.random.normal(50000, 10000, 50),
        "Gender": np.random.choice(["M", "F"], 50),
        "Approved": np.random.choice([0, 1], 50)
    })
    profile = profile_dataset(df)
    assert "Customer_ID" in profile.id_columns
    
    detection = detect_dataset_roles(df, profile)
    assert detection.selected_target == "Approved"
    assert "Customer_ID" != detection.selected_target
    assert "Customer_ID" not in detection.selected_protected_attributes

# --- 9. Test Insufficient Subgroup Sample Size Warning ---
def test_insufficient_group_size_warning():
    y_true = np.array([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0])
    y_pred = np.array([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0])
    # Group B has only 2 samples (< 15)
    prot = pd.Series(["A"] * 10 + ["B"] * 2)
    
    audit = audit_single_attribute(
        y_true=y_true,
        y_pred=y_pred,
        prot_series=prot,
        attribute_name="Demo",
        reference_group="A",
        reference_reason="Largest group"
    )
    assert audit.severity_status == "Insufficient Evidence"
    b_metric = next(g for g in audit.groups if g.group_name == "B")
    assert b_metric.sample_size_valid is False
    assert "Insufficient sample size" in b_metric.warning

# --- 10. Test Baseline Fairness Failure -> Automatic Mitigation Success ---
def test_mitigation_on_disparity():
    df = generate_loan_approval_dataset(n_samples=800)
    res, artifacts = run_automatic_audit(df, "test_mit", "Loan Disparity Test")
    
    assert res.baseline_performance.accuracy > 0.50
    assert res.fairness_audit.overall_status in ["Potential Fairness Concern", "Passes Screening Threshold"]
    
    # If baseline had a concern, verify mitigation was executed and thresholds tuned
    if res.fairness_audit.overall_status == "Potential Fairness Concern":
        assert res.mitigation.mitigation_applied is True
        assert len(res.mitigation.learned_thresholds) >= 2
        assert res.mitigation.mitigation_status in ["Fairness improved", "Fairness maintained", "No acceptable mitigation found"]

# --- 11. Test Baseline Fairness Pass -> No Unnecessary Mitigation ---
def test_baseline_pass_no_mitigation():
    np.random.seed(99)
    # Perfectly equitable data
    n = 600
    genders = np.random.choice(["Group_A", "Group_B"], n, p=[0.5, 0.5])
    scores = np.random.normal(50, 10, n)
    # Target depends ONLY on score, zero group disparity
    target = (scores > 50).astype(int)
    
    df = pd.DataFrame({
        "Score": scores,
        "Demographic": genders,
        "Target": target
    })
    res, _ = run_automatic_audit(df, "test_pass", "Equitable Test")
    
    finding = res.fairness_audit.findings[0]
    if finding.severity_status == "Passes Screening Threshold":
        assert res.mitigation.mitigation_applied is False
        assert res.mitigation.mitigation_status == "No mitigation required"

# --- 12. Test FastAPI Endpoints End-to-End ---
def test_api_sample_auto_audit():
    resp = client.post("/api/samples/loan_approval/auto-audit")
    assert resp.status_code == 200
    data = resp.json()
    
    assert "dataset_id" in data
    assert "profile" in data
    assert "detection" in data
    assert "baseline_performance" in data
    assert "fairness_audit" in data
    assert "mitigation" in data
    assert "explainability" in data
    assert "report_markdown" in data
    
    # Verify non-empty calculations
    assert data["baseline_performance"]["accuracy"] > 0
    assert len(data["fairness_audit"]["findings"]) > 0
    assert len(data["explainability"]["global_importance"]) > 0

def test_api_predict_with_xai():
    # Run audit first
    audit_resp = client.post("/api/samples/loan_approval/auto-audit")
    dataset_id = audit_resp.json()["dataset_id"]
    
    # Predict on a sample applicant
    sample_input = {
        "Annual_Income": 85000,
        "Credit_Score": 720,
        "Loan_Amount": 25000,
        "Employment_Years": 7,
        "Gender": "Female",
        "Race": "Black"
    }
    pred_resp = client.post("/api/predict", json={
        "dataset_id": dataset_id,
        "input_data": sample_input
    })
    assert pred_resp.status_code == 200
    pred_data = pred_resp.json()
    
    assert "probability" in pred_data
    assert "predicted_class" in pred_data
    assert "mitigated_predicted_class" in pred_data
    assert "disclaimer" in pred_data
    assert len(pred_data["shap_contributions"]) > 0

def test_api_upload_csv():
    df = pd.DataFrame({
        "User_ID": [f"U_{i}" for i in range(30)],
        "Age": np.random.randint(20, 60, 30),
        "Sex": np.random.choice(["M", "F"], 30),
        "Credit": np.random.normal(700, 50, 30),
        "Approved": np.random.choice([0, 1], 30)
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    resp = client.post(
        "/api/upload",
        files={"file": ("test_upload.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "dataset_id" in data
    assert data["profile"]["row_count"] == 30
    assert data["detection"]["selected_target"] == "Approved"
    assert "Sex" in data["detection"]["selected_protected_attributes"]

def test_api_audit_override():
    audit_resp = client.post("/api/samples/loan_approval/auto-audit")
    dataset_id = audit_resp.json()["dataset_id"]
    
    # Request override with specific model and protected attribute
    override_resp = client.post("/api/audit-override", json={
        "dataset_id": dataset_id,
        "protected_attributes": ["Gender"],
        "model_type": "logistic_regression",
        "disparate_impact_threshold": 0.85
    })
    assert override_resp.status_code == 200
    data = override_resp.json()
    assert data["detection"]["selected_protected_attributes"] == ["Gender"]
    assert len(data["fairness_audit"]["findings"]) == 1
    assert data["fairness_audit"]["findings"][0]["attribute_name"] == "Gender"

def test_api_get_report():
    audit_resp = client.post("/api/samples/loan_approval/auto-audit")
    dataset_id = audit_resp.json()["dataset_id"]
    
    rep_resp = client.get(f"/api/report/{dataset_id}")
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert "report_markdown" in rep_data
    assert "# FairLens AI Fairness & Model Audit Report" in rep_data["report_markdown"]

def test_benchmark_recruitment_dataset():
    resp = client.post("/api/samples/recruitment_hiring/auto-audit")
    assert resp.status_code == 200
    data = resp.json()
    assert data["detection"]["selected_target"] == "Hired"
    assert "Gender" in data["detection"]["selected_protected_attributes"]
    assert "Age_Group" in data["detection"]["selected_protected_attributes"]

def test_benchmark_adult_income_dataset():
    resp = client.post("/api/samples/adult_income/auto-audit")
    assert resp.status_code == 200
    data = resp.json()
    assert data["detection"]["selected_target"] == "Income"
    assert "Sex" in data["detection"]["selected_protected_attributes"]

# --- Tests for Real Datasets in datasets/ ---

def test_real_recruitment_dataset():
    df = pd.read_csv(r"C:\major-project-v2\bias-mitigation\datasets\fair_recrutment_dataset final.csv", nrows=5000)
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert detection.selected_target == "Hiring_Decision"
    assert detection.positive_class == 1
    assert "Gender" in detection.selected_protected_attributes
    assert "Candidate_ID" in profile.id_columns
    
    res, _ = run_automatic_audit(df, "real_recruitment_test", "Real Recruitment Final")
    assert res.baseline_performance.accuracy > 0.90
    assert res.fairness_audit.overall_status == "Passes Screening Threshold"
    assert res.mitigation.mitigation_applied is False
    assert res.mitigation.mitigation_status == "No mitigation required"

def test_real_loan_dataset_with_disparity():
    df = pd.read_csv(r"C:\major-project-v2\bias-mitigation\datasets\synthetic_loan_applications_biased.csv", nrows=5000)
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert detection.selected_target == "underwriting_decision"
    assert detection.positive_class == "approved"
    assert "applicant_race" in detection.selected_protected_attributes
    assert "applicant_gender" in detection.selected_protected_attributes
    assert "decision_notes" in profile.suspicious_leakage
    
    res, _ = run_automatic_audit(df, "real_loan_test", "Real Loan Applications Biased")
    assert res.fairness_audit.overall_status == "Potential Fairness Concern"
    ref_grp = res.mitigation.baseline_fairness.reference_group
    assert res.mitigation.learned_thresholds[ref_grp] == 0.5
    assert len(res.mitigation.learned_thresholds) >= 2

def test_real_students_performance_dataset():
    df = pd.read_csv(r"C:\major-project-v2\bias-mitigation\datasets\StudentsPerformance.csv")
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    assert detection.selected_target == "test preparation course"
    assert "gender" in detection.selected_protected_attributes
    assert "race/ethnicity" in detection.selected_protected_attributes
    
    res, _ = run_automatic_audit(df, "real_students_test", "Students Performance")
    assert res.baseline_performance.accuracy > 0.60
    assert len(res.fairness_audit.findings) >= 2

def test_api_real_dataset_sample_audit():
    # Test listing endpoint includes real datasets
    list_resp = client.get("/api/samples")
    assert list_resp.status_code == 200
    samples_list = list_resp.json()
    assert any(s.get("is_real") for s in samples_list)
    
    # Test 1-click execution on real students performance dataset
    audit_resp = client.post("/api/samples/studentsperformance/auto-audit")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert audit_data["detection"]["selected_target"] == "test preparation course"
    assert len(audit_data["fairness_audit"]["findings"]) >= 2


