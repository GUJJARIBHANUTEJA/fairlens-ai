import React from 'react';
import { 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

export default function MitigationView({ auditData, onBackToDatasets }) {
  if (!auditData) return null;

  const { mitigation, fairness_audit } = auditData;
  const { 
    baseline_performance: basePerf, 
    mitigated_performance: mitPerf, 
    baseline_fairness: baseFair, 
    mitigated_fairness: mitFair,
    performance_delta: perfDelta,
    fairness_delta: fairDelta,
    learned_thresholds: thresholds
  } = mitigation;

  const isImproved = mitigation.mitigation_status === "Fairness improved";
  const noMitNeeded = mitigation.mitigation_status === "No mitigation required";

  // Dynamic interpretation of before vs after
  const accDiff = mitPerf.accuracy - basePerf.accuracy;
  const accDiffPoints = Math.abs(accDiff * 100).toFixed(1);
  const diImproved = mitFair.disparate_impact !== null && baseFair.disparate_impact !== null && mitFair.disparate_impact > baseFair.disparate_impact;

  let dynamicInterpretation = '';

  if (!mitigation.mitigation_applied) {
    dynamicInterpretation = "Baseline already satisfies the selected fairness criterion. No mitigation required.";
  } else if (diImproved || mitFair.passes_disparate_impact) {
    if (accDiff < -0.0005) {
      dynamicInterpretation = `Fairness improved with a ${accDiffPoints} percentage-point decrease in accuracy.`;
    } else if (accDiff > 0.0005) {
      dynamicInterpretation = `Fairness improved with a ${accDiffPoints} percentage-point increase in accuracy.`;
    } else {
      dynamicInterpretation = "Fairness improved while model accuracy was fully maintained.";
    }
  } else {
    dynamicInterpretation = `Model accuracy changed by ${accDiff >= 0 ? '+' : '-'}${accDiffPoints} percentage points under mitigated boundaries.`;
  }

  // Final Conclusion text
  const isBaselinePassing = fairness_audit.overall_status !== "Potential Fairness Concern";
  const isMitigationSuccessful = mitigation.mitigation_applied && (
    mitFair.severity_status === "Passes Screening Threshold" ||
    mitigation.mitigation_status === "Fairness improved"
  );

  let conclusionText = '';
  if (isBaselinePassing) {
    conclusionText = "Baseline already satisfies the selected fairness criterion. No mitigation required.";
  } else if (isMitigationSuccessful) {
    conclusionText = "Potential fairness concern detected in the baseline model. Mitigation improved the selected fairness metrics.";
  } else {
    conclusionText = "Potential fairness concern remains after mitigation. Further review is recommended.";
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Top Action Bar: Back to Datasets */}
      {onBackToDatasets && (
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
          <button
            onClick={onBackToDatasets}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shadow-sm"
          >
            <span>← Back to Datasets</span>
          </button>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Active Dataset: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{auditData.dataset_name}</span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span>Bias Mitigation & Model Comparison</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Comparing model performance and fairness metrics before and after mitigation.
          </p>
        </div>

        {/* Status Pill */}
        <div className={`px-3 py-1.5 rounded-md border text-xs font-mono flex items-center space-x-2 ${
          isImproved || noMitNeeded
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
        }`}>
          <span>Status: {mitigation.mitigation_status}</span>
        </div>
      </div>

      {/* Side-by-Side Comparison: BASELINE MODEL vs MITIGATED MODEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BASELINE MODEL CARD */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Baseline</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                BASELINE MODEL
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Default Decision Boundary
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <span className="text-zinc-500">Accuracy</span>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {(basePerf.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <span className="text-zinc-500">F1</span>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {basePerf.f1.toFixed(3)}
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <span className="text-zinc-500">Disparate Impact</span>
              <div className={`text-xl font-semibold mt-1 ${baseFair.passes_disparate_impact ? 'text-zinc-900 dark:text-zinc-100' : 'text-amber-500'}`}>
                {baseFair.disparate_impact !== null ? baseFair.disparate_impact.toFixed(2) : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <span className="text-zinc-500">TPR Difference</span>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {baseFair.tpr_difference !== null && baseFair.tpr_difference !== undefined 
                  ? `${baseFair.tpr_difference > 0 ? '+' : ''}${(baseFair.tpr_difference * 100).toFixed(1)}%` 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* MITIGATED MODEL CARD */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">Mitigated</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                MITIGATED MODEL
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Mitigation Applied
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-500">
                <span>Accuracy</span>
                <span className={perfDelta.accuracy >= 0 ? 'text-emerald-500' : 'text-zinc-500'}>
                  {perfDelta.accuracy >= 0 ? '+' : ''}{(perfDelta.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {(mitPerf.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-500">
                <span>F1</span>
                <span className={perfDelta.f1 >= 0 ? 'text-emerald-500' : 'text-zinc-500'}>
                  {perfDelta.f1 >= 0 ? '+' : ''}{perfDelta.f1.toFixed(3)}
                </span>
              </div>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {mitPerf.f1.toFixed(3)}
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-500">
                <span>Disparate Impact</span>
                {fairDelta.disparate_impact !== 0 && (
                  <span className="text-emerald-500">
                    {fairDelta.disparate_impact > 0 ? '+' : ''}{fairDelta.disparate_impact.toFixed(2)}
                  </span>
                )}
              </div>
              <div className={`text-xl font-semibold mt-1 ${mitFair.passes_disparate_impact ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {mitFair.disparate_impact !== null ? mitFair.disparate_impact.toFixed(2) : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30">
              <span className="text-zinc-500">TPR Difference</span>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {mitFair.tpr_difference !== null && mitFair.tpr_difference !== undefined 
                  ? `${mitFair.tpr_difference > 0 ? '+' : ''}${(mitFair.tpr_difference * 100).toFixed(1)}%` 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FAIRNESS RESULT SECTION */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
            FAIRNESS RESULT
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Auditing Evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500">Before:</span>
            <div className={`text-sm font-semibold ${baseFair.severity_status === "Passes Screening Threshold" ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {baseFair.severity_status}
            </div>
            <div className="text-xs font-mono text-zinc-500">
              DI: {baseFair.disparate_impact !== null ? baseFair.disparate_impact.toFixed(2) : 'N/A'} | TPR Diff: {baseFair.tpr_difference !== null && baseFair.tpr_difference !== undefined ? `${baseFair.tpr_difference > 0 ? '+' : ''}${(baseFair.tpr_difference * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>

          <div className="p-3.5 rounded border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1">
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">After:</span>
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {mitFair.passes_disparate_impact && mitFair.passes_tpr_parity ? 'Fairness Criterion Satisfied (PASS)' : 'Fairness Improved'}
            </div>
            <div className="text-xs font-mono text-emerald-600/90 dark:text-emerald-400/90">
              DI: {mitFair.disparate_impact !== null ? mitFair.disparate_impact.toFixed(2) : 'N/A'} | TPR Diff: {mitFair.tpr_difference !== null && mitFair.tpr_difference !== undefined ? `${mitFair.tpr_difference > 0 ? '+' : ''}${(mitFair.tpr_difference * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium pt-1">
          {dynamicInterpretation}
        </p>
      </div>

      {/* Subgroup Before vs After Comparison Table */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Subgroup Fairness: Before vs After
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Attribute: <span className="font-mono text-zinc-600 dark:text-zinc-400">{mitigation.primary_attribute}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                <th className="pb-2 font-medium">Group</th>
                <th className="pb-2 font-medium">Baseline DI</th>
                <th className="pb-2 font-medium">Mitigated DI</th>
                <th className="pb-2 font-medium">Baseline Positive Rate</th>
                <th className="pb-2 font-medium">Mitigated Positive Rate</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {mitFair.groups.map((mg) => {
                const bg = baseFair.groups.find(g => g.group_name === mg.group_name);
                const passes = mg.disparate_impact ? (mg.disparate_impact >= 0.80 && mg.disparate_impact <= 1.25) : true;

                return (
                  <tr key={mg.group_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {mg.group_name}
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {bg && bg.disparate_impact !== null ? bg.disparate_impact.toFixed(2) : (bg?.group_name === baseFair.reference_group ? '1.00 (Ref)' : 'N/A')}
                    </td>
                    <td className="py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {mg.disparate_impact !== null ? mg.disparate_impact.toFixed(2) : (mg.group_name === mitFair.reference_group ? '1.00 (Ref)' : 'N/A')}
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {bg ? `${(bg.predicted_positive_rate * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      {(mg.predicted_positive_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        passes 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {passes ? 'PASS' : 'FLAGGED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Details: Learned Decision Thresholds Expandable */}
      {thresholds && Object.keys(thresholds).length > 0 && (
        <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs font-mono">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium flex items-center justify-between select-none">
            <span>Technical Details: Learned Decision Thresholds</span>
            <span className="text-[11px] text-accent">Toggle Details</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(thresholds).map(([grp, thresh]) => {
              const isRef = thresh === 0.50;
              return (
                <div
                  key={grp}
                  className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{grp}</span>
                    <p className="text-[10px] text-zinc-500">{isRef ? 'Standard (0.50)' : 'Validation-Tuned'}</p>
                  </div>
                  <span className="font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {thresh.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Final Audit Conclusion */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-1.5">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Audit Conclusion
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {conclusionText}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Observed demographic disparity serves as an auditing signal to guide model governance, not automatic proof of algorithmic bias.
        </p>
      </div>

    </div>
  );
}
