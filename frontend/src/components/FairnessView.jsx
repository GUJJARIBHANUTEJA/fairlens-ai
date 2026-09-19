import React, { useState } from 'react';
import { 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Users,
  ChevronDown
} from 'lucide-react';

export default function FairnessView({ auditData, setActiveTab, onBackToDatasets }) {
  const [selectedAttrIndex, setSelectedAttrIndex] = useState(0);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  if (!auditData) return null;

  const { fairness_audit, dataset_name } = auditData;
  const findings = fairness_audit?.findings || [];
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
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-5">
        
        {/* Header Bar: Attribute name, Reference / Disadvantaged Group, Verdict Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Protected Attribute:
              </span>
              <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {activeAudit.attribute_name}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs mt-1 text-zinc-500 dark:text-zinc-400 font-mono">
              <span>Reference: <strong className="text-zinc-800 dark:text-zinc-200">{activeAudit.reference_group}</strong></span>
              <span>•</span>
              <span>Disadvantaged: <strong className="text-zinc-800 dark:text-zinc-200">{activeAudit.disadvantaged_group || activeAudit.primary_comparison_group}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
              isConcern
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
            }`}>
              {isConcern ? 'FAIL' : 'PASS'}
            </span>
          </div>
        </div>

        {/* The ONE headline sentence naming the groups and the magnitude */}
        <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
          isConcern
            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
        }`}>
          {isConcern ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-xs sm:text-sm font-medium leading-relaxed">
            {verdictText}
          </p>
        </div>

        {/* ONE primary number: Disparate Impact with threshold shown inline */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider block">
              Primary Metric: Disparate Impact Ratio
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {activeAudit.disparate_impact !== null && activeAudit.disparate_impact !== undefined
                  ? activeAudit.disparate_impact.toFixed(2)
                  : 'N/A'}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                — threshold ≥ {(activeAudit.thresholds_used?.disparate_impact_pass || 0.80).toFixed(2)}
              </span>
            </div>
          </div>
          <span className={`text-xs font-mono px-2.5 py-1 rounded self-start sm:self-auto ${
            activeAudit.passes_disparate_impact
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            {activeAudit.passes_disparate_impact ? 'Meets Threshold' : 'Fails Threshold'}
          </span>
        </div>

        {/* Collapsible Section: Show detailed metrics (closed by default) */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
            className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetailedMetrics ? 'rotate-180' : ''}`} />
            <span>{showDetailedMetrics ? 'Hide detailed metrics' : 'Show detailed metrics (selection rates, TPR, FPR)'}</span>
          </button>

          {showDetailedMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Selection Rates</span>
                <div className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                  {activeAudit.selection_rate_disadvantaged !== null && activeAudit.selection_rate_disadvantaged !== undefined ? `${(activeAudit.selection_rate_disadvantaged * 100).toFixed(1)}%` : 'N/A'}
                  <span className="text-zinc-400 font-normal"> vs </span>
                  {activeAudit.selection_rate_reference !== null && activeAudit.selection_rate_reference !== undefined ? `${(activeAudit.selection_rate_reference * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Disadv vs Ref</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">TPR Gap (Equal Opp)</span>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {activeAudit.tpr_gap !== null && activeAudit.tpr_gap !== undefined ? `${(activeAudit.tpr_gap * 100).toFixed(1)}%` : (activeAudit.tpr_difference !== null && activeAudit.tpr_difference !== undefined ? `${(activeAudit.tpr_difference * 100).toFixed(1)}%` : 'N/A')}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Tolerance: ±{(activeAudit.thresholds_used?.tpr_fpr_gap_pass ? activeAudit.thresholds_used.tpr_fpr_gap_pass * 100 : 10).toFixed(0)}%</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">FPR Gap</span>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {activeAudit.fpr_gap !== null && activeAudit.fpr_gap !== undefined ? `${(activeAudit.fpr_gap * 100).toFixed(1)}%` : (activeAudit.fpr_difference !== null && activeAudit.fpr_difference !== undefined ? `${(activeAudit.fpr_difference * 100).toFixed(1)}%` : 'N/A')}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Tolerance: ±{(activeAudit.thresholds_used?.tpr_fpr_gap_pass ? activeAudit.thresholds_used.tpr_fpr_gap_pass * 100 : 10).toFixed(0)}%</span>
              </div>
            </div>
          )}
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