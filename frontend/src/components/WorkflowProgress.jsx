import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export default function WorkflowProgress({ currentStep, isAnalyzing, stepMessage }) {
  const steps = [
    { id: 1, label: 'Profile' },
    { id: 2, label: 'Roles' },
    { id: 3, label: 'Target' },
    { id: 4, label: 'Demographics' },
    { id: 5, label: 'Train Baseline' },
    { id: 6, label: 'Audit Fairness' },
    { id: 7, label: 'Mitigation' },
    { id: 8, label: 'Explain & Report' },
  ];

  return (
    <div className="w-full bg-zinc-50 dark:bg-[#0f1011] border-b border-zinc-200 dark:border-zinc-800/80 py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        
        {/* Step indicator pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto py-1">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id && isAnalyzing;
            
            return (
              <div key={s.id} className="flex items-center space-x-1.5 flex-shrink-0">
                <div
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight transition-all duration-200 ${
                    isCompleted
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
                      : isCurrent
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-600 bg-transparent'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <span>{s.id}.</span>
                  )}
                  <span>{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <span className="text-zinc-300 dark:text-zinc-700 text-xs">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live status label */}
        {isAnalyzing && (
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
            <span>{stepMessage || 'Automated auditing in progress...'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
