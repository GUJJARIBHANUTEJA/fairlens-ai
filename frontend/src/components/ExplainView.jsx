import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  ShieldAlert, 
  BarChart2, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Send,
  Sliders
} from 'lucide-react';
import { predictSingle } from '../api';

export default function ExplainView({ auditData, onBackToDatasets }) {
  if (!auditData) return null;

  const { explainability, detection, mitigation, dataset_id, profile } = auditData;
  const globalFeatures = explainability.global_importance;

  // Initialize sample input state from profile
  const [formData, setFormData] = useState(() => {
    const initial = {};
    profile.columns.forEach((col) => {
      if (!col.is_id && !col.is_pii && !col.is_constant && col.name !== detection.selected_target) {
        initial[col.name] = col.sample_values[0] ?? (col.inferred_type === 'numeric' ? 50 : '');
      }
    });
    return initial;
  });

  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  const handleInputChange = (feat, val) => {
    setFormData(prev => ({
      ...prev,
      [feat]: val
    }));
  };

  const handleRunPrediction = async (e) => {
    e.preventDefault();
    setIsPredicting(true);
    setPredictError(null);
    try {
      const res = await predictSingle(dataset_id, formData);
      setPredictionResult(res);
    } catch (err) {
      setPredictError(err.message || 'Prediction failed');
    } finally {
      setIsPredicting(false);
    }
  };

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
          <span>Explainable AI (SHAP & LIME) & Root-Cause Investigation</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Investigating global feature mechanics and individual prediction contributions to understand model decisions without conflating prediction attribution with discrimination causality.
        </p>
      </div>

      {/* Mandatory Non-Causal Regulatory Disclaimer */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0f1011] text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
        <div className="flex items-center space-x-2 font-mono text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span>Interpretation & Non-Causality Principle</span>
        </div>
        {explainability.disclaimer}
      </div>

      {/* Global Feature Importance & Proxy Investigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SHAP Global Importance Card */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Global Feature Importance Ranking
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">Model Mechanism</span>
          </div>

          <div className="space-y-3 pt-1">
            {globalFeatures.map((f) => (
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
        </div>

        {/* Proxy Attribute Correlation Investigation */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Proxy & Indirect Effect Diagnostics
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">Latent Encodings</span>
          </div>

          {explainability.proxy_signals.length > 0 ? (
            <div className="space-y-3 pt-1">
              {explainability.proxy_signals.slice(0, 5).map((px, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Feature: {px.feature}
                    </span>
                    <span className="text-accent font-semibold">
                      η = {px.correlation_score.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 font-sans">
                    {px.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No strong statistical proxy associations (η ≥ 0.28) detected between non-protected features and demographic attributes.
            </div>
          )}
        </div>

      </div>

      {/* Interactive Individual Prediction Inspector (What-If Analysis) */}
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Interactive What-If Prediction & Local XAI Inspector
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Simulate an individual application to inspect baseline vs mitigated decisions and view local SHAP / LIME explanations.
            </p>
          </div>
          <button
            onClick={handleRunPrediction}
            disabled={isPredicting}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPredicting ? 'Evaluating XAI...' : 'Simulate Prediction'}</span>
          </button>
        </div>

        {/* Dynamic Input Form */}
        <form onSubmit={handleRunPrediction} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.keys(formData).map((key) => {
            const colInfo = profile.columns.find(c => c.name === key);
            const isProtected = detection.selected_protected_attributes.includes(key);

            return (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                  <span className="truncate">{key}</span>
                  {isProtected && <span className="text-accent text-[9px]">Protected</span>}
                </label>
                <input
                  type={colInfo?.inferred_type === 'numeric' ? 'number' : 'text'}
                  value={formData[key] ?? ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>
            );
          })}
        </form>

        {predictError && (
          <div className="p-3 rounded text-xs font-mono bg-red-500/10 text-red-500 border border-red-500/20">
            {predictError}
          </div>
        )}

        {/* Prediction Results & Local Waterfall Contributions */}
        {predictionResult && (
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
            
            {/* Prediction Decision Dual Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Baseline Decision */}
              <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-500">
                  <span>Baseline Model Decision</span>
                  <span>Threshold 0.50</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xl font-bold ${predictionResult.predicted_class === 1 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {predictionResult.predicted_class === 1 ? 'POSITIVE OUTCOME' : 'NEGATIVE OUTCOME'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Model Probability: {(predictionResult.probability * 100).toFixed(1)}%
                </div>
              </div>

              {/* Mitigated Decision */}
              <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-500">
                  <span>Fairness-Mitigated Decision</span>
                  <span className="text-accent font-semibold">Threshold {predictionResult.mitigated_threshold?.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xl font-bold ${predictionResult.mitigated_predicted_class === 1 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {predictionResult.mitigated_predicted_class === 1 ? 'POSITIVE OUTCOME' : 'NEGATIVE OUTCOME'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Subgroup Adjusted Boundary applied to sample probability
                </div>
              </div>

            </div>

            {/* Local SHAP & LIME Feature Contributions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* SHAP Contributions */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Local SHAP Attributions (This Sample)
                </h4>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  {predictionResult.shap_contributions.map((c, i) => {
                    const isPos = c.contribution > 0;
                    return (
                      <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                        <span className="truncate max-w-[200px] text-zinc-800 dark:text-zinc-200">
                          {c.feature} = {String(c.value)}
                        </span>
                        <span className={`font-semibold ${isPos ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {isPos ? '+' : ''}{c.contribution.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIME Contributions */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Local LIME Linear Explanations
                </h4>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  {predictionResult.lime_contributions.map((c, i) => {
                    const isPos = c.contribution > 0;
                    return (
                      <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                        <span className="truncate max-w-[200px] text-zinc-800 dark:text-zinc-200">
                          {c.feature}
                        </span>
                        <span className={`font-semibold ${isPos ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {isPos ? '+' : ''}{c.contribution.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
