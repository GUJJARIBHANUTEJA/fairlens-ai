from pathlib import Path

class Settings:
    PROJECT_NAME: str = "FairLens"
    PROJECT_TAGLINE: str = "AI Fairness & Model Auditing"
    VERSION: str = "2.0.0"
    
    # Audit & Statistical Thresholds
    RANDOM_SEED: int = 42
    MIN_GROUP_SAMPLE_SIZE: int = 15
    DISPARATE_IMPACT_LOWER: float = 0.80
    DISPARATE_IMPACT_UPPER: float = 1.25
    TPR_DIFF_TOLERANCE: float = 0.10
    FPR_DIFF_TOLERANCE: float = 0.10
    PREDICTION_RATE_DIFF_TOLERANCE: float = 0.10
    
    # Detection Thresholds
    TARGET_CONFIDENCE_THRESHOLD: float = 0.70
    PROTECTED_ATTR_CONFIDENCE_THRESHOLD: float = 0.55
    PROXY_CORRELATION_THRESHOLD: float = 0.30
    
    # Mitigation Settings
    DEFAULT_MITIGATION_METHOD: str = "threshold_optimization"
    MAX_PERFORMANCE_DEGRADATION_F1: float = 0.12
    MAX_PERFORMANCE_DEGRADATION_ACC: float = 0.08
    ACCURACY_PRESERVED_TOLERANCE: float = 0.01  # ±1.0 percentage point tolerance for claiming accuracy preserved
    
    # File Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    SAMPLE_DIR: Path = DATA_DIR / "samples"
    DATASET_DIR: Path = BASE_DIR.parent / "datasets"

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
