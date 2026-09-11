from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# --- Column & Profiling Schemas ---

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    inferred_type: str  # numeric, categorical, datetime, id, pii, constant, boolean
    unique_count: int
    missing_count: int
    missing_ratio: float
    sample_values: List[Any]
    is_constant: bool = False
    is_id: bool = False
    is_pii: bool = False
    is_target_candidate: bool = False
    is_protected_candidate: bool = False

class DatasetProfile(BaseModel):
    row_count: int
    column_count: int
    columns: List[ColumnInfo]
    numerical_columns: List[str]
    categorical_columns: List[str]
    date_columns: List[str]
    id_columns: List[str]
    pii_columns: List[str]
    constant_columns: List[str]
    missing_values_count: int
    duplicate_rows_count: int
    data_quality_warnings: List[str] = []
    suspicious_leakage: List[str] = []

# --- Detection Schemas ---

class TargetCandidate(BaseModel):
    column: str
    confidence: float  # 0.0 to 1.0
    detected_classes: List[Any]
    positive_class: Any
    reason: str

class ProtectedAttributeCandidate(BaseModel):
    column: str
    confidence: float  # 0.0 to 1.0
    detected_groups: List[str]
    recommended_reference_group: str
    reference_reason: str
    reason: str

class ProxySignal(BaseModel):
    feature: str
    protected_attribute: str
    correlation_score: float
    message: str

class DetectionSummary(BaseModel):
    target_candidates: List[TargetCandidate]
    selected_target: str
    target_confidence: float
    is_target_confident: bool
    positive_class: Any
    protected_attribute_candidates: List[ProtectedAttributeCandidate]
    selected_protected_attributes: List[str]
    reference_groups: Dict[str, str]
    detected_proxies: List[ProxySignal] = []

# --- Performance & Fairness Schemas ---

class ConfusionMatrix(BaseModel):
    tn: int
    fp: int
    fn: int
    tp: int

class PerformanceMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    positive_prediction_rate: float
    confusion_matrix: ConfusionMatrix
    train_samples: int
    val_samples: int
    test_samples: int
    model_type: str
    decision_threshold: float = 0.50

class GroupFairnessMetrics(BaseModel):
    group_name: str
    sample_count: int
    sample_size_valid: bool
    actual_positive_rate: float
    predicted_positive_rate: float
    tpr: Optional[float] = None
    fpr: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    disparate_impact: Optional[float] = None
    tpr_difference: Optional[float] = None
    fpr_difference: Optional[float] = None
    warning: Optional[str] = None

class AttributeFairnessAudit(BaseModel):
    attribute_name: str
    reference_group: str
    reference_reason: str
    primary_comparison_group: str
    groups: List[GroupFairnessMetrics]
    disparate_impact: Optional[float] = None
    tpr_difference: Optional[float] = None
    fpr_difference: Optional[float] = None
    prediction_rate_difference: Optional[float] = None
    passes_disparate_impact: bool
    passes_tpr_parity: bool
    passes_fpr_parity: bool
    severity_status: str  # "Potential Fairness Concern", "Passes Screening Threshold", "Insufficient Evidence"
    severity_rank: int
    explanation: str

class FairnessAuditSummary(BaseModel):
    overall_status: str  # "Potential Fairness Concern", "Passes Screening Threshold", "Insufficient Evidence"
    primary_issue_attribute: Optional[str] = None
    primary_issue_metric: Optional[str] = None
    summary_explanation: str
    findings: List[AttributeFairnessAudit]

# --- Mitigation Schemas ---

class MitigationResult(BaseModel):
    mitigation_applied: bool
    mitigation_method: str
    mitigation_status: str  # "Fairness improved", "Fairness maintained", "No mitigation required", "No acceptable mitigation found", "Fairness worsened"
    primary_attribute: str
    learned_thresholds: Dict[str, float]
    baseline_performance: PerformanceMetrics
    mitigated_performance: PerformanceMetrics
    baseline_fairness: AttributeFairnessAudit
    mitigated_fairness: AttributeFairnessAudit
    performance_delta: Dict[str, float]
    fairness_delta: Dict[str, float]
    trade_off_summary: str
    interpretation: str

# --- Explainability Schemas ---

class FeatureImportance(BaseModel):
    feature: str
    importance: float
    rank: int

class LocalContribution(BaseModel):
    feature: str
    value: Any
    contribution: float

class ExplainabilityResult(BaseModel):
    global_importance: List[FeatureImportance]
    proxy_signals: List[ProxySignal]
    disclaimer: str

# --- Prediction & Inspection Schemas ---

class PredictionRequest(BaseModel):
    dataset_id: str
    input_data: Dict[str, Any]

class PredictionResponse(BaseModel):
    predicted_class: Any
    probability: float
    threshold_used: float
    mitigated_predicted_class: Optional[Any] = None
    mitigated_probability: Optional[float] = None
    mitigated_threshold: Optional[float] = None
    shap_contributions: List[LocalContribution] = []
    lime_contributions: List[LocalContribution] = []
    disclaimer: str

# --- Audit Overrides & Requests ---

class AuditOverrideRequest(BaseModel):
    dataset_id: str
    target_column: Optional[str] = None
    positive_class: Optional[Any] = None
    protected_attributes: Optional[List[str]] = None
    reference_groups: Optional[Dict[str, str]] = None
    model_type: Optional[str] = "logistic_regression"
    disparate_impact_threshold: Optional[float] = 0.80
    apply_mitigation: Optional[bool] = True

# --- Full Unified Auto-Audit Response ---

class FullAuditResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    profile: DatasetProfile
    detection: DetectionSummary
    baseline_performance: PerformanceMetrics
    fairness_audit: FairnessAuditSummary
    mitigation: MitigationResult
    explainability: ExplainabilityResult
    report_markdown: str
