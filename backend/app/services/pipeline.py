from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from backend.app.config import settings
from backend.app.schemas import ConfusionMatrix, PerformanceMetrics

class PipelineArtifacts:
    """Holds fitted data pipelines, split datasets, and model objects."""
    def __init__(
        self,
        model: Any,
        preprocessor: ColumnTransformer,
        feature_names: List[str],
        encoded_feature_names: List[str],
        target_col: str,
        positive_class: Any,
        protected_cols: List[str],
        X_train: pd.DataFrame,
        X_val: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_val: pd.Series,
        y_test: pd.Series,
        prot_train: pd.DataFrame,
        prot_val: pd.DataFrame,
        prot_test: pd.DataFrame,
        y_val_proba: np.ndarray,
        y_test_proba: np.ndarray,
    ):
        self.model = model
        self.preprocessor = preprocessor
        self.feature_names = feature_names
        self.encoded_feature_names = encoded_feature_names
        self.target_col = target_col
        self.positive_class = positive_class
        self.protected_cols = protected_cols
        self.X_train = X_train
        self.X_val = X_val
        self.X_test = X_test
        self.y_train = y_train
        self.y_val = y_val
        self.y_test = y_test
        self.prot_train = prot_train
        self.prot_val = prot_val
        self.prot_test = prot_test
        self.y_val_proba = y_val_proba
        self.y_test_proba = y_test_proba

def prepare_feature_data(
    df: pd.DataFrame,
    target_col: str,
    protected_cols: List[str],
    drop_cols: List[str]
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, List[str], List[str]]:
    """Separates features, binary target, and protected attributes, cleaning column sets."""
    all_drop = set(drop_cols + [target_col] + protected_cols)
    feature_cols = [c for c in df.columns if c not in all_drop]
    
    X = df[feature_cols].copy()
    y_raw = df[target_col].copy()
    prot_df = df[protected_cols].copy()
    
    # Standardize protected demographic columns into clean cohorts
    for col in protected_cols:
        if pd.api.types.is_numeric_dtype(prot_df[col]) and prot_df[col].nunique() > 8:
            if "age" in str(col).lower():
                prot_df[col] = pd.cut(
                    prot_df[col],
                    bins=[0, 29, 45, 60, 150],
                    labels=["Under 30", "30-45", "46-60", "Over 60"]
                ).astype(str)
            else:
                prot_df[col] = pd.qcut(prot_df[col], q=4, duplicates="drop").astype(str)
        else:
            prot_df[col] = prot_df[col].astype(str)
    
    # Identify numeric vs categorical features
    num_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in feature_cols if c not in num_cols]
    
    return X, y_raw, prot_df, num_cols, cat_cols

def build_preprocessor(num_cols: List[str], cat_cols: List[str]) -> ColumnTransformer:
    """Builds a scikit-learn preprocessing ColumnTransformer fitted only on training data."""
    transformers = []
    
    if num_cols:
        num_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler())
        ])
        transformers.append(("num", num_pipe, num_cols))
        
    if cat_cols:
        cat_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", max_categories=30, sparse_output=False))
        ])
        transformers.append(("cat", cat_pipe, cat_cols))
        
    return ColumnTransformer(transformers=transformers, remainder="drop")

def get_encoded_feature_names(preprocessor: ColumnTransformer, num_cols: List[str], cat_cols: List[str]) -> List[str]:
    """Retrieves cleanly formatted output feature names after transformation."""
    names = []
    for name, trans, cols in preprocessor.transformers_:
        if name == "num":
            names.extend(cols)
        elif name == "cat":
            try:
                encoder = trans.named_steps["encoder"]
                cat_names = encoder.get_feature_names_out(cols).tolist()
                names.extend(cat_names)
            except Exception:
                names.extend(cols)
    return names

def calculate_performance_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    train_count: int,
    val_count: int,
    test_count: int,
    model_type: str,
    threshold: float = 0.50
) -> PerformanceMetrics:
    """Computes comprehensive classification metrics from ground truth and predictions."""
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    pos_rate = float(np.mean(y_pred == 1))
    
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    if cm.shape == (2, 2):
        tn, fp, fn, tp = [int(v) for v in cm.ravel()]
    else:
        # Fallback if only 1 class in sample
        tn = int(cm[0, 0]) if cm.shape[0] > 0 else 0
        fp, fn, tp = 0, 0, 0
        
    return PerformanceMetrics(
        accuracy=round(acc, 4),
        precision=round(prec, 4),
        recall=round(rec, 4),
        f1=round(f1, 4),
        positive_prediction_rate=round(pos_rate, 4),
        confusion_matrix=ConfusionMatrix(tn=tn, fp=fp, fn=fn, tp=tp),
        train_samples=train_count,
        val_samples=val_count,
        test_samples=test_count,
        model_type=model_type,
        decision_threshold=round(threshold, 3)
    )

def train_model_pipeline(
    df: pd.DataFrame,
    target_col: str,
    positive_class: Any,
    protected_cols: List[str],
    drop_cols: List[str],
    model_type: str = "logistic_regression"
) -> Tuple[PerformanceMetrics, PipelineArtifacts]:
    """Trains a baseline model using a clean Train(60%)/Val(20%)/Test(20%) split."""
    X, y_raw, prot_df, num_cols, cat_cols = prepare_feature_data(df, target_col, protected_cols, drop_cols)
    
    # Binary conversion
    y_binary = (y_raw == positive_class).astype(int)
    
    # Stratified 60/20/20 split
    stratify = y_binary if y_binary.nunique() > 1 else None
    
    # First split: 80% train+val, 20% test
    X_trainval, X_test, y_trainval, y_test, prot_trainval, prot_test = train_test_split(
        X, y_binary, prot_df, test_size=0.20, random_state=settings.RANDOM_SEED, stratify=stratify
    )
    
    # Second split: train (75% of 80% = 60%), val (25% of 80% = 20%)
    stratify_val = y_trainval if y_trainval.nunique() > 1 else None
    X_train, X_val, y_train, y_val, prot_train, prot_val = train_test_split(
        X_trainval, y_trainval, prot_trainval, test_size=0.25, random_state=settings.RANDOM_SEED, stratify=stratify_val
    )
    
    # Fit preprocessor strictly on X_train
    preprocessor = build_preprocessor(num_cols, cat_cols)
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)
    
    encoded_feature_names = get_encoded_feature_names(preprocessor, num_cols, cat_cols)
    
    # Model instantiation
    if model_type == "random_forest":
        model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=settings.RANDOM_SEED)
    elif model_type == "xgboost":
        try:
            import xgboost as xgb
            model = xgb.XGBClassifier(n_estimators=100, max_depth=5, eval_metric="logloss", random_state=settings.RANDOM_SEED)
        except Exception:
            model = LogisticRegression(max_iter=1000, random_state=settings.RANDOM_SEED)
    else:
        model = LogisticRegression(max_iter=1000, random_state=settings.RANDOM_SEED)
        
    model.fit(X_train_trans, y_train)
    
    # Probabilities for positive class (label 1)
    if hasattr(model, "predict_proba"):
        classes_list = list(model.classes_)
        pos_idx = classes_list.index(1) if 1 in classes_list else -1
        y_val_proba = model.predict_proba(X_val_trans)[:, pos_idx]
        y_test_proba = model.predict_proba(X_test_trans)[:, pos_idx]
    else:
        # Decision function fallback
        dfunc = model.decision_function(X_test_trans)
        y_test_proba = 1 / (1 + np.exp(-dfunc))
        dfunc_val = model.decision_function(X_val_trans)
        y_val_proba = 1 / (1 + np.exp(-dfunc_val))
        
    # Default 0.50 threshold predictions on test set
    y_test_pred = (y_test_proba >= 0.50).astype(int)
    
    metrics = calculate_performance_metrics(
        y_true=y_test.values,
        y_pred=y_test_pred,
        train_count=len(X_train),
        val_count=len(X_val),
        test_count=len(X_test),
        model_type=model_type,
        threshold=0.50
    )
    
    artifacts = PipelineArtifacts(
        model=model,
        preprocessor=preprocessor,
        feature_names=list(X.columns),
        encoded_feature_names=encoded_feature_names,
        target_col=target_col,
        positive_class=positive_class,
        protected_cols=protected_cols,
        X_train=X_train,
        X_val=X_val,
        X_test=X_test,
        y_train=y_train,
        y_val=y_val,
        y_test=y_test,
        prot_train=prot_train,
        prot_val=prot_val,
        prot_test=prot_test,
        y_val_proba=y_val_proba,
        y_test_proba=y_test_proba
    )
    
    return metrics, artifacts
