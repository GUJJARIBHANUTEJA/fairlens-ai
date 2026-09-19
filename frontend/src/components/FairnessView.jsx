import React, { useState } from 'react';
import { 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Users
} from 'lucide-react';

export default function FairnessView({ auditData, setActiveTab, onBackToDatasets }) {
  if (!auditData) return null;

  const { fairness_audit, dataset_name } = auditData;
  const findings = fairness_audit.findings || [];

  const [selectedAttrIndex, setSelectedAttrIndex] = useState(0);
  const activeAudit = findings[selectedAttrIndex] || findings[0];

  if (!activeAudit) return null;

  const isConcern = activeAudit.bias_found || activeAudit.severity_status === "Potential Fairness Concern";
  const overallConcern = fairness_audit.bias_found || fairness_audit.overall_status === "Potential Fairness Concern";
  const verdictText = activeAudit.verdict || activeAudit.explanation;

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 mb-3">
            <span>Step 3 of 6</span>
            <span>•</span>
            <span>Fairness Audit</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
            <Scale className="w-6 h-6 text-accent" />
            <span>Algorithmic Fairness Audit</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Evaluating whether the baseline model provides equal treatment across protected demographic groups.
          </p>
        </div>

        {/* Global Status Pill */}
        <div className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center space-x-2 ${
          overallConcern
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current"></span>
          <span>
            {fairness_audit.headline_verdict || (overallConcern ? 'Fairness Concern Detected' : 'No Bias Detected')}
          </span>
        </div>
      </div>

      {/* Protected Attribute Selector (if multiple) */}
      {findings.length > 1 && (
        <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
          {findings.map((f, idx) => {
            const isSelected = selectedAttrIndex === idx;
            const flag = f.bias_found || f.severity_status === "Potential Fairness Concern";
            return (
              <button
                key={f.attribute_name}
                onClick={() => setSelectedAttrIndex(idx)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span>{f.attribute_name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${flag ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </button>
            );
          })}
        </div>
      )}

      {/* Audit Card for Selected Attribute */}
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-6">
        {/* Attribute & Status Banner */}
        <div className={`p-4 rounded-lg border flex items-start space-x-3.5 ${
          isConcern
            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
        }`}>
          {isConcern ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                Finding Verdict: {activeAudit.attribute_name}
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                isConcern ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              }`}>
                {isConcern ? 'FAIL' : 'PASS'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed pt-1">
              {verdictText}
            </p>
          </div>
        </div>

        {/* Structured Quantitative Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Disparate Impact</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {activeAudit.disparate_impact !== null && activeAudit.disparate_impact !== undefined ? activeAudit.disparate_impact.toFixed(2) : 'N/A'}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Threshold: ≥ 0.80</span>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Selection Rates</span>
            <div className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
              {activeAudit.selection_rate_disadvantaged !== null && activeAudit.selection_rate_disadvantaged !== undefined ? `${(activeAudit.selection_rate_disadvantaged * 100).toFixed(1)}%` : 'N/A'}
              <span className="text-zinc-400 font-normal"> vs </span>
              {activeAudit.selection_rate_reference !== null && activeAudit.selection_rate_reference !== undefined ? `${(activeAudit.selection_rate_reference * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Disadv vs Ref</span>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">TPR Gap (Equal Opp)</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {activeAudit.tpr_gap !== null && activeAudit.tpr_gap !== undefined ? `${(activeAudit.tpr_gap * 100).toFixed(1)}%` : (activeAudit.tpr_difference !== null && activeAudit.tpr_difference !== undefined ? `${(activeAudit.tpr_difference * 100).toFixed(1)}%` : 'N/A')}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Tolerance: ±10%</span>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">FPR Gap</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {activeAudit.fpr_gap !== null && activeAudit.fpr_gap !== undefined ? `${(activeAudit.fpr_gap * 100).toFixed(1)}%` : (activeAudit.fpr_difference !== null && activeAudit.fpr_difference !== undefined ? `${(activeAudit.fpr_difference * 100).toFixed(1)}%` : 'N/A')}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Tolerance: ±10%</span>
          </div>
        </div>

        {/* Groups Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Protected Attribute */}
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
              Protected Attribute
            </span>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {activeAudit.attribute_name}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
              Evaluated demographic characteristic
            </p>
          </div>

          {/* Subgroups Evaluated */}
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-2">
            <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
              Groups Evaluated
            </span>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Reference Group:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                  {activeAudit.reference_group}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Disadvantaged Group:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                  {activeAudit.disadvantaged_group || activeAudit.primary_comparison_group}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveTab('model')}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back: Model</span>
        </button>

        <button
          onClick={() => setActiveTab('mitigation')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Next: Bias Mitigation →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}