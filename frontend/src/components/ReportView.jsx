import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Printer, 
  ArrowLeft, 
  RotateCcw 
} from 'lucide-react';

export default function ReportView({ auditData, setActiveTab, onBackToDatasets }) {
  if (!auditData) return null;

  const [copied, setCopied] = useState(false);
  const reportMarkdown = auditData.report_markdown;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      
      {/* Top Action Bar: Back to Datasets */}
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
          Dataset: <strong className="text-zinc-800 dark:text-zinc-200">{auditData.dataset_name}</strong>
        </span>
      </div>

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 mb-3">
            <span>Step 6 of 6</span>
            <span>•</span>
            <span>Final Report</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center space-x-2.5">
            <FileText className="w-6 h-6 text-accent" />
            <span>Final Model Audit Report</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Ultra-simplified 1-page summary covering dataset, model, audit findings, mitigation, and conclusion.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#0f1011]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Rendered Clean 1-Page Report Container */}
      <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f1011] shadow-sm space-y-6 text-zinc-900 dark:text-zinc-100">
        
        {/* Document Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5 space-y-1.5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                FairLens Major Project Demonstration
              </span>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
                AI Fairness & Model Audit Report
              </h1>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Formatted Semantic Report Content */}
        <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {renderMarkdownDocument(reportMarkdown)}
        </div>

        {/* Sign-off footer */}
        <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[11px] font-mono text-zinc-400">
          <span>Generated by FairLens Autonomous Audit Pipeline</span>
          <span>Verified & Reproducible</span>
        </div>

      </div>

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveTab('explain')}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back: Explain</span>
        </button>

        {onBackToDatasets && (
          <button
            onClick={onBackToDatasets}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Audit Another Dataset</span>
          </button>
        )}
      </div>

    </div>
  );
}

// Helper to render inline markdown (bold **...**, code `...`, italics *...*)
function renderInline(text) {
  if (!text) return null;
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const content = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="font-mono text-[11px] px-1.5 py-0.5 mx-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80"
        >
          {content}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {content}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      const content = part.slice(1, -1);
      return (
        <em key={idx} className="italic text-zinc-500 dark:text-zinc-400">
          {content}
        </em>
      );
    }
    return part;
  });
}

// Helper to parse full markdown document into clean semantic React elements
function renderMarkdownDocument(markdownText) {
  if (!markdownText) return null;

  const lines = markdownText.split('\n');
  const elements = [];
  let currentList = [];
  let keyIdx = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="space-y-1.5 my-2 ml-4 list-disc marker:text-zinc-400 dark:marker:text-zinc-600">
          {currentList.map((item, i) => (
            <li key={i} className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Divider
    if (trimmed === '---') {
      flushList();
      elements.push(
        <hr key={`hr-${keyIdx++}`} className="my-6 border-zinc-200 dark:border-zinc-800" />
      );
      continue;
    }

    // Markdown Table Parser
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // Step back one as the outer loop will increment

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        // row 1 is separator |---|---|
        const bodyRows = tableLines.slice(2).map(line =>
          line.split('|').slice(1, -1).map(c => c.trim())
        );

        elements.push(
          <div key={`table-${keyIdx++}`} className="overflow-x-auto my-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#0f1011]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 font-mono text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteContent = trimmed.replace(/^>\s*/, '');
      elements.push(
        <blockquote key={`quote-${keyIdx++}`} className="my-2.5 pl-3.5 border-l-2 border-amber-500/50 dark:border-amber-400/50 italic text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 bg-amber-50/30 dark:bg-amber-500/5 py-1.5 rounded-r">
          {renderInline(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // Heading 1 (Skip main document title as it is already in the header)
    if (trimmed.startsWith('# ')) {
      flushList();
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${keyIdx++}`}
          className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-5 mb-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80"
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${keyIdx++}`} className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-3 mb-1.5">
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    // Bullet List Item (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
      continue;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={`p-${keyIdx++}`} className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 my-1.5">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return elements;
}