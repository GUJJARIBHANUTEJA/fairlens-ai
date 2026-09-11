from typing import Any, Dict, Optional, Tuple
import pandas as pd

from backend.app.schemas import (
    AuditOverrideRequest,
    ExplainabilityResult,
    FullAuditResponse
)
from backend.app.services.detection import detect_dataset_roles
from backend.app.services.explainability import (
    XAI_DISCLAIMER,
    compute_global_feature_importance,
    explain_local_sample
)
from backend.app.services.fairness import audit_multi_attributes
from backend.app.services.mitigation import execute_mitigation
from backend.app.services.pipeline import PipelineArtifacts, train_model_pipeline
from backend.app.services.profiling import profile_dataset
from backend.app.services.reporting import generate_audit_report

# In-memory storage for active session datasets and fitted pipelines
SESSION_STORE: Dict[str, Tuple[FullAuditResponse, PipelineArtifacts, pd.DataFrame]] = {}

def run_automatic_audit(
    df: pd.DataFrame,
    dataset_id: str,
    dataset_name: str,
    overrides: Optional[AuditOverrideRequest] = None
) -> Tuple[FullAuditResponse, PipelineArtifacts]:
    """Orchestrates the entire automatic fairness audit pipeline from profiling to reporting."""
    
    # 1. Automatic Dataset Profiling
    profile = profile_dataset(df)
    
    # 2. Automatic Role & Demographic Detection
    detection = detect_dataset_roles(df, profile)
    
    # Apply manual overrides if provided
    target_col = (overrides.target_column if overrides and overrides.target_column else detection.selected_target)
    positive_class = (overrides.positive_class if overrides and overrides.positive_class is not None else detection.positive_class)
    
    detection.selected_target = target_col
    detection.positive_class = positive_class
    
    if overrides and overrides.protected_attributes:
        protected_cols = overrides.protected_attributes
        detection.selected_protected_attributes = protected_cols
    else:
        protected_cols = detection.selected_protected_attributes
        
    # If no protected attributes were detected at all, select first categorical column as fallback
    if not protected_cols and profile.categorical_columns:
        fallback_col = [c for c in profile.categorical_columns if c != target_col][0]
        protected_cols = [fallback_col]
        detection.selected_protected_attributes = protected_cols
        detection.reference_groups[fallback_col] = str(df[fallback_col].dropna().iloc[0])
        
    ref_groups = detection.reference_groups.copy()
    if overrides and overrides.reference_groups:
        ref_groups.update(overrides.reference_groups)
        
    model_type = overrides.model_type if (overrides and overrides.model_type) else "logistic_regression"
    
    # Exclude IDs, PII, Constants, Dates, and Target Leakage from training features
    drop_cols = list(set(profile.id_columns + profile.pii_columns + profile.constant_columns + profile.date_columns + profile.suspicious_leakage))
    
    # 3. Train Baseline Model Pipeline
    baseline_metrics, artifacts = train_model_pipeline(
        df=df,
        target_col=target_col,
        positive_class=positive_class,
        protected_cols=protected_cols,
        drop_cols=drop_cols,
        model_type=model_type
    )
    
    # 4. Multi-Attribute Fairness Audit
    ref_reasons = {p.column: p.reference_reason for p in detection.protected_attribute_candidates}
    test_baseline_preds = (artifacts.y_test_proba >= 0.50).astype(int)
    fairness_summary = audit_multi_attributes(
        y_true=artifacts.y_test.values,
        y_pred=test_baseline_preds,
        prot_df=artifacts.prot_test,
        reference_groups=ref_groups,
        reference_reasons=ref_reasons
    )
    
    # 5. Automatic Mitigation Decision & Execution
    mitigation_res = execute_mitigation(
        artifacts=artifacts,
        fairness_summary=fairness_summary,
        baseline_metrics=baseline_metrics
    )
    
    # 6. Explainability (SHAP & LIME)
    global_imp = compute_global_feature_importance(artifacts)
    sample_shap, sample_lime = [], []
    if len(artifacts.X_test) > 0:
        try:
            first_sample = artifacts.X_test.iloc[0].to_dict()
            sample_shap, sample_lime = explain_local_sample(artifacts, first_sample)
        except Exception:
            pass

    explainability_res = ExplainabilityResult(
        global_importance=global_imp,
        proxy_signals=detection.detected_proxies,
        disclaimer=XAI_DISCLAIMER,
        sample_shap=sample_shap,
        sample_lime=sample_lime
    )
    
    # 7. Comprehensive 13-Point Audit Report
    report_md = generate_audit_report(
        dataset_name=dataset_name,
        profile=profile,
        detection=detection,
        baseline_performance=baseline_metrics,
        fairness_audit=fairness_summary,
        mitigation=mitigation_res,
        explainability=explainability_res
    )
    
    response = FullAuditResponse(
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        profile=profile,
        detection=detection,
        baseline_performance=baseline_metrics,
        fairness_audit=fairness_summary,
        mitigation=mitigation_res,
        explainability=explainability_res,
        report_markdown=report_md
    )
    
    # Cache session
    SESSION_STORE[dataset_id] = (response, artifacts, df)
    
    return response, artifacts
