import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WorkflowProgress from './components/WorkflowProgress';
import DashboardView from './components/DashboardView';
import DatasetView from './components/DatasetView';
import FairnessView from './components/FairnessView';
import MitigationView from './components/MitigationView';
import ExplainView from './components/ExplainView';
import ReportView from './components/ReportView';
import AdvancedSettingsModal from './components/AdvancedSettingsModal';
import { 
  uploadDataset, 
  runAutoAudit, 
  fetchSampleDatasets, 
  runSampleAutoAudit, 
  runAuditOverride 
} from './api';

export default function App() {
  // Theme state persisted in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fairlens_theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fairlens_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation & Data state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [auditData, setAuditData] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [sampleDatasets, setSampleDatasets] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReauditing, setIsReauditing] = useState(false);

  // Loading & Progress state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepMessage, setStepMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Load sample datasets on mount
  useEffect(() => {
    fetchSampleDatasets()
      .then(data => setSampleDatasets(data))
      .catch(err => console.error("Error loading sample datasets:", err));
  }, []);

  // Handle CSV file upload
  const handleUploadFile = async (file) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStep(1);
    setStepMessage('Profiling uploaded dataset & scanning schema...');

    try {
      const uploadRes = await uploadDataset(file);
      setPreviewRows(uploadRes.preview_rows || []);
      
      setCurrentStep(3);
      setStepMessage('Detecting column roles, targets & demographic attributes...');
      
      // Immediately run automated audit pipeline
      setCurrentStep(5);
      setStepMessage('Training baseline model & evaluating multi-attribute fairness...');
      
      const auditRes = await runAutoAudit(uploadRes.dataset_id);
      
      setCurrentStep(7);
      setStepMessage('Evaluating automatic mitigation and explainability...');
      
      setAuditData(auditRes);
      setCurrentStep(8);
      setStepMessage('Audit complete.');
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Auditing failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle in-build dataset selection
  const handleSelectSample = async (sampleId) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentStep(2);
    setStepMessage(`Loading dataset...`);

    try {
      setCurrentStep(4);
      setStepMessage('Executing multi-attribute fairness audit...');
      
      const auditRes = await runSampleAutoAudit(sampleId);
      
      setCurrentStep(7);
      setStepMessage('Computing mitigation and explainability...');
      
      setAuditData(auditRes);
      setCurrentStep(8);
      setStepMessage('Audit complete.');
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Dataset audit failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Return back to dataset selection screen and reset active audit state cleanly
  const handleBackToDatasets = () => {
    setAuditData(null);
    setPreviewRows([]);
    setErrorMessage(null);
    setIsAnalyzing(false);
    setIsSettingsOpen(false);
    setIsReauditing(false);
    setActiveTab('dashboard');
  };

  // Handle manual overrides submission
  const handleApplyOverrides = async (overrideParams) => {
    setIsReauditing(true);
    setErrorMessage(null);
    try {
      const updatedAudit = await runAuditOverride(overrideParams);
      setAuditData(updatedAudit);
      setIsSettingsOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to re-audit with overrides');
    } finally {
      setIsReauditing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-[#010102] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        datasetName={auditData?.dataset_name}
        openSettings={() => setIsSettingsOpen(true)}
        hasAuditData={!!auditData}
        onBackToDatasets={handleBackToDatasets}
      />

      {/* Linear Pipeline Progress Bar */}
      {isAnalyzing && (
        <WorkflowProgress
          currentStep={currentStep}
          isAnalyzing={isAnalyzing}
          stepMessage={stepMessage}
        />
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 w-full">
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-zinc-500 hover:text-zinc-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Active Tab View */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            auditData={auditData}
            onUploadFile={handleUploadFile}
            onSelectSample={handleSelectSample}
            sampleDatasets={sampleDatasets}
            isLoading={isAnalyzing}
            setActiveTab={setActiveTab}
            onBackToDatasets={handleBackToDatasets}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetView
            auditData={auditData}
            previewRows={previewRows}
            openSettings={() => setIsSettingsOpen(true)}
            onBackToDatasets={handleBackToDatasets}
          />
        )}

        {activeTab === 'fairness' && (
          <FairnessView 
            auditData={auditData} 
            onBackToDatasets={handleBackToDatasets} 
          />
        )}

        {activeTab === 'mitigation' && (
          <MitigationView 
            auditData={auditData} 
            onBackToDatasets={handleBackToDatasets} 
          />
        )}

        {activeTab === 'explain' && (
          <ExplainView 
            auditData={auditData} 
            onBackToDatasets={handleBackToDatasets} 
          />
        )}

        {activeTab === 'report' && (
          <ReportView 
            auditData={auditData} 
            onBackToDatasets={handleBackToDatasets} 
          />
        )}
      </main>

      {/* Advanced Settings Modal */}
      <AdvancedSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        auditData={auditData}
        onApplyOverrides={handleApplyOverrides}
        isReauditing={isReauditing}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-4 px-6 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FairLens — AI Fairness & Model Auditing</span>
          <span>College Major Project Demonstration</span>
        </div>
      </footer>

    </div>
  );
}
