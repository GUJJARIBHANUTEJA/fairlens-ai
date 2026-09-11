import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles
} from 'lucide-react';

export default function MitigationView({ auditData }) {
  if (!auditData) return null;

  const { mitigation } = auditData;
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span>Automatic Bias Mitigation & Before/After Comparison</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Evaluating post-processing decision boundary adjustments tuned strictly on validation data and verified on the unseen test split.
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

      {/* Decision Rationale Box */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Mitigation Strategy: {mitigation.mitigation_method}</span>
        </div>
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
          {mitigation.trade_off_summary}
        </p>
        <p className="text-[11px] text-zinc-500 font-mono">
          {mitigation.interpretation}
        </p>
      </div>

      {/* Learned Thresholds Visualizer */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Learned Group-Specific Decision Thresholds
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Primary Attribute: {mitigation.primary_attribute}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(thresholds).map(([grp, thresh]) => {
            const isRef = thresh === 0.50;
            return (
              <div
                key={grp}
                className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {grp}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {isRef ? 'Standard Threshold (0.50)' : 'Adjusted Boundary'}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {thresh.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BASELINE CARD */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Unmitigated</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Baseline Model
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Default Threshold 0.50
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500">Accuracy</span>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {(basePerf.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-zinc-500">F1-Score</span>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {basePerf.f1.toFixed(3)}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Precision</span>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {basePerf.precision.toFixed(3)}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Recall</span>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {basePerf.recall.toFixed(3)}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Disparate Impact:</span>
              <span className={`font-semibold ${baseFair.passes_disparate_impact ? 'text-emerald-500' : 'text-amber-500'}`}>
                {baseFair.disparate_impact ? baseFair.disparate_impact.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">TPR Difference (Gap):</span>
              <span>{baseFair.tpr_difference !== null && baseFair.tpr_difference !== undefined ? `${(baseFair.tpr_difference * 100).toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Positive Prediction Rate:</span>
              <span>{(basePerf.positive_prediction_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* MITIGATED CARD */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">Mitigated</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Fairness-Optimized Model
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Optimal Group Boundaries
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between text-zinc-500">
                <span>Accuracy</span>
                <span className={perfDelta.accuracy >= 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                  {perfDelta.accuracy >= 0 ? '+' : ''}{(perfDelta.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {(mitPerf.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-zinc-500">
                <span>F1-Score</span>
                <span className={perfDelta.f1 >= 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                  {perfDelta.f1 >= 0 ? '+' : ''}{perfDelta.f1.toFixed(3)}
                </span>
              </div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {mitPerf.f1.toFixed(3)}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Precision</span>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {mitPerf.precision.toFixed(3)}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">Recall</span>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {mitPerf.recall.toFixed(3)}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Disparate Impact:</span>
              <div className="flex items-center space-x-1.5">
                <span className={`font-semibold ${mitFair.passes_disparate_impact ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {mitFair.disparate_impact ? mitFair.disparate_impact.toFixed(2) : 'N/A'}
                </span>
                {fairDelta.disparate_impact !== 0 && (
                  <span className="text-emerald-500 font-medium">
                    ({fairDelta.disparate_impact > 0 ? '+' : ''}{fairDelta.disparate_impact.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">TPR Difference (Gap):</span>
              <span>{mitFair.tpr_difference !== null && mitFair.tpr_difference !== undefined ? `${(mitFair.tpr_difference * 100).toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Positive Prediction Rate:</span>
              <span>{(mitPerf.positive_prediction_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Subgroup Prediction Rates: Before vs After Table */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Subgroup Shift: Baseline Rate vs Mitigated Rate
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Attribute: {mitigation.primary_attribute}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                <th className="pb-2">Subgroup</th>
                <th className="pb-2">Learned Threshold</th>
                <th className="pb-2">Baseline Pred Positive</th>
                <th className="pb-2">Mitigated Pred Positive</th>
                <th className="pb-2">Baseline DI</th>
                <th className="pb-2">Mitigated DI</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {mitFair.groups.map((mg) => {
                const bg = baseFair.groups.find(g => g.group_name === mg.group_name);
                const thresh = thresholds[mg.group_name] || 0.50;
                const passes = mg.disparate_impact ? (mg.disparate_impact >= 0.80 && mg.disparate_impact <= 1.25) : true;

                return (
                  <tr key={mg.group_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {mg.group_name}
                    </td>
                    <td className="py-2.5 text-accent font-semibold">{thresh.toFixed(2)}</td>
                    <td className="py-2.5 text-zinc-500">
                      {bg ? `${(bg.predicted_positive_rate * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      {(mg.predicted_positive_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {bg && bg.disparate_impact ? bg.disparate_impact.toFixed(2) : (bg?.group_name === baseFair.reference_group ? '1.00 (Ref)' : 'N/A')}
                    </td>
                    <td className="py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {mg.disparate_impact ? mg.disparate_impact.toFixed(2) : (mg.group_name === mitFair.reference_group ? '1.00 (Ref)' : 'N/A')}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        passes ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {passes ? 'Equitable' : 'Disparity'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
