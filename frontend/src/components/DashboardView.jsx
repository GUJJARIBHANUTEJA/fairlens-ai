import React, { useRef } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Scale, 
  ShieldAlert, 
  TrendingUp,
  FileCheck,
  Zap,
  BarChart3,
  Layers
} from 'lucide-react';

export default function DashboardView({ 
  auditData, 
  onUploadFile, 
  onSelectSample, 
  sampleDatasets, 
  isLoading, 
  setActiveTab,
  onBackToDatasets
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  if (!auditData) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Zero Manual Configuration Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Autonomous AI Fairness & Model Auditing
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
            FairLens automatically profiles your dataset, identifies target outcomes and protected demographic attributes, audits algorithmic disparity, optimizes mitigation, and explains model behavior.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 bg-white dark:bg-[#0f1011] group"
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
          <h3 className="mt-4 text-base font-medium text-zinc-900 dark:text-zinc-100">
            Upload CSV dataset to audit
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Drag and drop your file here, or click to browse. Target, sensitive attributes, and reference groups will be auto-detected.
          </p>
          <div className="mt-4 inline-flex items-center space-x-2 text-xs font-mono text-zinc-400">
            <span>Supports standard tabular CSV format</span>
          </div>
        </div>

        {/* In-Build Bundled Datasets */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                In-Build Datasets
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                Bundled datasets from <code className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">datasets/</code> directory
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {sampleDatasets.length} available
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
                    {s.columns_count ? (
                      <span className="text-[11px] font-mono text-zinc-400">
                        • {s.columns_count} columns
                      </span>
                    ) : null}
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
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
                  >
                    <span>Audit →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Audit Dashboard View
  const { 
    dataset_name, 
    profile, 
    detection, 
    baseline_performance, 
    fairness_audit, 
    mitigation 
  } = auditData;

  const isConcern = fairness_audit.overall_status === "Potential Fairness Concern";
  const primaryFinding = fairness_audit.findings[0];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Action Bar: Back to Datasets */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={onBackToDatasets}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shadow-sm"
        >
          <span>← Back to Datasets</span>
        </button>
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          Auditing: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dataset_name}</span>
        </span>
      </div>

      {/* Executive Status Banner */}
      <div className={`p-5 rounded-lg border transition-colors ${
        isConcern
          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
          : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {isConcern ? (
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  Audit Status: {fairness_audit.overall_status}
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/60 dark:bg-black/40 border border-current">
                  {detection.selected_protected_attributes.length} Attribute(s) Audited
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {fairness_audit.summary_explanation}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('fairness')}
            className="flex-shrink-0 ml-4 inline-flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            <span>View Audit</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Baseline Accuracy */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span>Model Performance</span>
            <span className="capitalize">{baseline_performance.model_type.replace('_', ' ')}</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {(baseline_performance.accuracy * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">Accuracy</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>F1: {baseline_performance.f1.toFixed(3)}</span>
            <span>Test N={baseline_performance.test_samples}</span>
          </div>
        </div>

        {/* Primary Disparate Impact */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span>Disparate Impact</span>
            <span>80% Rule</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-semibold tracking-tight ${
              primaryFinding && primaryFinding.disparate_impact && primaryFinding.disparate_impact < 0.80
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}>
              {primaryFinding?.disparate_impact ? primaryFinding.disparate_impact.toFixed(2) : 'N/A'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              vs Ref ({primaryFinding?.reference_group || 'N/A'})
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span className="truncate max-w-[150px]">Attr: {primaryFinding?.attribute_name}</span>
            <span className={primaryFinding?.passes_disparate_impact ? 'text-emerald-500' : 'text-amber-500'}>
              {primaryFinding?.passes_disparate_impact ? 'Pass' : 'Flagged'}
            </span>
          </div>
        </div>

        {/* Parity Difference (Equal Opportunity) */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span>Equal Opportunity</span>
            <span>TPR Gap</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {primaryFinding?.tpr_difference !== null && primaryFinding?.tpr_difference !== undefined
                ? `${(primaryFinding.tpr_difference * 100).toFixed(1)}%`
                : 'N/A'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">TPR Gap</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>Tolerance: ±10%</span>
            <span className={primaryFinding?.passes_tpr_parity ? 'text-emerald-500' : 'text-amber-500'}>
              {primaryFinding?.passes_tpr_parity ? 'Pass' : 'Flagged'}
            </span>
          </div>
        </div>

        {/* Mitigation Status */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span>Mitigation Status</span>
            <span>Post-Process</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {mitigation.mitigation_status}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>DI Δ: {mitigation.fairness_delta.disparate_impact ? `${mitigation.fairness_delta.disparate_impact > 0 ? '+' : ''}${mitigation.fairness_delta.disparate_impact.toFixed(2)}` : '0.00'}</span>
            <button 
              onClick={() => setActiveTab('mitigation')}
              className="text-accent hover:underline font-medium"
            >
              Details →
            </button>
          </div>
        </div>

      </div>

      {/* Auto-Discovered Pipeline Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Discovered Roles & Targets */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Autonomous Role Inferences
            </h3>
            <span className="text-xs text-accent font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('dataset')}>
              Inspect Dataset →
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Detected Target:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {detection.selected_target} ({(detection.target_confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Positive Outcome Class: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{String(detection.positive_class)}</span>
              </div>
            </div>

            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Audited Sensitive Attributes:</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  {detection.selected_protected_attributes.join(", ")}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Reference Baselines: {Object.entries(detection.reference_groups).map(([k, v]) => `${k} → ${v}`).join("; ")}
              </div>
            </div>

            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Data Dimensions:</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  {profile.row_count.toLocaleString()} rows × {profile.column_count} columns
                </span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Exclusions: {profile.id_columns.length} ID, {profile.pii_columns.length} PII, {profile.constant_columns.length} Constant
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Attribute Severity Ranking */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Ranked Demographic Findings
            </h3>
            <span className="text-xs text-accent font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('fairness')}>
              Full Matrix →
            </span>
          </div>

          <div className="space-y-2.5">
            {fairness_audit.findings.map((f, idx) => {
              const isFlagged = f.severity_status === "Potential Fairness Concern";
              return (
                <div
                  key={f.attribute_name}
                  className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-semibold text-zinc-700 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                        <span>{f.attribute_name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isFlagged
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {f.severity_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Comp: {f.primary_comparison_group} vs Ref: {f.reference_group}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      DI: {f.disparate_impact ? f.disparate_impact.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      TPR Δ: {f.tpr_difference !== null && f.tpr_difference !== undefined ? `${(f.tpr_difference * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
