import React from 'react';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  HelpCircle,
  Eye,
  Shield,
  FileSpreadsheet
} from 'lucide-react';

export default function DatasetView({ auditData, previewRows, openSettings }) {
  if (!auditData) return null;

  const { profile, detection } = auditData;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header & Quality Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-accent" />
            <span>Autonomous Dataset Profiling & Understanding</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            FairLens analyzed schema structures, value cardinality, and statistical distributions without requiring manual column mapping.
          </p>
        </div>

        <button
          onClick={openSettings}
          className="self-start md:self-auto text-xs px-3 py-1.5 rounded-md font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300"
        >
          Review / Override Inferences
        </button>
      </div>

      {/* Profile Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Total Rows</span>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {profile.row_count.toLocaleString()}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Columns</span>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {profile.column_count}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Numerical</span>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {profile.numerical_columns.length}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Categorical</span>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {profile.categorical_columns.length}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Missing Values</span>
          <p className={`text-lg font-semibold mt-1 ${profile.missing_values_count > 0 ? 'text-amber-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {profile.missing_values_count.toLocaleString()}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Duplicates</span>
          <p className={`text-lg font-semibold mt-1 ${profile.duplicate_rows_count > 0 ? 'text-amber-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {profile.duplicate_rows_count}
          </p>
        </div>
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011]">
          <span className="text-[11px] font-mono text-zinc-500">Excluded (ID/PII)</span>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
            {profile.id_columns.length + profile.pii_columns.length + profile.constant_columns.length}
          </p>
        </div>
      </div>

      {/* Data Quality / Leakage Alerts */}
      {profile.data_quality_warnings.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Data Hygiene & Anomaly Diagnostics</span>
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-zinc-700 dark:text-zinc-300">
            {profile.data_quality_warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Target & Demographic Inferences Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Target Outcome Detection Card */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Target Outcome Detection
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              detection.is_target_confident
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {detection.is_target_confident ? 'Confident Inference' : 'Uncertain Target'}
            </span>
          </div>

          <div className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500">Selected Target Column:</span>
                <div className="text-base font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {detection.selected_target}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500">Confidence:</span>
                <div className="text-base font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {(detection.target_confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Confidence progress bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, detection.target_confidence * 100)}%` }}
              ></div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Positive Outcome Class:</span>
              <span className="font-mono font-medium px-2 py-0.5 rounded bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                {String(detection.positive_class)}
              </span>
            </div>
          </div>

          {/* Alternative Target Candidates if any */}
          {detection.target_candidates.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-500">Other Potential Targets:</span>
              <div className="space-y-1">
                {detection.target_candidates.slice(1, 3).map((cand) => (
                  <div key={cand.column} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{cand.column}</span>
                    <span className="text-zinc-500 font-mono">{(cand.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Protected Demographic Attributes Card */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Protected Attributes & Subgroups
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {detection.protected_attribute_candidates.length} Detected
            </span>
          </div>

          <div className="space-y-3">
            {detection.protected_attribute_candidates.map((p) => (
              <div
                key={p.column}
                className="p-3 rounded-md border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.column}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      {(p.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Ref: <strong className="text-zinc-800 dark:text-zinc-200">{p.recommended_reference_group}</strong>
                  </span>
                </div>

                {/* Subgroups chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.detected_groups.map((grp) => {
                    const isRef = grp === p.recommended_reference_group;
                    return (
                      <span
                        key={grp}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                          isRef
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {grp} {isRef && '(Baseline)'}
                      </span>
                    );
                  })}
                </div>

                <p className="text-[10px] text-zinc-500 leading-tight pt-1">
                  {p.reference_reason}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Proxy / Indirect Effect Signals */}
      {detection.detected_proxies.length > 0 && (
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Indirect Effect & Demographic Proxy Investigation
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Statistical Association Signals (Non-Causal)</span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            FairLens detected non-protected features that correlate significantly with demographic protected attributes. These features may act as latent proxies.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {detection.detected_proxies.slice(0, 4).map((prx, idx) => (
              <div
                key={idx}
                className="p-3 rounded border border-zinc-200 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <span>Feature: {prx.feature}</span>
                    <span className="text-zinc-400">↔</span>
                    <span className="text-accent">{prx.protected_attribute}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {prx.message}
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ml-2">
                  η = {prx.correlation_score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset Columns Schema Table */}
      <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Feature Registry & Column Roles
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {profile.columns.length} columns inspected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 font-mono text-zinc-500 text-[11px]">
                <th className="pb-2">Column Name</th>
                <th className="pb-2">Inferred Role</th>
                <th className="pb-2">Data Type</th>
                <th className="pb-2">Unique Values</th>
                <th className="pb-2">Missing</th>
                <th className="pb-2">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
              {profile.columns.map((c) => {
                const isTarget = c.name === detection.selected_target;
                const isProtected = detection.selected_protected_attributes.includes(c.name);
                
                return (
                  <tr key={c.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 font-medium text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                      <span>{c.name}</span>
                      {isTarget && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-sans">Target</span>
                      )}
                      {isProtected && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-accent/10 text-accent border border-accent/20 uppercase font-sans">Protected</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                        c.is_id ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' :
                        c.is_pii ? 'bg-red-500/10 text-red-500' :
                        c.is_constant ? 'bg-amber-500/10 text-amber-500' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {c.inferred_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-500">{c.dtype}</td>
                    <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{c.unique_count.toLocaleString()}</td>
                    <td className="py-2.5 text-zinc-500">
                      {c.missing_count > 0 ? `${(c.missing_ratio * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-2.5 text-zinc-500 max-w-[220px] truncate">
                      {c.sample_values.join(", ")}
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
