const API_BASE = "http://localhost:8000/api";

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function runAutoAudit(datasetId) {
  const res = await fetch(`${API_BASE}/auto-audit/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Automatic audit failed");
  }
  return res.json();
}

export async function runAuditOverride(overrideData) {
  const res = await fetch(`${API_BASE}/audit-override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(overrideData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Audit override failed");
  }
  return res.json();
}

export async function fetchSampleDatasets() {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error("Failed to load sample datasets");
  return res.json();
}

export async function runSampleAutoAudit(sampleName) {
  const res = await fetch(`${API_BASE}/samples/${sampleName}/auto-audit`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Sample audit failed");
  }
  return res.json();
}

export async function predictSingle(datasetId, inputData) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, input_data: inputData }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Prediction failed");
  }
  return res.json();
}

export async function fetchReport(datasetId) {
  const res = await fetch(`${API_BASE}/report/${datasetId}`);
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}
