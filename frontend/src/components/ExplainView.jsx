import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function ExplainView({ auditData, setActiveTab, onBackToDatasets }) {
  if (!auditData) return null;

  const { detection, fairness_audit, mitigation, explainability, dataset_name } = auditData;

  const isConcern = fairness_audit.bias_found || fairness_audit.overall_status === "Potential Fairness Concern";
  const primaryAttr = fairness_audit.primary_issue_attribute || (detection.selected_protected_attributes[0] || "demographic attributes");
  const dispAttr = explainability?.disparity_attribution;

  // Section C: After status
  let afterStatus = "";
  let isAfterImproved = false;
  if (!mitigation.mitigation_applied || !mitigation.mitigation_required) {
    afterStatus = "Fairness Criterion Satisfied";
    isAfterImproved = true;
  } else if (
    mitigation.mitigation_status === "Fairness improved" ||
    mitigation.mitigated_fairness?.severity_status === "Passes Screening Threshold"
  ) {
    afterStatus = "Fairness Improved";
    isAfterImproved = true;
  } else {
    afterStatus = "Fairness Concern Remains";
    isAfterImproved = false;
  }

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
          <span>Step 5 of 6</span>
          <span>•</span>
          <span>Explainability</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
          <Sparkles className="w-6 h-6 text-accent" />
          <span>Explainability & Feature Disparity Attribution</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Data-driven attribution of which features correlate with outcome disparities, evaluated using group-split SHAP.
        </p>
      </div>

      {/* 3 CLEAN SECTIONS */}
      <div className="space-y-6">

        {/* Section A: What is driving the disparity? */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              A. Disparity Attribution (What Features Drive the Score Gap)
            </h3>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
              {dispAttr?.narrative || (isConcern
                ? `Disparities in model predictions for ${primaryAttr} are driven by underlying correlations between predictive features and demographic group membership.`
                : `Across ${primaryAttr}, model predictions demonstrated balanced feature contributions with no significant proxy disparity observed.`)}
            </p>

            {/* Drivers list */}
            {dispAttr?.drivers && dispAttr.drivers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  Top Disparity-Correlating Features (Group-Split SHAP Gap)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {dispAttr.drivers.map((d) => (
                    <div key={d.feature} className="p-3 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1">
                      <code className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">{d.feature}</code>
                      <div className="text-[11px] font-mono text-zinc-500">
                        Gap: <strong className="text-amber-600 dark:text-amber-400">{d.impact_difference > 0 ? `+${d.impact_difference.toFixed(3)}` : d.impact_difference.toFixed(3)}</strong>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight pt-0.5">{d.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caveat */}
            <div className="p-2.5 rounded bg-amber-50/60 dark:bg-amber-500/10 border border-amber-500/20 text-xs italic text-zinc-600 dark:text-zinc-400">
              {dispAttr?.caveat || "SHAP/LIME explain model behavior and feature correlation. They identify proxy patterns, not proof of intentional or causal discrimination."}
            </div>
          </div>
        </div>

        {/* Section B: Which sensitive attributes were detected? */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              B. Which Sensitive Attributes Were Detected?
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The following protected demographic attributes were identified and kept separate for auditing. None were used as model predictive features.
          </p>

          <div className="space-y-2.5 pt-1">
            {detection.protected_attribute_candidates.map((p) => (
              <div
                key={p.column}
                className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {p.column}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Baseline Reference Group: <strong className="text-zinc-800 dark:text-zinc-200">{p.recommended_reference_group}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.detected_groups.map((grp) => (
                    <span
                      key={grp}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    >
                      {grp}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section C: What did FairLens do to reduce bias? */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-semibold">
              C. Feature Governance & Mitigation Separation
            </h3>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-2">
            <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
              {mitigation.feature_governance_note || (
                `Protected demographic attributes were excluded from model training. To address remaining proxy disparities, FairLens calibrated group-specific decision boundaries on validation data.`
              )}
            </p>
          </div>

          {/* Before / After Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">Before Mitigation:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isConcern ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {fairness_audit.overall_status}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">After Mitigation:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isAfterImproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {afterStatus}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveTab('mitigation')}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back: Bias Mitigation</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Next: Final Report →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}