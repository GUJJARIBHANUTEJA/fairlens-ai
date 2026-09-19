import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  Database, 
  Target, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Lock,
  UserCheck,
  FileText,
  ChevronDown
} from 'lucide-react';

export default function DatasetView({ 
  auditData, 
  onUploadFile, 
  onSelectSample, 
  sampleDatasets = [], 
  isLoading, 
  setActiveTab, 
  onBackToDatasets 
}) {
  const fileInputRef = useRef(null);
  const [expandedGov, setExpandedGov] = useState({ sensitive: false, pii: false, id: false });
  const toggleGov = (key) => setExpandedGov(prev => ({ ...prev, [key]: !prev[key] }));

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  // State 1: No dataset selected yet - Show Upload and In-Build Datasets
  if (!auditData) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            <span>Step 1 of 6</span>
            <span>•</span>
            <span>Dataset Selection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Select or Upload Dataset
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Choose a bundled benchmark dataset or upload your own CSV. FairLens will automatically detect targets and protected demographic attributes.
          </p>
        </div>

        {/* 1. Upload CSV Dataset */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 bg-white dark:bg-[#0f1011] group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUploadFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
            accept=".csv"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-600 dark:text-zinc-300 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            1. Upload CSV Dataset
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Click to browse or drag and drop your tabular CSV file here.
          </p>
        </div>

        {/* 2. Available In-Build Datasets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              2. Available In-Build Datasets
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {sampleDatasets.length} benchmark datasets
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] overflow-hidden">
            {sampleDatasets.map((s) => (
              <div
                key={s.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.name}
                    </h4>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {s.filename}
                    </span>
                    {s.size_formatted && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        {s.size_formatted}
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => onSelectSample(s.id)}
                    disabled={isLoading}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
                  >
                    <span>Run Fairness Audit →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Dataset loaded - Show ONLY Detected Target, Detected Sensitive Attributes, Sensitive & PII, and Run button
  const { profile, detection, dataset_name } = auditData;
  const sensitiveAttrs = detection?.selected_protected_attributes || [];
  const piiCols = profile?.pii_columns || [];
  const idCols = profile?.id_columns || [];

  const targetCandidate = detection?.target_candidates?.find(c => c.column === detection?.selected_target) || detection?.target_candidates?.[0];
  const targetReason = targetCandidate?.reason || "Column identified as primary prediction outcome variable.";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Bar: Back to Datasets */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
        {onBackToDatasets && (
          <button
            onClick={onBackToDatasets}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Datasets</span>
          </button>
        )}
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          Dataset: <strong className="text-zinc-800 dark:text-zinc-200">{dataset_name}</strong>
        </span>
      </div>

      {/* Step Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 mb-3">
          <span>Step 1 of 6</span>
          <span>•</span>
          <span>Dataset & Attributes</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
          <Database className="w-6 h-6 text-accent" />
          <span>Dataset Summary & Inferred Roles</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          FairLens automatically identified target outcomes and protected demographic attributes without requiring manual mapping.
        </p>
      </div>

      {/* Main Content: Detected Target & Detected Sensitive Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Detected Target */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                1. Detected Target
              </h3>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {(detection.target_confidence * 100).toFixed(0)}% confidence
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-2">
            <div>
              <div className="text-xs text-zinc-500">Target Column:</div>
              <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                {detection.selected_target}
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Reason: </span>
              {targetReason}
            </p>
            <div className="pt-1 text-xs text-zinc-500 flex items-center space-x-2">
              <span>Positive Outcome Class:</span>
              <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                {String(detection.positive_class)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Detected Sensitive/Protected Attributes */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                2. Protected Attributes
              </h3>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {sensitiveAttrs.length} detected
            </span>
          </div>

          <div className="space-y-2">
            {(detection?.protected_attribute_candidates || []).map((p) => (
              <div
                key={p.column}
                className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {p.column}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Baseline: <strong className="text-zinc-800 dark:text-zinc-200">{p.recommended_reference_group}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.detected_groups.map((grp) => (
                    <span
                      key={grp}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    >
                      {grp}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Feature Segregation & Governance: Short counts with expander */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Feature Segregation & Governance
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            FairLens enforces strict feature boundaries to ensure fair auditing and data privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Sensitive Attributes */}
          <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                Sensitive Attributes
              </span>
              {sensitiveAttrs.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGov('sensitive')}
                  className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-dotted transition-colors"
                >
                  {expandedGov.sensitive ? 'Hide list' : 'View list'}
                </button>
              )}
            </div>
            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {sensitiveAttrs.length} {sensitiveAttrs.length === 1 ? 'column' : 'columns'}
            </div>
            {expandedGov.sensitive && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {sensitiveAttrs.map(col => (
                  <span key={col} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {col}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              Kept separate for auditing; excluded from training features.
            </p>
          </div>

          {/* Personally Identifiable Information */}
          <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                PII Detected
              </span>
              {piiCols.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGov('pii')}
                  className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-dotted transition-colors"
                >
                  {expandedGov.pii ? 'Hide list' : 'View list'}
                </button>
              )}
            </div>
            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {piiCols.length} {piiCols.length === 1 ? 'column' : 'columns'}
            </div>
            {expandedGov.pii && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {piiCols.map(col => (
                  <span key={col} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {col}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              Direct personal identifiers excluded from model training.
            </p>
          </div>

          {/* Identifier Columns */}
          <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                IDs Excluded
              </span>
              {idCols.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGov('id')}
                  className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline decoration-dotted transition-colors"
                >
                  {expandedGov.id ? 'Hide list' : 'View list'}
                </button>
              )}
            </div>
            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {idCols.length} {idCols.length === 1 ? 'column' : 'columns'}
            </div>
            {expandedGov.id && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {idCols.map(col => (
                  <span key={col} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {col}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              Row keys and database identifiers excluded from predictive features.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Simple Action Button to proceed */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={onBackToDatasets}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <span>← Choose Different Dataset</span>
        </button>

        <button
          onClick={() => setActiveTab('model')}
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Next: Model Evaluation →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}