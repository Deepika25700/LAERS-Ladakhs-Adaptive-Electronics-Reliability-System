/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Minimal Mission-State Header
 * 
 * Clean, uncluttered aerospace command header displaying strictly authoritative live mission state:
 * - LAERS Identity & System Health Status
 * - Active Ladakh Scenario & Altitude
 * - Live Temperatures: T_amb (ambient) & T_core (estimated core)
 * - Live Electrical: V_pack (terminal voltage)
 * - Live Actuator: Thermal Membrane Heater State
 * - Single compact Tools Menu (☰) consolidating all secondary utilities & simulation controls
 */

import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  ShieldAlert, 
  Mountain,
  Thermometer,
  Zap
} from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { calculateSystemStatus } from '../../core/missionRisk';
import { ToolsMenu } from './ToolsMenu';

interface HeaderProps {
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
  isToolsOpen?: boolean;
  onToggleToolsOpen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  isToolsOpen,
  onToggleToolsOpen,
}) => {
  const {
    rawTelemetry,
    stateEstimation,
    environment,
    thermalControl,
    missionRisk,
    pidnnInference,
    digitalTwin,
    specs
  } = snapshot;

  const tBatt = stateEstimation?.estimated?.tempC ?? digitalTwin?.batteryTempC ?? -35.0;
  const tAmb = environment?.ambientTempC ?? -35.0;
  const isHeaterActive = thermalControl?.heaterRequested ?? false;
  const isFailSafe = pidnnInference?.failSafeActive ?? false;

  const terminalVoltage = rawTelemetry?.voltageV?.value ?? digitalTwin?.voltageV ?? 22.2;
  const cutoffVoltage = specs?.lowerVoltageCutoffV ?? 18.0;

  // Derive system status level dynamically from missionRisk and thermal state properties
  const statusLevel = calculateSystemStatus(missionRisk, {
    tempC: tBatt,
    heaterRequested: isHeaterActive,
    thermalRiskLevel: missionRisk?.thermalRiskLevel,
    voltageSagRiskLevel: missionRisk?.voltageSagRiskLevel,
    terminalVoltageV: terminalVoltage,
    cutoffVoltageV: cutoffVoltage,
    missionRiskPct: missionRisk?.missionRiskPct,
    phase: missionRisk?.phase,
    isPreFlight: missionRisk?.isPreFlight,
    socPct: stateEstimation?.estimated?.socPct,
  });

  // Authoritative Simulation Progress Calculation
  const elapsedSec = snapshot.timestampSec;
  const totalDurationMin = snapshot.missionProfile?.totalDurationMin ?? 42;
  const totalDurationSec = totalDurationMin * 60;
  const clampedElapsedSec = Math.min(elapsedSec, totalDurationSec);

  const elapsedMm = Math.floor(clampedElapsedSec / 60).toString().padStart(2, '0');
  const elapsedSs = Math.floor(clampedElapsedSec % 60).toString().padStart(2, '0');
  const totalMm = totalDurationMin.toString().padStart(2, '0');
  const totalSs = '00';

  const rawProgressPct = totalDurationSec > 0 ? (clampedElapsedSec / totalDurationSec) * 100 : 0;
  const progressPct = Math.min(100, Math.max(0, Math.round(rawProgressPct)));

  let phaseLabel = snapshot.missionRisk?.phase;
  if (!phaseLabel && snapshot.telemetryHistory && snapshot.telemetryHistory.length > 0) {
    phaseLabel = snapshot.telemetryHistory[snapshot.telemetryHistory.length - 1].phase;
  }
  if (!phaseLabel) {
    phaseLabel = snapshot.missionProfile?.phases?.[0]?.phase ?? 'PRE-FLIGHT COLD SOAK';
  }
  if (elapsedSec >= totalDurationSec) {
    phaseLabel = 'RECOVERY / COMPLETE';
  }
  const cleanPhaseName = phaseLabel
    .replace('HIGH-ALTITUDE ', '')
    .replace('HIGH-LOAD ', '')
    .replace('HIGH-POWER ', '');

  return (
    <header className="border-b border-[#1e2432] bg-[#0c0e13] px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-40 font-mono">
      {/* 1. System Identity & Live Mission Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-400 font-mono font-bold text-xs tracking-wider">
            LR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-[#f8fafc]">
                LAERS
              </span>
              <span className="hidden md:inline text-[11px] text-[#64748b]">
                | Ladakh's Adaptive Electronics Reliability System
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div className="flex items-center gap-1.5">
          {statusLevel === 'CRITICAL' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-300 text-[10px] font-bold tracking-wider">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              CRITICAL
            </span>
          ) : statusLevel === 'WARNING' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[10px] font-bold tracking-wider">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              WARNING
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[10px] font-medium tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              NORMAL
            </span>
          )}

          {isFailSafe && (
            <span 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-600 text-red-300 text-[10px] font-bold" 
              title={pidnnInference?.failSafeReason ?? 'Fail-safe state engaged'}
            >
              <ShieldAlert className="w-3 h-3" />
              FAIL-SAFE
            </span>
          )}

          {/* Simulation Run / Pause State Indicator */}
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold tracking-wider ${
            snapshot.isPlaying 
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' 
              : 'bg-[#12161f] border-[#222836] text-[#64748b]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              snapshot.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-[#475569]'
            }`} />
            {snapshot.isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* 2. Real Simulation Progress Indicator (Compact, Authoritative) */}
      <div 
        className="flex items-center gap-2.5 px-3 py-1 rounded bg-[#11141b] border border-[#1e2432] text-xs shrink-0"
        title={`Mission Progress: ${elapsedMm}:${elapsedSs} / ${totalMm}:${totalSs} (${progressPct}%) • Phase: ${phaseLabel}`}
      >
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 font-mono text-[11px] leading-tight">
            <span className="text-[#64748b] font-bold">MISSION</span>
            <span className="text-[#f8fafc] font-bold">{elapsedMm}:{elapsedSs}</span>
            <span className="text-[#475569]">/</span>
            <span className="text-[#94a3b8]">{totalMm}:{totalSs}</span>
            <span className="text-[#334155] mx-0.5">•</span>
            <span className="text-amber-400 font-bold uppercase truncate max-w-[110px] sm:max-w-[160px] text-[10px]">
              {cleanPhaseName}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-16 sm:w-28 h-1.5 rounded-full bg-[#1e2432] overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-[#f8fafc]">
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Authoritative Live Mission State Ribbon (Minimal, Mission-Relevant Only) */}
      <div className="hidden xl:flex items-center gap-3 text-xs">
        {/* Active Scenario */}
        <div className="flex items-center gap-1.5 text-[#cbd5e1] bg-[#12161f] border border-[#1e2432] px-2.5 py-1 rounded">
          <Mountain className="w-3.5 h-3.5 text-amber-400/80" />
          <span className="text-[#94a3b8]">{environment?.name?.split(' ')[0] ?? 'Ladakh'}:</span>
          <span className="text-[#f8fafc] font-semibold">{environment?.altitudeM ?? 4180}m</span>
        </div>

        {/* Ambient Temperature */}
        <div className="flex items-center gap-1.5 text-[#94a3b8] bg-[#12161f] border border-[#1e2432] px-2.5 py-1 rounded">
          <span>T_amb:</span>
          <span className="text-[#e2e8f0] font-semibold">{tAmb.toFixed(1)}°C</span>
        </div>

        {/* Core Temperature */}
        <div className="flex items-center gap-1.5 bg-[#12161f] border border-[#1e2432] px-2.5 py-1 rounded">
          <Thermometer className="w-3.5 h-3.5 text-[#64748b]" />
          <span className="text-[#94a3b8]">T_core:</span>
          <span className={`font-bold ${
            tBatt <= -20 ? 'text-red-400' : tBatt <= 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {tBatt.toFixed(1)}°C
          </span>
        </div>

        {/* Terminal Voltage */}
        <div className="flex items-center gap-1.5 bg-[#12161f] border border-[#1e2432] px-2.5 py-1 rounded">
          <Zap className="w-3.5 h-3.5 text-[#64748b]" />
          <span className="text-[#94a3b8]">V_pack:</span>
          <span className="text-[#f8fafc] font-bold">
            {terminalVoltage.toFixed(2)}V
          </span>
        </div>

        {/* Heater Actuator State */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
          isHeaterActive 
            ? 'bg-amber-950/40 text-amber-300 border-amber-600/50' 
            : 'bg-[#12161f] text-[#64748b] border-[#1e2432]'
        }`}>
          <Flame className={`w-3.5 h-3.5 ${isHeaterActive ? (snapshot.isPlaying ? 'text-amber-400 animate-pulse' : 'text-amber-400') : 'text-[#64748b]'}`} />
          <span className="text-[11px] font-semibold">
            {isHeaterActive ? 'HEATING (48W)' : 'HEATER STANDBY'}
          </span>
        </div>
      </div>

      {/* 4. Compact Tools Hamburger Menu (☰) */}
      <div className="flex items-center gap-2">
        <ToolsMenu
          snapshot={snapshot}
          onTogglePlay={onTogglePlay}
          onStepSimulation={onStepSimulation}
          onResetSimulation={onResetSimulation}
          onToggleThermalOverride={onToggleThermalOverride}
          onOpenDemo={onOpenDemo}
          onOpenModelInspector={onOpenModelInspector}
          onOpenTelemetry={onOpenTelemetry}
          onOpenDataset={onOpenDataset}
          onOpenReport={onOpenReport}
          onOpenSettings={onOpenSettings}
          onOpenDocumentation={onOpenDocumentation}
          isOpen={isToolsOpen}
          onToggleOpen={onToggleToolsOpen}
        />
      </div>
    </header>
  );
};
