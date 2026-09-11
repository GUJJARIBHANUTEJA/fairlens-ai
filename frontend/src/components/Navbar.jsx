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
    { id: 'fairness', label: '3. Fairness', icon: Scale },
    { id: 'mitigation', label: '4. Mitigation', icon: ShieldCheck },
    { id: 'explain', label: '5. Explain', icon: Sparkles },
    { id: 'report', label: '6. Report', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#010102]/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          
          {/* Brand Logo & Tagline (flex-shrink-0, no v2 badge, no text overlap) */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 font-semibold text-xs tracking-tight shadow-sm flex-shrink-0">
              FL
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap leading-tight">
                FairLens
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap leading-none hidden lg:block">
                AI Fairness & Model Auditing
              </span>
            </div>
          </div>

          {/* Navigation Tabs (compact & resilient against breaking) */}
          <nav className="flex items-center space-x-1 flex-shrink min-w-0 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = !hasAuditData && tab.id !== 'dataset';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                      : isDisabled
                      ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Back button, Dataset Badge, Settings, Theme Toggle */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {hasAuditData && onBackToDatasets && (
              <button
                onClick={onBackToDatasets}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm whitespace-nowrap"
                title="Return to dataset selection and upload"
              >
                <span>← Back</span>
              </button>
            )}

            {datasetName && (
              <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[120px]">{datasetName}</span>
              </div>
            )}

            {hasAuditData && (
              <button
                onClick={openSettings}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
                title="Review / Advanced Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Settings</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex-shrink-0"
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
