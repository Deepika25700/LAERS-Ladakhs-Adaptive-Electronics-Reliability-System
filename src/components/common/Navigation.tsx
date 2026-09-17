/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Primary Workstation Navigation
 * 
 * Authoritative 6 Core Engineering Workspaces:
 * 01 OVERVIEW
 * 02 MISSION LAB
 * 03 PIDNN LAB
 * 04 DIGITAL TWIN
 * 05 WHAT-IF LAB
 * 06 SYSTEM ARCHITECTURE
 * 
 * Provides clean workspace switching without permanent utility clutter.
 * Includes subtle, collapsible provenance reference popover.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Orbit, 
  BrainCircuit, 
  Cpu, 
  GitFork, 
  Layers,
  Info,
  X
} from 'lucide-react';
import { ActiveWorkspace } from '../../core/types';

interface NavigationProps {
  activeTab: ActiveWorkspace;
  onTabChange: (tab: ActiveWorkspace) => void;
  isSimulating: boolean;
}

interface WorkspaceTabConfig {
  id: ActiveWorkspace;
  number: string;
  label: string;
  icon: React.ElementType;
}

const WORKSPACE_TABS: WorkspaceTabConfig[] = [
  { id: 'overview', number: '01', label: 'OVERVIEW', icon: LayoutDashboard },
  { id: 'mission_lab', number: '02', label: 'MISSION LAB', icon: Orbit },
  { id: 'pidnn_lab', number: '03', label: 'PIDNN LAB', icon: BrainCircuit },
  { id: 'digital_twin', number: '04', label: 'DIGITAL TWIN', icon: Cpu },
  { id: 'whatif_lab', number: '05', label: 'WHAT-IF LAB', icon: GitFork },
  { id: 'architecture', number: '06', label: 'ARCHITECTURE', icon: Layers },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [showProvenanceModal, setShowProvenanceModal] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowProvenanceModal(false);
      }
    };
    if (showProvenanceModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProvenanceModal]);

  return (
    <nav aria-label="Main Workstation Navigation" className="border-b border-[#1e2432] bg-[#0c0e13] px-4">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 pt-1">
        {/* 6 Primary Workspaces */}
        <div className="flex items-center space-x-1 min-w-max">
          {WORKSPACE_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-medium rounded-t border-t border-x transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#11141b] text-[#f8fafc] border-[#1e2432] border-b-transparent shadow-xs'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] border-transparent hover:bg-[#11141b]/40'
                }`}
              >
                <span className={`text-[10px] font-bold ${isActive ? 'text-amber-400' : 'text-[#64748b]'}`}>
                  {tab.number}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-[#64748b]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subtle, Non-Intrusive Provenance Reference Trigger */}
        <div className="relative shrink-0 pb-1" ref={popoverRef}>
          <button
            onClick={() => setShowProvenanceModal(!showProvenanceModal)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#151924] border border-transparent hover:border-[#222836] transition cursor-pointer"
            title="View Data Provenance Classifications & Scientific Honesty Key"
          >
            <Info className="w-3 h-3 text-[#64748b]" />
            <span className="hidden sm:inline">PROVENANCE</span>
          </button>

          {/* Compact Provenance Explanatory Popover */}
          {showProvenanceModal && (
            <div className="absolute right-0 top-full mt-1.5 w-72 rounded-lg bg-[#0e1117] border border-[#252e3e] shadow-xl p-3 z-50 font-mono text-xs animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e2432]">
                <span className="font-bold text-[#f8fafc] text-[11px] tracking-wider">
                  DATA PROVENANCE KEY
                </span>
                <button
                  onClick={() => setShowProvenanceModal(false)}
                  className="p-0.5 text-[#64748b] hover:text-[#cbd5e1]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 mt-1 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">MEASURED:</span>
                    <p className="text-[#94a3b8] text-[9px]">Hardware BMS/sensor acquisition channel.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 mt-1 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-300">ESTIMATED:</span>
                    <p className="text-[#94a3b8] text-[9px]">Extended Kalman Filter / state observer.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 mt-1 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300">PIDNN PREDICTION:</span>
                    <p className="text-[#94a3b8] text-[9px]">Physics-Informed Deep Neural Network.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 mt-1 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-300">PHYSICS MODEL:</span>
                    <p className="text-[#94a3b8] text-[9px]">Lumped thermal, Butler-Volmer or Arrhenius model.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
