import React, { useState } from 'react';
import { 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  BarChart2, 
  TrendingDown, 
  Layers 
} from 'lucide-react';

export default function FairnessView({ auditData, onBackToDatasets }) {
  if (!auditData) return null;

  const { fairness_audit, baseline_performance } = auditData;
  const findings = fairness_audit.findings;

  const [selectedAttrIndex, setSelectedAttrIndex] = useState(0);
  const activeAudit = findings[selectedAttrIndex] || findings[0];

  if (!activeAudit) return null;

  const isConcern = activeAudit.severity_status === "Potential Fairness Concern";

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
            <Scale className="w-5 h-5 text-accent" />
            <span>Multi-Attribute Algorithmic Fairness Audit</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Evaluating subgroup equity across demographic attributes using the 80% Disparate Impact rule and Equal Opportunity criteria.
          </p>
        </div>

        {/* Severity Badge */}
        <div className={`px-3 py-1.5 rounded-md border text-xs font-mono flex items-center space-x-2 ${
          fairness_audit.overall_status === "Potential Fairness Concern"
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          <span>Overall: {fairness_audit.overall_status}</span>
        </div>
      </div>

      {/* Demographic Attribute Selector Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center space-x-2 overflow-x-auto pb-2">
        {findings.map((f, idx) => {
          const isSelected = selectedAttrIndex === idx;
          const isFlagged = f.severity_status === "Potential Fairness Concern";
          
          return (
            <button
              key={f.attribute_name}
              onClick={() => setSelectedAttrIndex(idx)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span>Rank #{f.severity_rank}: {f.attribute_name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isFlagged ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </button>
          );
        })}
      </div>

      {/* Primary Finding Alert Card for Selected Attribute */}
      <div className={`p-4 rounded-lg border ${
        isConcern
          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
          : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
      }`}>
        <div className="flex items-start space-x-3">
          {isConcern ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">
              {activeAudit.attribute_name} Audit: {activeAudit.severity_status}
            </h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {activeAudit.explanation}
            </p>
            <div className="pt-1 text-[11px] font-mono text-zinc-500 flex flex-wrap gap-4">
              <span>Reference Group: <strong>{activeAudit.reference_group}</strong> ({activeAudit.reference_reason})</span>
              <span>Primary Comparison: <strong>{activeAudit.primary_comparison_group}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Group Positive Prediction Rates */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Positive Prediction Rate
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">Demographic Parity</span>
          </div>

          <div className="space-y-3 pt-2">
            {activeAudit.groups.map((g) => {
              const isRef = g.group_name === activeAudit.reference_group;
              const ratePct = (g.predicted_positive_rate * 100).toFixed(1);
              
              return (
                <div key={g.group_name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={isRef ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}>
                      {g.group_name} {isRef && '(Ref)'}
                    </span>
                    <span className="font-semibold">{ratePct}% (N={g.sample_count})</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isRef ? 'bg-zinc-800 dark:bg-zinc-200' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(100, g.predicted_positive_rate * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Disparate Impact vs 0.80 Benchmark Line */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Disparate Impact Ratio
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">80% Rule (0.80 Benchmark)</span>
          </div>

          <div className="space-y-3 pt-2">
            {activeAudit.groups.map((g) => {
              const isRef = g.group_name === activeAudit.reference_group;
              const diVal = g.disparate_impact !== null && g.disparate_impact !== undefined ? g.disparate_impact : (isRef ? 1.0 : 0.0);
              const passes = diVal >= 0.80 && diVal <= 1.25;

              return (
                <div key={g.group_name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span>{g.group_name}</span>
                    <span className={`font-semibold ${passes ? 'text-emerald-500' : 'text-amber-500'}`}>
                      DI = {diVal.toFixed(2)} {isRef && '(Baseline)'}
                    </span>
                  </div>
                  
                  {/* Relative bar with 80% guideline marker */}
                  <div className="relative w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isRef ? 'bg-zinc-400' : passes ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (diVal / 1.25) * 100)}%` }}
                    ></div>
                    {/* 0.80 threshold indicator tick */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500/80" 
                      style={{ left: `${(0.80 / 1.25) * 100}%` }}
                      title="0.80 Disparate Impact Screening Threshold"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              <span>Red mark = 0.80 rule</span>
            </span>
            <span>DI &lt; 0.80 = Potential concern</span>
          </div>
        </div>

        {/* Chart 3: TPR & FPR by Subgroup */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              True Positive Rate (Equal Opportunity)
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">TPR Parity</span>
          </div>

          <div className="space-y-3 pt-2">
            {activeAudit.groups.map((g) => {
              const tprVal = g.tpr !== null && g.tpr !== undefined ? g.tpr : 0.0;
              const fprVal = g.fpr !== null && g.fpr !== undefined ? g.fpr : 0.0;
              const isRef = g.group_name === activeAudit.reference_group;

              return (
                <div key={g.group_name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span>{g.group_name}</span>
                    <span>TPR: {(tprVal * 100).toFixed(0)}% | FPR: {(fprVal * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isRef ? 'bg-zinc-600 dark:bg-zinc-300' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, tprVal * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Subgroup Detailed Audit Table */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Subgroup Fairness Metrics Table
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Tested on Unseen Test Partition (N={baseline_performance.test_samples})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                <th className="pb-2">Subgroup</th>
                <th className="pb-2">Sample Count (N)</th>
                <th className="pb-2">Actual Positive</th>
                <th className="pb-2">Predicted Positive</th>
                <th className="pb-2">TPR (Recall)</th>
                <th className="pb-2">FPR</th>
                <th className="pb-2">Disparate Impact</th>
                <th className="pb-2">TPR Gap</th>
                <th className="pb-2">Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {activeAudit.groups.map((g) => {
                const isRef = g.group_name === activeAudit.reference_group;
                const passesDI = g.disparate_impact ? (g.disparate_impact >= 0.80 && g.disparate_impact <= 1.25) : isRef;

                return (
                  <tr key={g.group_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {g.group_name} {isRef && <span className="text-zinc-500 font-normal">(Ref)</span>}
                    </td>
                    <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{g.sample_count}</td>
                    <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{(g.actual_positive_rate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-zinc-900 dark:text-zinc-100 font-medium">{(g.predicted_positive_rate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                      {g.tpr !== null && g.tpr !== undefined ? `${(g.tpr * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                      {g.fpr !== null && g.fpr !== undefined ? `${(g.fpr * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5">
                      {isRef ? (
                        <span className="text-zinc-400 font-semibold">1.00 (Base)</span>
                      ) : g.disparate_impact !== null && g.disparate_impact !== undefined ? (
                        <span className={`font-semibold ${passesDI ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {g.disparate_impact.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {isRef ? (
                        <span className="text-zinc-400">0.0%</span>
                      ) : g.tpr_difference !== null && g.tpr_difference !== undefined ? (
                        <span className={Math.abs(g.tpr_difference) <= 0.10 ? 'text-emerald-500' : 'text-amber-500'}>
                          {g.tpr_difference > 0 ? '+' : ''}{(g.tpr_difference * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {g.sample_size_valid ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Valid (N≥15)
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400" title={g.warning}>
                          Small N
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Audit Conclusion Banner */}
      <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
        !isConcern 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
      }`}>
        <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${!isConcern ? 'text-emerald-500' : 'text-amber-500'}`} />
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider">Audit Conclusion</h4>
          <p className="mt-1 text-sm font-normal leading-relaxed text-zinc-800 dark:text-zinc-200">
            {!isConcern 
              ? `The model satisfies fairness criteria on ${activeAudit.attribute_name} (Disparate Impact: ${activeAudit.disparate_impact_ratio !== null && activeAudit.disparate_impact_ratio !== undefined ? activeAudit.disparate_impact_ratio.toFixed(2) : 'N/A'}). No severe algorithmic bias detected across subgroups.`
              : `The baseline model shows a fairness concern on ${activeAudit.attribute_name} (Disparate Impact: ${activeAudit.disparate_impact_ratio !== null && activeAudit.disparate_impact_ratio !== undefined ? activeAudit.disparate_impact_ratio.toFixed(2) : 'N/A'}${activeAudit.worst_tpr_difference !== null && activeAudit.worst_tpr_difference !== undefined ? `, TPR Difference: ${(activeAudit.worst_tpr_difference * 100).toFixed(1)}%` : ''}). Mitigation is recommended to improve demographic equity.`
            }
          </p>
        </div>
      </div>

    </div>
  );
}
