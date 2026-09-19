import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Sliders,
  ChevronDown
} from 'lucide-react';

export default function MitigationView({ auditData, setActiveTab, onBackToDatasets }) {
  const [showAdditionalMetrics, setShowAdditionalMetrics] = useState(false);

  if (!auditData) return null;

  const { mitigation, fairness_audit, dataset_name } = auditData;

  const comparisonRows = mitigation.comparison_table || [];
  const thresholdsAfter = mitigation.thresholds_after || {};
  const thresholdsBefore = mitigation.thresholds_before || {};

  // Check if FPR gap actually failed in baseline
  const fprFailed = Boolean(
    mitigation.baseline_fairness && !mitigation.baseline_fairness.passes_fpr_parity
  );

  const trimmedRows = comparisonRows.filter(row => {
    const m = row.metric.toLowerCase();
    if (m.includes('disparate impact') || m.includes('tpr gap') || m.includes('accuracy') || m.includes('f1')) {
      return true;
    }
    if (m.includes('fpr gap')) {
      return fprFailed;
    }
    return false;
  });

  const additionalRows = comparisonRows.filter(row => {
    const m = row.metric.toLowerCase();
    if (m.includes('fpr gap') && !fprFailed) {
      return true;
    }
    return false;
  });

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
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 mb-3">
          <span>Step 4 of 6</span>
          <span>•</span>
          <span>Bias Mitigation</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <span>Algorithmic Bias Mitigation & Threshold Calibration</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Quantifying the exact numeric actions taken and before/after fairness outcomes on the identical held-out test split.
        </p>
      </div>

      {/* 1. Mitigation Summary Sentence (kept as-is) */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Mitigation Summary & Trade-Off
        </span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
          {mitigation.quantified_headline || mitigation.trade_off_summary}
        </p>
      </div>

      {/* 2. Trimmed Before / After Comparison Table */}
      {trimmedRows.length > 0 && (
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-semibold">
                Before / After Performance & Fairness Evaluation
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Identical Test Split (N={mitigation.mitigated_performance?.test_samples || 0})
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">Metric</th>
                  <th className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">Before</th>
                  <th className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">After</th>
                  <th className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">Change</th>
                  <th className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#0f1011]">
                {trimmedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-3.5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{row.metric}</td>
                    <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-400">{row.before}</td>
                    <td className="px-3.5 py-2.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{row.after}</td>
                    <td className="px-3.5 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">{row.change}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        row.verdict.includes('PASS') || row.verdict === 'improved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : (row.verdict === 'preserved'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20')
                      }`}>
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Collapsed Section for Additional Metrics (FPR Gap if passed) */}
          {additionalRows.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdditionalMetrics(!showAdditionalMetrics)}
                className="inline-flex items-center space-x-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdditionalMetrics ? 'rotate-180' : ''}`} />
                <span>{showAdditionalMetrics ? 'Hide additional metrics' : 'Show additional metrics (FPR gap)'}</span>
              </button>

              {showAdditionalMetrics && (
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 mt-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#0f1011]">
                      {additionalRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{row.metric}</td>
                          <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-400">{row.before}</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{row.after}</td>
                          <td className="px-3.5 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">{row.change}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {row.verdict}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Learned Threshold Values (kept visible, not collapsed) */}
      {mitigation.mitigation_required && Object.keys(thresholdsAfter).length > 0 ? (
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Concrete Mitigation Action Taken
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Per-Group Decision Threshold Calibration (Learned on Validation Set)
            </h3>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {mitigation.mitigation_action_rationale}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {Object.entries(thresholdsAfter).map(([grp, tAfter]) => {
              const tBefore = thresholdsBefore[grp] !== undefined ? thresholdsBefore[grp] : 0.50;
              const delta = tAfter - tBefore;
              return (
                <div key={grp} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">{grp}</span>
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-zinc-400">{tBefore.toFixed(2)}</span>
                    <span className="text-zinc-400">→</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{tAfter.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)} shift` : '0.00 (Unchanged)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Action: </span>
          Baseline already satisfies configured fairness thresholds. No decision boundary adjustments were required.
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveTab('fairness')}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back: Fairness Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('explain')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Next: Explain →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}