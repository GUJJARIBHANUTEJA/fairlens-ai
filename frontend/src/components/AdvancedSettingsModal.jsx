import React, { useState } from 'react';
import { X, SlidersHorizontal, RotateCcw, Check, Sparkles } from 'lucide-react';

export default function AdvancedSettingsModal({ 
  isOpen, 
  onClose, 
  auditData, 
  onApplyOverrides, 
  isReauditing 
}) {
  const profile = auditData?.profile;
  const detection = auditData?.detection;

  // Local state initialized with current active or auto-detected settings
  const [selectedTarget, setSelectedTarget] = useState(detection?.selected_target || '');
  const [positiveClass, setPositiveClass] = useState(detection?.positive_class || '');
  const [selectedProtected, setSelectedProtected] = useState(detection?.selected_protected_attributes || []);
  const [referenceGroups, setReferenceGroups] = useState(detection?.reference_groups ? { ...detection.reference_groups } : {});
  const [modelType, setModelType] = useState('logistic_regression');
  const [diThreshold, setDiThreshold] = useState(0.80);

  if (!isOpen || !auditData) return null;

  const handleToggleProtected = (col) => {
    if (selectedProtected.includes(col)) {
      if (selectedProtected.length > 1) {
        setSelectedProtected(selectedProtected.filter(c => c !== col));
      }
    } else {
      setSelectedProtected([...selectedProtected, col]);
      // set default ref group
      const colInfo = profile.columns.find(c => c.name === col);
      if (colInfo && colInfo.sample_values.length > 0) {
        setReferenceGroups(prev => ({ ...prev, [col]: String(colInfo.sample_values[0]) }));
      }
    }
  };

  const handleRefGroupChange = (col, val) => {
    setReferenceGroups(prev => ({ ...prev, [col]: val }));
  };

  const handleResetToAuto = () => {
    setSelectedTarget(detection.selected_target);
    setPositiveClass(detection.positive_class);
    setSelectedProtected(detection.selected_protected_attributes);
    setReferenceGroups({ ...detection.reference_groups });
    setModelType('logistic_regression');
    setDiThreshold(0.80);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplyOverrides({
      dataset_id: auditData.dataset_id,
      target_column: selectedTarget,
      positive_class: positiveClass,
      protected_attributes: selectedProtected,
      reference_groups: referenceGroups,
      model_type: modelType,
      disparate_impact_threshold: parseFloat(diThreshold),
      apply_mitigation: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Review / Advanced Audit Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          
          <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 font-sans">
            FairLens defaults to automatic parameter and demographic role inferences. You may optionally override these values below for custom scenarios.
          </div>

          {/* 1. Target Column Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex justify-between">
              <span>Target Outcome Column</span>
              <span className="text-zinc-400 font-normal">Auto-detected: {detection.selected_target}</span>
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              {profile.columns.filter(c => !c.is_id && !c.is_pii && !c.is_constant).map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.unique_count} unique values)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Positive Class Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex justify-between">
              <span>Favorable / Positive Class Value</span>
              <span className="text-zinc-400 font-normal">Auto: {String(detection.positive_class)}</span>
            </label>
            <input
              type="text"
              value={positiveClass}
              onChange={(e) => setPositiveClass(e.target.value)}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          {/* 3. Protected Demographic Attributes Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Audited Protected Attributes (Multi-Attribute)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {profile.columns
                .filter(c => c.name !== selectedTarget && !c.is_id && !c.is_pii && !c.is_constant)
                .map((col) => {
                  const isChecked = selectedProtected.includes(col.name);
                  return (
                    <div
                      key={col.name}
                      onClick={() => handleToggleProtected(col.name)}
                      className={`px-3 py-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                        isChecked
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span className="truncate">{col.name}</span>
                      {isChecked && <Check className="w-3 h-3 flex-shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 4. Reference Baseline Groups */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Reference Baseline Groups
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedProtected.map((prot) => {
                const cand = detection.protected_attribute_candidates.find(c => c.column === prot);
                const groups = cand ? cand.detected_groups : (profile.columns.find(c => c.name === prot)?.sample_values || []);
                const currentRef = referenceGroups[prot] || groups[0] || 'Unknown';

                return (
                  <div key={prot} className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-1">
                    <span className="text-[11px] text-zinc-500">{prot} Baseline:</span>
                    <select
                      value={currentRef}
                      onChange={(e) => handleRefGroupChange(prot, e.target.value)}
                      className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] text-zinc-800 dark:text-zinc-200"
                    >
                      {groups.map((g) => (
                        <option key={String(g)} value={String(g)}>
                          {String(g)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Model Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Baseline Model Architecture
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'logistic_regression', label: 'Logistic Reg', note: 'Explainable' },
                { id: 'random_forest', label: 'Random Forest', note: 'Nonlinear' },
                { id: 'xgboost', label: 'XGBoost', note: 'Gradient Boost' }
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setModelType(m.id)}
                  className={`p-2.5 rounded border text-center cursor-pointer transition-colors ${
                    modelType === m.id
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div>{m.label}</div>
                  <div className="text-[9px] text-zinc-400 font-sans mt-0.5">{m.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Disparate Impact Threshold Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Disparate Impact Screening Benchmark
              </label>
              <span className="font-semibold text-accent">{diThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.60"
              max="0.95"
              step="0.05"
              value={diThreshold}
              onChange={(e) => setDiThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0.60 (Lenient)</span>
              <span>0.80 (Standard 80% Rule)</span>
              <span>0.95 (Strict Parity)</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToAuto}
              className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Auto Inferences</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReauditing}
                className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
              >
                {isReauditing ? 'Re-auditing...' : 'Apply & Run Audit'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
