import io
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, File, HTTPException, UploadFile
import pandas as pd

from backend.app.config import settings
from backend.app.schemas import (
    AuditOverrideRequest,
    DatasetProfile,
    DetectionSummary,
    FullAuditResponse,
    PredictionRequest,
    PredictionResponse
)
from backend.app.services.audit_engine import SESSION_STORE, run_automatic_audit
from backend.app.services.detection import detect_dataset_roles
from backend.app.services.explainability import (
    XAI_DISCLAIMER,
    explain_local_sample
)
from backend.app.services.profiling import profile_dataset
from backend.app.services.sample_datasets import ensure_sample_datasets

router = APIRouter(prefix="/api", tags=["FairLens API"])

# Cache raw uploaded dataframes before audit
UPLOAD_DATA_CACHE: Dict[str, Tuple[str, pd.DataFrame]] = {}

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Uploads a CSV file, performs initial profiling, and detects candidate column roles."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV datasets are supported.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    if df.empty or df.shape[0] < 10:
        raise HTTPException(status_code=400, detail="Dataset must contain at least 10 rows.")
        
    dataset_id = str(uuid.uuid4())[:8]
    dataset_name = file.filename
    
    # Save CSV locally
    save_path = settings.UPLOAD_DIR / f"{dataset_id}_{dataset_name}"
    df.to_csv(save_path, index=False)
    
    # Profile & Detect
    profile = profile_dataset(df)
    detection = detect_dataset_roles(df, profile)
    
    UPLOAD_DATA_CACHE[dataset_id] = (dataset_name, df)
    
    # Also preview first 10 rows
    preview_rows = df.head(10).replace({float("nan"): None}).to_dict(orient="records")
    
    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "profile": profile,
        "detection": detection,
        "preview_rows": preview_rows
    }

@router.post("/auto-audit/{dataset_id}", response_model=FullAuditResponse)
async def auto_audit(dataset_id: str) -> FullAuditResponse:
    """Runs the 1-click end-to-end automatic fairness audit pipeline."""
    if dataset_id not in UPLOAD_DATA_CACHE and dataset_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Dataset ID not found. Please upload a dataset first.")
        
    if dataset_id in UPLOAD_DATA_CACHE:
        dataset_name, df = UPLOAD_DATA_CACHE[dataset_id]
    else:
        full_res, _, df = SESSION_STORE[dataset_id]
        dataset_name = full_res.dataset_name
        
    response, _ = run_automatic_audit(
        df=df,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        overrides=None
    )
    return response

@router.post("/audit-override", response_model=FullAuditResponse)
async def audit_override(req: AuditOverrideRequest) -> FullAuditResponse:
    """Re-runs the audit with optional user overrides (e.g. customized target or reference group)."""
    dataset_id = req.dataset_id
    if dataset_id not in UPLOAD_DATA_CACHE and dataset_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Dataset ID not found.")
        
    if dataset_id in UPLOAD_DATA_CACHE:
        dataset_name, df = UPLOAD_DATA_CACHE[dataset_id]
    else:
        full_res, _, df = SESSION_STORE[dataset_id]
        dataset_name = full_res.dataset_name
        
    response, _ = run_automatic_audit(
        df=df,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        overrides=req
    )
    return response

@router.get("/samples")
async def list_sample_datasets() -> List[Dict[str, Any]]:
    """Lists real bundled datasets available in the datasets/ directory for auditing."""
    datasets_list = []
    
    # Real datasets dynamically discovered from settings.DATASET_DIR (datasets/)
    if settings.DATASET_DIR.exists():
        for f in sorted(settings.DATASET_DIR.glob("*.csv")):
            file_id = f.stem.lower().replace(" ", "_").replace("-", "_")
            raw_title = f.stem.replace("_", " ").replace("-", " ")
            clean_title = re.sub(r'([a-z])([A-Z])', r'\1 \2', raw_title)
            file_title = " ".join(word.capitalize() for word in clean_title.split())

            size_bytes = f.stat().st_size
            size_kb = size_bytes / 1024
            if size_kb >= 1024:
                size_str = f"{size_kb / 1024:.1f} MB"
            else:
                size_str = f"{size_kb:.0f} KB"
                
            try:
                col_count = len(pd.read_csv(f, nrows=0).columns)
            except Exception:
                col_count = 0

            # Tailor description for each in-build dataset
            if "student" in file_id:
                desc = "Student academic performance and exam outcomes across demographic groups."
            elif "recrutment" in file_id or "recruitment" in file_id:
                desc = "Candidate hiring evaluations and qualification criteria across demographic attributes."
            elif "loan" in file_id:
                desc = "Credit underwriting decisions across applicant race and gender demographics."
            else:
                desc = f"Tabular dataset ({col_count} columns, {size_str}) from datasets/ directory."

            datasets_list.append({
                "id": file_id,
                "name": file_title,
                "filename": f.name,
                "size_bytes": size_bytes,
                "size_formatted": size_str,
                "columns_count": col_count,
                "is_real": True,
                "description": desc,
            })
            
    return datasets_list

@router.post("/samples/{name}/auto-audit", response_model=FullAuditResponse)
async def auto_audit_sample(name: str) -> FullAuditResponse:
    """Loads a real or pre-bundled benchmark dataset and executes the complete automatic audit pipeline."""
    target_path = None
    
    # Check in datasets/ folder
    if settings.DATASET_DIR.exists():
        for f in settings.DATASET_DIR.glob("*.csv"):
            if (f.stem.lower().replace(" ", "_").replace("-", "_") == name.lower().replace(" ", "_").replace("-", "_")
                or f.name.lower() == name.lower() 
                or f.stem.lower() == name.lower()):
                target_path = f
                break
                
    # Check in sample_datasets if not found in datasets/
    if target_path is None:
        samples = ensure_sample_datasets()
        if name in samples:
            target_path = samples[name]
            
    if target_path is None or not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found.")
        
    df = pd.read_csv(target_path)
    # If massive dataset (> 25,000 rows), sample 20,000 rows for responsive API latency
    if len(df) > 25000:
        df = df.sample(n=20000, random_state=42).reset_index(drop=True)
        
    dataset_id = f"ds_{name}"
    dataset_name = target_path.name
    
    UPLOAD_DATA_CACHE[dataset_id] = (dataset_name, df)
    
    response, _ = run_automatic_audit(
        df=df,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        overrides=None
    )
    return response

@router.post("/predict", response_model=PredictionResponse)
async def predict_single(req: PredictionRequest) -> PredictionResponse:
    """Generates an individual prediction with baseline and mitigated thresholds plus SHAP/LIME explanations."""
    if req.dataset_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Active pipeline not found for this dataset. Run an audit first.")
        
    full_res, artifacts, _ = SESSION_STORE[req.dataset_id]
    
    # Format input into single-row dataframe
    sample_df = pd.DataFrame([req.input_data])
    for f in artifacts.feature_names:
        if f not in sample_df.columns:
            sample_df[f] = 0.0
            
    sample_df = sample_df[artifacts.feature_names]
    
    try:
        sample_trans = artifacts.preprocessor.transform(sample_df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing failed on input data: {str(e)}")
        
    classes_list = list(artifacts.model.classes_)
    pos_idx = classes_list.index(1) if 1 in classes_list else -1
    
    if hasattr(artifacts.model, "predict_proba"):
        prob = float(artifacts.model.predict_proba(sample_trans)[0, pos_idx])
    else:
        dfunc = float(artifacts.model.decision_function(sample_trans)[0])
        prob = float(1 / (1 + np.exp(-dfunc)))
        
    # Baseline prediction at 0.50
    baseline_pred = int(prob >= 0.50)
    
    # Mitigated prediction using learned group threshold
    primary_attr = full_res.mitigation.primary_attribute
    group_val = str(req.input_data.get(primary_attr, "Unknown"))
    mit_thresh = full_res.mitigation.learned_thresholds.get(group_val, 0.50)
    mit_pred = int(prob >= mit_thresh)
    
    # Local XAI
    shap_c, lime_c = explain_local_sample(artifacts, req.input_data)
    
    return PredictionResponse(
        predicted_class=baseline_pred,
        probability=round(prob, 4),
        threshold_used=0.50,
        mitigated_predicted_class=mit_pred,
        mitigated_probability=round(prob, 4),
        mitigated_threshold=round(mit_thresh, 3),
        shap_contributions=shap_c,
        lime_contributions=lime_c,
        disclaimer=XAI_DISCLAIMER
    )

@router.get("/report/{dataset_id}")
async def get_report(dataset_id: str) -> Dict[str, Any]:
    """Fetches the markdown audit report for a dataset."""
    if dataset_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Dataset report not found.")
        
    full_res, _, _ = SESSION_STORE[dataset_id]
    return {
        "dataset_id": dataset_id,
        "dataset_name": full_res.dataset_name,
        "report_markdown": full_res.report_markdown,
        "overall_status": full_res.fairness_audit.overall_status,
        "mitigation_status": full_res.mitigation.mitigation_status
    }
