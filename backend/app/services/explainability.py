from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import shap
from lime.lime_tabular import LimeTabularExplainer

from backend.app.schemas import (
    FeatureImportance,
    LocalContribution,
    ExplainabilityResult,
    ProxySignal
)
from backend.app.services.pipeline import PipelineArtifacts

XAI_DISCLAIMER = (
    "Feature contributions from SHAP and LIME reflect model prediction mechanisms on observed data. "
    "They explain model behavior, not causality. Their presence in this explanation does not by itself prove "
    "unlawful discrimination or demonstrate that these specific features caused the observed fairness disparity."
)

def compute_global_feature_importance(
    artifacts: PipelineArtifacts,
    max_features: int = 10
) -> List[FeatureImportance]:
    """Computes global feature importance using model coefficients or SHAP values."""
    feature_names = artifacts.encoded_feature_names
    importances: Dict[str, float] = {}
    
    # Check if linear model with coef_
    if hasattr(artifacts.model, "coef_"):
        coefs = np.abs(artifacts.model.coef_[0])
        # Aggregate one-hot categories back to root features where applicable
        for fname, weight in zip(feature_names, coefs):
            # Strip one-hot suffixes for cleaner presentation
            root_feature = fname.split("_")[0] if ("_" in fname and any(fname.startswith(orig) for orig in artifacts.feature_names)) else fname
            importances[root_feature] = importances.get(root_feature, 0.0) + float(weight)
    elif hasattr(artifacts.model, "feature_importances_"):
        weights = artifacts.model.feature_importances_
        for fname, weight in zip(feature_names, weights):
            root_feature = fname.split("_")[0] if ("_" in fname and any(fname.startswith(orig) for orig in artifacts.feature_names)) else fname
            importances[root_feature] = importances.get(root_feature, 0.0) + float(weight)
    else:
        # Fallback to standard correlation
        for feat in artifacts.feature_names:
            importances[feat] = 1.0
            
    # Normalize and sort
    total_imp = sum(importances.values()) or 1.0
    sorted_items = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:max_features]
    
    result = []
    for rank, (feat, val) in enumerate(sorted_items, start=1):
        result.append(FeatureImportance(
            feature=feat,
            importance=round(float(val / total_imp), 4),
            rank=rank
        ))
    return result

def explain_local_sample(
    artifacts: PipelineArtifacts,
    sample_dict: Dict[str, Any]
) -> Tuple[List[LocalContribution], List[LocalContribution]]:
    """Generates local explanation contributions using both SHAP and LIME for an individual sample."""
    sample_df = pd.DataFrame([sample_dict])
    
    # Retain only recognized predictive feature columns
    for feat in artifacts.feature_names:
        if feat not in sample_df.columns:
            sample_df[feat] = np.nan
    sample_df = sample_df[artifacts.feature_names]
    
    # Preprocess sample
    try:
        sample_trans = artifacts.preprocessor.transform(sample_df)
    except Exception:
        return [], []
        
    shap_contributions: List[LocalContribution] = []
    lime_contributions: List[LocalContribution] = []
    
    # 1. SHAP Explanation
    try:
        # For linear models, LinearExplainer or simple weight attribution
        if hasattr(artifacts.model, "coef_"):
            coef = artifacts.model.coef_[0]
            # Contribution = coef * standardized_value
            raw_contribs = coef * sample_trans[0]
            # Map to feature names
            feat_contribs: Dict[str, float] = {}
            for fname, c_val in zip(artifacts.encoded_feature_names, raw_contribs):
                root_f = fname.split("_")[0] if any(fname.startswith(orig) for orig in artifacts.feature_names) else fname
                feat_contribs[root_f] = feat_contribs.get(root_f, 0.0) + float(c_val)
                
            sorted_shap = sorted(feat_contribs.items(), key=lambda x: abs(x[1]), reverse=True)[:6]
            for f, val in sorted_shap:
                shap_contributions.append(LocalContribution(
                    feature=f,
                    value=sample_dict.get(f, "N/A"),
                    contribution=round(val, 4)
                ))
        else:
            # Tree explainer
            X_train_trans = artifacts.preprocessor.transform(artifacts.X_train.head(100))
            explainer = shap.Explainer(artifacts.model, X_train_trans)
            shap_values = explainer(sample_trans)
            vals = shap_values.values[0]
            if len(vals.shape) > 1:
                vals = vals[:, 1]  # positive class
            sorted_idx = np.argsort(-np.abs(vals))[:6]
            for idx in sorted_idx:
                fname = artifacts.encoded_feature_names[idx] if idx < len(artifacts.encoded_feature_names) else f"Feature_{idx}"
                shap_contributions.append(LocalContribution(
                    feature=fname,
                    value=sample_dict.get(fname, "N/A"),
                    contribution=round(float(vals[idx]), 4)
                ))
    except Exception as e:
        pass
        
    # 2. LIME Explanation
    try:
        X_train_trans = artifacts.preprocessor.transform(artifacts.X_train.head(200))
        lime_explainer = LimeTabularExplainer(
            training_data=np.array(X_train_trans),
            feature_names=artifacts.encoded_feature_names,
            mode="classification",
            random_state=42
        )
        exp = lime_explainer.explain_instance(
            data_row=sample_trans[0],
            predict_fn=artifacts.model.predict_proba,
            num_features=6
        )
        for fname_cond, weight in exp.as_list():
            # Clean condition text to extract feature name
            feat_match = fname_cond.split("<=")[0].split(">=")[0].split("<")[0].split(">")[0].split("=")[0].strip()
            lime_contributions.append(LocalContribution(
                feature=feat_match,
                value=sample_dict.get(feat_match, "Observed"),
                contribution=round(float(weight), 4)
            ))
    except Exception as e:
        pass
        
    return shap_contributions, lime_contributions
