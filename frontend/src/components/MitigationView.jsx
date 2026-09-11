import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export default function MitigationView({ auditData, setActiveTab, onBackToDatasets }) {
  if (!auditData) return null;

  const { mitigation, fairness_audit, dataset_name } = auditData;

  // Real Before Status
  const isConcernBefore = fairness_audit.overall_status === "Potential Fairness Concern";
  const beforeStatus = isConcernBefore ? "Potential Fairness Concern" : "Fairness Criterion Satisfied";

  // Real After Status
  let afterStatus = "";
  let isAfterSuccess = false;

  if (!mitigation.mitigation_applied) {
    afterStatus = "Fairness Criterion Satisfied";
    isAfterSuccess = true;
  } else if (
    mitigation.mitigation_status === "Fairness improved" ||
    mitigation.mitigated_fairness?.severity_status === "Passes Screening Threshold"
  ) {
    afterStatus = "Fairness Improved";
    isAfterSuccess = true;
  } else {
    afterStatus = "Fairness Concern Remains";
    isAfterSuccess = false;
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
          <span>Step 4 of 6</span>
          <span>•</span>
          <span>Bias Mitigation</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <span>Algorithmic Bias Mitigation</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Comparing model fairness state before and after automated threshold calibration.
        </p>
      </div>

      {/* 3 Key Elements: Before Mitigation, What FairLens Did, After Mitigation */}
      <div className="space-y-6">
        
        {/* Row 1: Before vs After Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Before Mitigation Card */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Before Mitigation
            </span>
            <div className={`p-4 rounded-lg border flex items-center space-x-3 ${
              isConcernBefore
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isConcernBefore ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-base font-bold">
                  {beforeStatus}
                </h3>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Standard baseline decision threshold
                </p>
              </div>
            </div>
          </div>

          {/* After Mitigation Card */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              After Mitigation
            </span>
            <div className={`p-4 rounded-lg border flex items-center space-x-3 ${
              isAfterSuccess
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {isAfterSuccess ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-base font-bold">
                  {afterStatus}
                </h3>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Post-mitigation decision alignment
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Row 2: What FairLens Did */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              What FairLens Did
            </h3>
          </div>
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
              FairLens excluded sensitive attributes and applied validation-tuned boundary adjustment to improve fairness without compromising predictive utility.
            </p>
          </div>
        </div>

      </div>

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