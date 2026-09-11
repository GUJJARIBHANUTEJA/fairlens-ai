import React from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Scale, 
  CheckCircle2, 
  ArrowRight,
  BarChart2,
  TrendingUp,
  Layers
} from 'lucide-react';

export default function ExplainView({ auditData, onBackToDatasets }) {
  if (!auditData) return null;

  const { explainability, detection, mitigation, fairness_audit } = auditData;
  const globalFeatures = explainability.global_importance || [];
  const findings = fairness_audit.findings || [];
  const primaryFinding = findings[0] || null;

  const isConcern = fairness_audit.overall_status === "Potential Fairness Concern";
  
  // Baseline vs Mitigated Fairness Metrics
  const baseFair = mitigation.baseline_fairness || primaryFinding;
  const mitFair = mitigation.mitigated_fairness || primaryFinding;
  
  const baseDI = baseFair?.disparate_impact !== null && baseFair?.disparate_impact !== undefined 
    ? baseFair.disparate_impact 
    : null;
  const mitDI = mitFair?.disparate_impact !== null && mitFair?.disparate_impact !== undefined 
    ? mitFair.disparate_impact 
    : null;

  const baseTPR = baseFair?.tpr_difference !== null && baseFair?.tpr_difference !== undefined 
    ? baseFair.tpr_difference 
    : null;
  const mitTPR = mitFair?.tpr_difference !== null && mitFair?.tpr_difference !== undefined 
    ? mitFair.tpr_difference 
    : null;

  const basePerf = mitigation.baseline_performance;
  const mitPerf = mitigation.mitigated_performance;

  const basePasses = baseFair?.passes_disparate_impact && baseFair?.passes_tpr_parity;
  const mitPasses = mitFair?.passes_disparate_impact && mitFair?.passes_tpr_parity;

  // Dynamic accuracy delta in percentage points
  const accDeltaPts = ((mitPerf.accuracy - basePerf.accuracy) * 100);
  
  // Dynamic fairness improved statement based on REAL backend metrics
  let fairnessStatement = "";
  if (!basePasses && mitPasses) {
    fairnessStatement = "Fairness improved after mitigation. The baseline model failed the selected fairness screening criteria, while the mitigated model satisfies them.";
  } else if (mitigation.mitigation_status === "Fairness improved" || (mitDI !== null && baseDI !== null && mitDI > baseDI)) {
    fairnessStatement = "Fairness improved after mitigation. Group-level disparities were reduced closer to parity on unseen test data.";
  } else if (!isConcern) {
    fairnessStatement = "The baseline model already satisfies the selected fairness screening criteria. Mitigation was not strictly required.";
  } else {
    fairnessStatement = "FairLens evaluated threshold optimization on the test partition; demographic disparities require continuous governance review.";
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
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span>Explainability & Fairness Insights</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Transparent explanation of detected demographic disparities, algorithmic mitigation mechanisms, and model feature attribution.
        </p>
      </div>

      {/* 1. WHY WAS A FAIRNESS CONCERN DETECTED? */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              1. Why Was a Fairness Concern Detected?
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
            isConcern 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            {isConcern ? 'Disparity Flagged' : 'Criteria Satisfied'}
          </span>
        </div>

        {primaryFinding ? (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {isConcern 
                ? "FairLens detected an observed disparity between demographic groups under the selected screening criteria."
                : "FairLens evaluated demographic equity across subgroups. No severe fairness concerns were detected under the screening threshold."
              }
            </p>

            {/* Dynamic Metric Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="text-zinc-500">Protected Attribute</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  {primaryFinding.attribute_name}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">Primary Audited Dimension</p>
              </div>

              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="text-zinc-500">Reference Group</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  {primaryFinding.reference_group}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">Highest Positive Rate Benchmark</p>
              </div>

              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="text-zinc-500">Comparison Group</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  {primaryFinding.primary_comparison_group}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">Largest Observed Disparity</p>
              </div>

              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Baseline Disparate Impact</span>
                  <span className="text-[10px] text-zinc-400">Target ≥ 0.80</span>
                </div>
                <div className={`text-sm font-semibold mt-1 ${primaryFinding.passes_disparate_impact ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {baseDI !== null ? baseDI.toFixed(2) : 'N/A'}
                  <span className="text-[10px] ml-1.5 font-normal text-zinc-400">
                    ({primaryFinding.passes_disparate_impact ? 'PASS' : 'FLAGGED'})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Baseline TPR Difference</span>
                  <span className="text-[10px] text-zinc-400">Rule: |Δ| ≤ 10%</span>
                </div>
                <div className={`text-sm font-semibold mt-1 ${primaryFinding.passes_tpr_parity ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {baseTPR !== null ? `${baseTPR > 0 ? '+' : ''}${(baseTPR * 100).toFixed(1)}%` : 'N/A'}
                  <span className="text-[10px] ml-1.5 font-normal text-zinc-400">
                    ({primaryFinding.passes_tpr_parity ? 'PASS' : 'FLAGGED'})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <span className="text-zinc-500">Screening Criterion</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  80% Rule & Equal Opp.
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">Four-Fifths Ratio Standard</p>
              </div>
            </div>

            {/* Plain English Viva-Friendly Summary */}
            <div className="p-3.5 rounded bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {isConcern ? (
                <>
                  The baseline model produced an observed disparate impact of <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{baseDI !== null ? baseDI.toFixed(2) : 'N/A'}</strong> for the comparison group (<span className="font-mono text-zinc-900 dark:text-zinc-100">{primaryFinding.primary_comparison_group}</span>) compared to the reference group (<span className="font-mono text-zinc-900 dark:text-zinc-100">{primaryFinding.reference_group}</span>). Because this fell below the 0.80 screening benchmark, FairLens flagged a potential fairness concern under the selected auditing criteria.
                </>
              ) : (
                <>
                  The baseline model satisfied both the 80% Disparate Impact benchmark and True Positive Rate parity criteria across all evaluated demographic categories for <span className="font-mono text-zinc-900 dark:text-zinc-100">{primaryFinding.attribute_name}</span>.
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 font-mono">No protected attribute evaluated.</p>
        )}
      </div>

      {/* 2. WHAT DID FAIRLENS DO TO REDUCE THE BIAS? */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              2. What Did FairLens Do to Reduce the Bias?
            </h3>
          </div>
          <span className="text-[10px] font-mono text-accent">Validation-Tuned Optimization</span>
        </div>

        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            FairLens applied <strong className="text-zinc-900 dark:text-zinc-100">{mitigation.mitigation_method}</strong> using the validation data to adjust group decision boundaries, reducing demographic disparity while preserving model performance as much as possible.
          </p>

          {/* Dynamic Baseline -> Mitigated Progression Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs pt-1">
            
            {/* Disparate Impact Shift */}
            <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
              <span className="text-zinc-500 text-[11px]">Disparate Impact</span>
              <div className="flex items-center space-x-2 text-base font-semibold">
                <span className="text-zinc-500">{baseDI !== null ? baseDI.toFixed(2) : 'N/A'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-emerald-600 dark:text-emerald-400">{mitDI !== null ? mitDI.toFixed(2) : 'N/A'}</span>
              </div>
              <p className="text-[10px] text-zinc-400">Target range: 0.80 — 1.25</p>
            </div>

            {/* TPR Difference Shift */}
            <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
              <span className="text-zinc-500 text-[11px]">TPR Difference</span>
              <div className="flex items-center space-x-2 text-base font-semibold">
                <span className="text-zinc-500">{baseTPR !== null ? `${baseTPR > 0 ? '+' : ''}${(baseTPR * 100).toFixed(1)}%` : 'N/A'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-emerald-600 dark:text-emerald-400">{mitTPR !== null ? `${mitTPR > 0 ? '+' : ''}${(mitTPR * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <p className="text-[10px] text-zinc-400">Tolerance rule: |Δ| ≤ 10%</p>
            </div>

            {/* Accuracy Shift */}
            <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
              <span className="text-zinc-500 text-[11px]">Model Accuracy</span>
              <div className="flex items-center space-x-2 text-base font-semibold">
                <span className="text-zinc-500">{(basePerf.accuracy * 100).toFixed(1)}%</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-900 dark:text-zinc-100">{(mitPerf.accuracy * 100).toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-zinc-400">Change: {accDeltaPts >= 0 ? '+' : ''}{accDeltaPts.toFixed(1)} percentage pts</p>
            </div>

            {/* F1 Score Shift */}
            <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
              <span className="text-zinc-500 text-[11px]">F1 Score</span>
              <div className="flex items-center space-x-2 text-base font-semibold">
                <span className="text-zinc-500">{basePerf.f1.toFixed(3)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-900 dark:text-zinc-100">{mitPerf.f1.toFixed(3)}</span>
              </div>
              <p className="text-[10px] text-zinc-400">Delta: {(mitPerf.f1 - basePerf.f1) >= 0 ? '+' : ''}{(mitPerf.f1 - basePerf.f1).toFixed(3)}</p>
            </div>

          </div>
        </div>
      </div>

      {/* 3. BEFORE VS AFTER FAIRNESS STATUS */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              3. Before vs After Fairness
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Auditing Verification</span>
        </div>

        {/* Dual Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before Card */}
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                BEFORE MITIGATION
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                basePasses 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {basePasses ? 'PASS' : 'POTENTIAL FAIRNESS CONCERN'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-zinc-400 text-[11px]">Disparate Impact:</span>
                <div className={`text-sm font-semibold mt-0.5 ${baseFair?.passes_disparate_impact ? 'text-zinc-800 dark:text-zinc-200' : 'text-amber-600 dark:text-amber-400'}`}>
                  {baseDI !== null ? baseDI.toFixed(2) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">TPR Difference:</span>
                <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {baseTPR !== null ? `${baseTPR > 0 ? '+' : ''}${(baseTPR * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* After Card */}
          <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold">
                AFTER MITIGATION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {mitPasses ? 'CRITERIA SATISFIED (PASS)' : 'FAIRNESS IMPROVED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-zinc-500 text-[11px]">Disparate Impact:</span>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {mitDI !== null ? mitDI.toFixed(2) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px]">TPR Difference:</span>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {mitTPR !== null ? `${mitTPR > 0 ? '+' : ''}${(mitTPR * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Verification Statement */}
        <div className="p-3.5 rounded bg-white dark:bg-[#0f1011] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
          {fairnessStatement}
        </div>
      </div>

      {/* 4. MODEL BEHAVIOR EXPLANATION (SHAP GLOBAL FEATURE RANKING) */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              4. Model Behavior Explanation (SHAP Global Feature Importance)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Global Feature Mechanics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Top Features Bars */}
          <div className="space-y-3">
            {globalFeatures.slice(0, 6).map((f) => (
              <div key={f.feature} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {f.rank}. {f.feature}
                  </span>
                  <span className="text-zinc-500">{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, f.importance * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation Text */}
          <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed font-sans">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs font-mono uppercase">
              Understanding Feature Weights
            </h4>
            <p>
              SHAP evaluates how much each feature contributed across the training data to shift model predictions relative to the base distribution.
            </p>
            <p>
              Top features like <span className="font-mono text-zinc-800 dark:text-zinc-200">{globalFeatures[0]?.feature || 'credit score'}</span> and <span className="font-mono text-zinc-800 dark:text-zinc-200">{globalFeatures[1]?.feature || 'income'}</span> provide the primary predictive signal across decisions.
            </p>
          </div>
        </div>
      </div>

      {/* 5. LIME EXPLANATION & PROXY INVESTIGATION */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              5. Local Attribution (LIME) & Proxy Investigation
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Local Surrogates & Encodings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LIME Local Sample Attributions if available */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Representative LIME Decision Weights
            </h4>
            {explainability.sample_lime && explainability.sample_lime.length > 0 ? (
              <div className="space-y-2 font-mono text-xs">
                {explainability.sample_lime.slice(0, 5).map((l, idx) => (
                  <div key={idx} className="p-2.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{l.feature}</span>
                    <span className={`font-semibold ${l.contribution >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {l.contribution >= 0 ? '+' : ''}{l.contribution.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs text-zinc-500 font-mono">
                LIME interprets local decision surfaces using interpretable linear surrogates fitted in sample perturbation neighborhoods.
              </div>
            )}
          </div>

          {/* Proxy Signals Card */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Indirect Proxy Signals
            </h4>
            {explainability.proxy_signals && explainability.proxy_signals.length > 0 ? (
              <div className="space-y-2">
                {explainability.proxy_signals.slice(0, 3).map((px, idx) => (
                  <div key={idx} className="p-2.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{px.feature} ↔ {px.protected_attribute}</span>
                      <span className="text-accent font-semibold">η = {px.correlation_score.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-sans">{px.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs text-zinc-500 font-mono">
                No strong statistical proxy associations (η ≥ 0.28) detected between non-protected features and demographic attributes.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 6. MANDATORY REGULATORY & NON-CAUSALITY DISCLAIMER */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0f1011] text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
        <div className="flex items-center space-x-2 font-mono text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span>Interpretation & Non-Causality Principle</span>
        </div>
        <p>
          <strong className="text-zinc-800 dark:text-zinc-200">Important Note:</strong> SHAP and LIME explain mathematical model behavior and feature contributions on observed historical distributions; they do not prove that a protected attribute or proxy causally caused a decision or constitutes unlawful discrimination. Observed demographic disparity serves as an auditing signal to guide model governance, not automatic proof of algorithmic bias.
        </p>
      </div>

    </div>
  );
}
