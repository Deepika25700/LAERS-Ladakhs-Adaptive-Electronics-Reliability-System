/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Tools & Utilities Hamburger Menu
 * 
 * Consolidates secondary utilities, simulation controls, and deep diagnostic tools
 * into a clean, collapsible mission-control drawer/dropdown to prevent visual clutter.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward,
  Flame, 
  Search, 
  Terminal, 
  Database, 
  FileText, 
  Sliders, 
  ChevronRight,
  Shield,
  Activity,
  Zap,
  BookOpen,
  Keyboard
} from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';

interface ToolsMenuProps {
  snapshot: CompleteEngineSnapshot;
  onTogglePlay: () => void;
  onStepSimulation: () => void;
  onResetSimulation: () => void;
  onToggleThermalOverride: () => void;
  onOpenDemo: () => void;
  onOpenModelInspector: () => void;
  onOpenTelemetry: () => void;
  onOpenDataset: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onOpenDocumentation: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  snapshot,
  onTogglePlay,
  onStepSimulation,
  onResetSimulation,
  onToggleThermalOverride,
  onOpenDemo,
  onOpenModelInspector,
  onOpenTelemetry,
  onOpenDataset,
  onOpenReport,
  onOpenSettings,
  onOpenDocumentation,
  isOpen: controlledIsOpen,
  onToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggleOpen && controlledIsOpen !== undefined) {
      if (open !== controlledIsOpen) onToggleOpen();
    } else {
      setInternalIsOpen(open);
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  const { isPlaying, thermalControl, timestampSec, datasetMode } = snapshot;
  const isHeaterActive = thermalControl.heaterRequested;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const elapsedMin = (timestampSec / 60).toFixed(1);

  return (
    <div className="relative" ref={menuRef}>
      {/* Compact Hamburger Trigger Button */}
      <button
        id="tools-menu-trigger"
        onClick={() => {
          if (onToggleOpen) {
            onToggleOpen();
          } else {
            setInternalIsOpen(!internalIsOpen);
          }
        }}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono font-medium transition cursor-pointer border ${
          isOpen
            ? 'bg-[#11141b] text-[#f8fafc] border-amber-500/50'
            : 'bg-[#11141b] text-[#cbd5e1] border-[#1e2432] hover:bg-[#151a24] hover:text-[#f8fafc]'
        }`}
        title="Open Mission Controls & Utilities Menu (T or ☰)"
      >
        <Menu className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline font-semibold">TOOLS</span>
      </button>

      {/* Flyout Drawer / Dropdown Panel */}
      {isOpen && (
        <div 
          id="tools-menu-panel"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded bg-[#11141b] border border-[#1e2432] shadow-2xl z-50 overflow-hidden font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0b0e14] border-b border-[#1e2432]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold text-[#f8fafc] text-xs tracking-wider">
                MISSION TOOLS & UTILITIES
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#151a24] transition cursor-pointer"
              title="Close menu (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Section 1: Simulation Execution Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[#64748b] font-semibold tracking-wider">
                <span>SIMULATION ENGINE CONTROLS</span>
                <span>T = {elapsedMin} min ({timestampSec}s)</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                {/* Live / Pause Button */}
                <button
                  onClick={() => {
                    onTogglePlay();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-bold transition cursor-pointer border ${
                    isPlaying
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                  }`}
                  title={isPlaying ? 'Pause Simulation' : 'Run Live Simulation'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'PAUSE' : 'LIVE'}</span>
                </button>

                {/* Step +5s Button */}
                <button
                  onClick={() => {
                    onStepSimulation();
                  }}
                  disabled={isPlaying}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-[#11141b] hover:bg-[#151a24] text-[#cbd5e1] border border-[#1e2432] disabled:opacity-40 text-[11px] transition cursor-pointer"
                  title="Step forward by 5 seconds"
                >
                  <StepForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>STEP 5s</span>
                </button>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    onResetSimulation();
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-[#11141b] hover:bg-red-950/40 text-[#94a3b8] hover:text-red-300 border border-[#1e2432] hover:border-red-500/40 text-[11px] transition cursor-pointer"
                  title="Reset simulation to initial conditions"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>
              </div>

              {/* Thermal Heater Manual Control */}
              <div className="flex items-center justify-between p-2 rounded bg-[#0b0e14] border border-[#1e2432]">
                <div className="flex items-center gap-2">
                  <Flame className={`w-3.5 h-3.5 ${isHeaterActive ? 'text-amber-400' : 'text-[#64748b]'}`} />
                  <div>
                    <span className="text-[11px] text-[#e2e8f0] font-medium block">Thermal Membrane</span>
                    <span className="text-[10px] text-[#64748b]">
                      {isHeaterActive ? 'Heater active (48W, duty 100%)' : 'Auto-standby (0W)'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onToggleThermalOverride}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                    isHeaterActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30'
                      : 'bg-[#11141b] text-[#94a3b8] border-[#1e2432] hover:text-[#e2e8f0]'
                  }`}
                >
                  {isHeaterActive ? 'FORCE STANDBY' : 'FORCE HEATING'}
                </button>
              </div>
            </div>

            {/* Section 2: Analysis & Diagnostic Modals */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#64748b] font-semibold tracking-wider block">
                ENGINEERING TOOLS & MODALS
              </span>

              {/* Demo Mode */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDemo();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-amber-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-amber-300 block">
                      Extreme-Cold Evaluation Demo
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Interactive guided walk-through of -38°C mission profile
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-amber-400" />
              </button>

              {/* Model Inspector */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenModelInspector();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-amber-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-amber-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-amber-300 block">
                      PIDNN Model Inspector
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Inspect neural loss weights, multi-head layers & XAI
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-amber-400" />
              </button>

              {/* Telemetry Stream Drawer */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenTelemetry();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-emerald-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-emerald-400">
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-emerald-300 block">
                      Real-Time Telemetry Stream
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Inspect live hex frames, sensor queues & export JSON
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-emerald-400" />
              </button>

              {/* Dataset Manager */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDataset();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-cyan-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-cyan-400">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#f8fafc] group-hover:text-cyan-300">
                        Dataset & Flight Log Manager
                      </span>
                      {datasetMode === 'USER DATA' && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[9px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#64748b]">
                      Import custom CSV flight telemetry or synthetic benchmarks
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-cyan-400" />
              </button>

              {/* Engineering Report */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenReport();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-purple-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-purple-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-purple-300 block">
                      Engineering Mission Report
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Export formal compliance document & R&D sign-off
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-purple-400" />
              </button>

              {/* Battery Specs & Environmental Settings */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-[#334155] text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-[#94a3b8]">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-[#cbd5e1] block">
                      System & Battery Specifications
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Configure cell chemistry, cutoff thresholds & thermal mass
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#cbd5e1]" />
              </button>

              {/* Engineering Documentation */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDocumentation();
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-[#0b0e14] hover:bg-[#151a24] border border-[#1e2432] hover:border-amber-500/40 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-[#11141b] border border-[#1e2432] text-amber-400">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#f8fafc] group-hover:text-amber-300 block">
                      Engineering Documentation
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Operating principles, PIDNN methodology & data provenance
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748b] group-hover:text-amber-400" />
              </button>
            </div>

            {/* Keyboard Shortcuts Section */}
            <div className="pt-2 border-t border-[#1e2432]">
              <div className="flex items-center justify-between text-[#94a3b8] mb-1.5 px-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[10px] tracking-wider text-amber-400">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>KEYBOARD SHORTCUTS</span>
                </div>
                <span className="text-[9px] text-[#64748b]">AUTO-ACTIVE</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-[#0b0e14] border border-[#1e2432] text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Play / Pause</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#11141b] border border-[#1e2432] text-[#f8fafc] font-bold">Space</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Reset</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#11141b] border border-[#1e2432] text-[#f8fafc] font-bold">R</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Workspaces</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#11141b] border border-[#1e2432] text-amber-400 font-bold">1 – 6</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Tools Menu</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#11141b] border border-[#1e2432] text-[#f8fafc] font-bold">T</kbd>
                </div>
                <div className="flex items-center justify-between col-span-2 border-t border-[#1e2432]/60 pt-1 mt-0.5">
                  <span className="text-[#94a3b8]">Close Overlays / Modals</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#11141b] border border-[#1e2432] text-[#cbd5e1] font-bold">Esc</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Footer System Info */}
          <div className="px-3.5 py-2 bg-[#0b0e14] border-t border-[#1e2432] flex items-center justify-between text-[10px] text-[#64748b]">
            <span>LAERS v3.4.2 • CLOSED-LOOP</span>
            <span className="text-emerald-400 font-medium">BMS LINK: OK</span>
          </div>
        </div>
      )}
    </div>
  );
};
