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

  const isConcern = activeAudit.severity_status === "Potential Fairness Concern";
  const overallConcern = fairness_audit.overall_status === "Potential Fairness Concern";

  // Plain-English explanation without formulas or math numbers
  const plainExplanation = isConcern
    ? `A fairness concern was detected for ${activeAudit.attribute_name}. The baseline model produces an unequal rate of favorable outcomes between demographic groups, favoring the reference group (${activeAudit.reference_group}) over the comparison group (${activeAudit.primary_comparison_group}).`
    : `Model decisions satisfy the fairness criterion for ${activeAudit.attribute_name}. Favorable prediction outcomes are distributed equitably across demographic groups.`;

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
            {overallConcern ? 'Fairness Concern Detected' : 'Fairness Criterion Satisfied'}
          </span>
        </div>
      </div>

      {/* Protected Attribute Selector (if multiple) */}
      {findings.length > 1 && (
        <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
          {findings.map((f, idx) => {
            const isSelected = selectedAttrIndex === idx;
            const flag = f.severity_status === "Potential Fairness Concern";
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
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-semibold">
              Fairness Status
            </div>
            <div className="text-base font-bold">
              {isConcern ? 'Fairness Concern Detected' : 'Fairness Criterion Satisfied'}
            </div>
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 pt-1">
              {plainExplanation}
            </p>
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
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Privileged (Reference):</span>
                <span className="font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                  {activeAudit.reference_group}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Unprivileged (Comparison):</span>
                <span className="font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                  {activeAudit.primary_comparison_group}
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