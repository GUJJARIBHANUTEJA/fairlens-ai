import React from 'react';
import { 
  Sun, 
  Moon, 
  SlidersHorizontal, 
  ShieldCheck, 
  Database, 
  Scale, 
  Sparkles, 
  FileText, 
  Activity,
  Layers
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  datasetName, 
  openSettings,
  hasAuditData,
  onBackToDatasets
}) {
  const tabs = [
    { id: 'dataset', label: '1. Dataset', icon: Database },
    { id: 'model', label: '2. Model', icon: Activity },
    { id: 'fairness', label: '3. Fairness Audit', icon: Scale },
    { id: 'mitigation', label: '4. Bias Mitigation', icon: ShieldCheck },
    { id: 'explain', label: '5. Explain', icon: Sparkles },
    { id: 'report', label: '6. Final Report', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#010102]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 font-semibold tracking-tight shadow-sm">
              FL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                  FairLens
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  v2.0 Auto
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 -mt-0.5 hidden sm:block">
                AI Fairness & Model Auditing
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = !hasAuditData && tab.id !== 'dataset';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                      : isDisabled
                      ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Back button, Dataset Badge, Settings, Theme Toggle */}
          <div className="flex items-center space-x-2">
            {hasAuditData && onBackToDatasets && (
              <button
                onClick={onBackToDatasets}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm"
                title="Return to dataset selection and upload"
              >
                <span>← Back to Datasets</span>
              </button>
            )}

            {datasetName && (
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[140px]">{datasetName}</span>
              </div>
            )}

            {hasAuditData && (
              <button
                onClick={openSettings}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Review / Advanced Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
