/**
 * LAERS — Battery Intelligence Engine
 * Component: Engineering Traceability Modal
 * 
 * Provides transparent mathematical derivation answering:
 * "Where did this number come from?"
 */

import React from 'react';
import { X, ArrowDown, Calculator, ShieldCheck } from 'lucide-react';
import { MetricTrace } from '../../core/types';

interface TraceModalProps {
  trace: MetricTrace | null;
  onClose: () => void;
}

export const TraceModal: React.FC<TraceModalProps> = ({ trace, onClose }) => {
  if (!trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#2d3545] rounded max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222733] bg-[#0c0e12]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-bold text-[#f8fafc]">
              ENGINEERING TRACEABILITY: <span className="text-amber-400">{trace.metricName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1f2633] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Summary Box */}
          <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-[#94a3b8] block uppercase">Current Value</span>
              <span className="text-lg font-mono font-bold text-[#f8fafc]">{trace.finalValue}</span>
            </div>
            <div className="max-w-xs text-right">
              <span className="text-xs text-[#94a3b8] leading-tight block">{trace.interpretation}</span>
            </div>
          </div>

          {/* Derivation Chain */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-semibold text-[#cbd5e1] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>DETERMINISTIC & NEURAL COMPUTATIONAL CHAIN</span>
            </div>

            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#262f3e]">
              {trace.chain.map((step, idx) => (
                <div key={idx} className="relative bg-[#161b24] border border-[#262f3e] rounded p-3 text-xs font-mono">
                  {/* Bullet */}
                  <div className="absolute -left-[19px] top-3.5 w-2 h-2 rounded-full bg-amber-500 border border-[#12161f]" />
                  
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[#f8fafc]">{step.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2633] border border-[#2d3545] text-amber-300">
                      {step.provenance}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-amber-400 mb-1">
                    {step.subValue}
                  </div>

                  {step.equation && (
                    <div className="text-[11px] text-[#94a3b8] bg-[#0c0e12] p-1.5 rounded border border-[#1e2430]">
                      <code className="text-[#cbd5e1]">{step.equation}</code>
                    </div>
                  )}

                  {idx < trace.chain.length - 1 && (
                    <div className="flex justify-center -mb-2 mt-1">
                      <ArrowDown className="w-3 h-3 text-[#64748b]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222733] bg-[#0c0e12] flex items-center justify-between text-xs font-mono text-[#64748b]">
          <span>LAERS Deterministic Provenance Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#232a35] hover:bg-[#2d3545] text-[#e2e8f0] font-medium transition cursor-pointer"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
