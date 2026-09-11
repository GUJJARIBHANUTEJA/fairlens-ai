import React from 'react';
import { Activity, ArrowRight, ArrowLeft, Bot, Target, Award } from 'lucide-react';

export default function ModelView({ auditData, setActiveTab, onBackToDatasets }) {
  if (!auditData) return null;

  const { baseline_performance, dataset_name } = auditData;
  const rawModel = baseline_performance.model_type || 'logistic_regression';
  const modelName = rawModel
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const accuracyPct = (baseline_performance.accuracy * 100).toFixed(1);
  const f1Val = baseline_performance.f1.toFixed(3);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Bar: Back to Datasets & Active Dataset */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
        {onBackToDatasets && (
          <button
            onClick={onBackToDatasets}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shadow-sm"
          >
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
          <span>Step 2 of 6</span>
          <span>•</span>
          <span>Baseline Model</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
          <Activity className="w-6 h-6 text-accent" />
          <span>Baseline Model Performance</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Trained on historical data with sensitive attributes and direct identifiers excluded from model features.
        </p>
      </div>

      {/* 3 Core Metric Cards: Model Used, Accuracy, F1 Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Model Used */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Model Used
            </span>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
              {modelName}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            Supervised binary classification algorithm
          </p>
        </div>

        {/* Accuracy */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Accuracy
            </span>
            <h3 className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
              {accuracyPct}%
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            Overall correct predictions on unseen test split
          </p>
        </div>

        {/* F1 Score */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              F1 Score
            </span>
            <h3 className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
              {f1Val}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            Harmonic balance of precision and recall
          </p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveTab('dataset')}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back: Dataset</span>
        </button>

        <button
          onClick={() => setActiveTab('fairness')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Next: Fairness Audit →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}