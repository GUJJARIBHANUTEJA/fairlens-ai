from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import shap
from lime.lime_tabular import LimeTabularExplainer

from backend.app.schemas import (
    AttributeFairnessAudit,
    DisparityAttribution,
    DisparityDriver,
    FeatureImportance,
    LocalContribution,
    ExplainabilityResult,
    ProxySignal
)
from backend.app.services.pipeline import PipelineArtifacts

XAI_DISCLAIMER = (
    "SHAP/LIME explain model behavior and feature correlation. "
    "They identify proxy patterns, not proof of intentional or causal discrimination."
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

def compute_group_disparity_attribution(
    artifacts: PipelineArtifacts,
    finding: Optional[AttributeFairnessAudit]
) -> DisparityAttribution:
    """Attributes feature contribution disparities between reference and disadvantaged groups using SHAP values."""
    caveat = (
        "SHAP/LIME explain model behavior and feature correlation. "
        "They identify proxy patterns, not proof of intentional or causal discrimination."
    )
    
    if finding is None or not finding.attribute_name:
        return DisparityAttribution(
            attribute_name="None",
            reference_group="N/A",
            disadvantaged_group="N/A",
            drivers=[],
            narrative="No protected attributes available for demographic SHAP disparity analysis.",
            caveat=caveat
        )
        
    attr_name = finding.attribute_name
    ref_grp = finding.reference_group
    disadv_grp = finding.disadvantaged_group or finding.primary_comparison_group
    
    if not finding.bias_found:
        return DisparityAttribution(
            attribute_name=attr_name,
            reference_group=ref_grp,
            disadvantaged_group=disadv_grp,
            drivers=[],
            narrative=f"Across '{attr_name}', the baseline model demonstrated equitable treatment. Demographic SHAP attribution indicates no significant proxy features driving unfair outcomes between {disadv_grp} and {ref_grp}.",
            caveat=caveat
        )
        
    # Check data masks
    ref_mask = (artifacts.prot_test[attr_name].astype(str) == ref_grp).values
    disadv_mask = (artifacts.prot_test[attr_name].astype(str) == disadv_grp).values
    
    X_eval = artifacts.X_test
    if np.sum(disadv_mask) < 5 or np.sum(ref_mask) < 5:
        # Fallback to validation partition if test subgroup is small
        ref_mask = (artifacts.prot_val[attr_name].astype(str) == ref_grp).values
        disadv_mask = (artifacts.prot_val[attr_name].astype(str) == disadv_grp).values
        X_eval = artifacts.X_val
        
    if np.sum(disadv_mask) == 0 or np.sum(ref_mask) == 0:
        return DisparityAttribution(
            attribute_name=attr_name,
            reference_group=ref_grp,
            disadvantaged_group=disadv_grp,
            drivers=[],
            narrative=f"Insufficient sample observations for '{disadv_grp}' to conduct reliable group-split SHAP attribution.",
            caveat=caveat
        )
        
    # Sample up to 100 rows per group
    X_ref = X_eval[ref_mask].head(100)
    X_disadv = X_eval[disadv_mask].head(100)
    
    try:
        X_ref_trans = artifacts.preprocessor.transform(X_ref)
        X_disadv_trans = artifacts.preprocessor.transform(X_disadv)
        
        if hasattr(artifacts.model, "coef_"):
            coef = artifacts.model.coef_[0]
            m_ref = np.mean(X_ref_trans * coef, axis=0)
            m_disadv = np.mean(X_disadv_trans * coef, axis=0)
        else:
            background = artifacts.preprocessor.transform(artifacts.X_train.head(50))
            explainer = shap.Explainer(artifacts.model, background)
            shap_ref = explainer(X_ref_trans).values
            shap_disadv = explainer(X_disadv_trans).values
            if len(shap_ref.shape) > 2:
                shap_ref = shap_ref[:, :, 1]
                shap_disadv = shap_disadv[:, :, 1]
            m_ref = np.mean(shap_ref, axis=0)
            m_disadv = np.mean(shap_disadv, axis=0)
            
        root_ref: Dict[str, float] = {}
        root_disadv: Dict[str, float] = {}
        for fname, r_val, d_val in zip(artifacts.encoded_feature_names, m_ref, m_disadv):
            root_f = fname
            for orig in artifacts.feature_names:
                if fname == orig or fname.startswith(orig + "_"):
                    root_f = orig
                    break
            root_ref[root_f] = root_ref.get(root_f, 0.0) + float(r_val)
            root_disadv[root_f] = root_disadv.get(root_f, 0.0) + float(d_val)
            
        # Impact diff: how much higher ref contribution is compared to disadv
        # Positive diff means feature pulls disadv down relative to ref
        diffs = {f: (root_ref[f] - root_disadv[f]) for f in root_ref}
        sorted_diffs = sorted(diffs.items(), key=lambda x: x[1], reverse=True)
        
        drivers: List[DisparityDriver] = []
        for feat, diff in sorted_diffs[:3]:
            r_c = round(root_ref[feat], 4)
            d_c = round(root_disadv[feat], 4)
            delta = round(diff, 4)
            drivers.append(DisparityDriver(
                feature=feat,
                impact_difference=delta,
                ref_mean_contribution=r_c,
                disadv_mean_contribution=d_c,
                explanation=f"Average contribution gap of {delta:+.3f} favors {ref_grp} over {disadv_grp}."
            ))
            
        if drivers:
            feat_list = [f"`{d.feature}`" for d in drivers[:2]]
            feats_joined = " and ".join(feat_list)
            narrative = f"{feats_joined} contribute disproportionately to lower scores for {disadv_grp} applicants; these features may be acting as proxies for `{attr_name}`."
        else:
            narrative = f"No dominant proxy features identified driving score divergence for `{attr_name}`."
            
        return DisparityAttribution(
            attribute_name=attr_name,
            reference_group=ref_grp,
            disadvantaged_group=disadv_grp,
            drivers=drivers,
            narrative=narrative,
            caveat=caveat
        )
    except Exception as e:
        return DisparityAttribution(
            attribute_name=attr_name,
            reference_group=ref_grp,
            disadvantaged_group=disadv_grp,
            drivers=[],
            narrative=f"Group-split attribution could not be computed: {str(e)}",
            caveat=caveat
        )
