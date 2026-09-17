/**
 * LAERS — Battery Intelligence Engine
 * Workspace 01: Engineering Command Overview
 * 
 * Progressive Information Architecture Redesign:
 * - LEVEL 1: Immediate Operational Status (Mission Status, Thermal State, Power/Voltage Health, Battery State, Mission Risk)
 * - LEVEL 2: Engineering Telemetry Monitor (Live multi-channel strip + 3D 24-Cell Thermal Topography & Tactical Assessment)
 * - LEVEL 3: Deep Model & Physics Diagnostics (PIDNN loss decomposition, 1st-law physics constraints, environmental stress slider)
 */

import React, { useState } from 'react';
import { 
  Thermometer, 
  Battery, 
  Zap, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Flame, 
  AlertTriangle,
  Cpu, 
  Sliders,
  Compass,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { ActiveWorkspace } from '../../core/types';
import { calculateSystemStatus } from '../../core/missionRisk';
import { IsometricBatteryPack } from './IsometricBatteryPack';
import { EngineeringTelemetryChart } from './EngineeringTelemetryChart';
import { TechTooltip } from '../common/TechTooltip';

interface OverviewViewProps {
  snapshot: CompleteEngineSnapshot;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onOpenTrace: (metricKey: string) => void;
  onToggleThermalOverride: () => void;
  onSetAmbientTemp: (tempC: number) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  snapshot,
  onSelectWorkspace,
  onOpenTrace,
  onSetAmbientTemp,
}) => {
  const {
    environment,
    specs,
    missionProfile,
    stateEstimation,
    physicsFeatures,
    physicsChecks,
    pidnnInference,
    degradation,
    missionRisk,
    thermalControl,
    digitalTwin,
    timestampSec,
  } = snapshot;

  // Level 3 diagnostics tab state
  const [activeDiagnosticTab, setActiveDiagnosticTab] = useState<'pidnn' | 'physics' | 'chamber'>('pidnn');
  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState<boolean>(true);

  const tBattEst = stateEstimation?.estimated?.tempC ?? digitalTwin?.batteryTempC ?? -35.0;
  const tBattMeas = stateEstimation?.measured?.tempC ?? digitalTwin?.batteryTempC ?? -35.0;
  const tAmb = environment?.ambientTempC ?? -35.0;
  const isHeating = thermalControl?.heaterRequested ?? false;
  const pred = pidnnInference?.predictions;

  const terminalVoltage = digitalTwin?.voltageV ?? 22.2;
  const cutoffVoltage = specs?.lowerVoltageCutoffV ?? 18.0;
  const cutoffMargin = terminalVoltage - cutoffVoltage;

  // Derive system status level dynamically from missionRisk and thermal state properties
  const statusLevel = calculateSystemStatus(missionRisk, {
    tempC: tBattEst,
    heaterRequested: isHeating,
    thermalRiskLevel: missionRisk?.thermalRiskLevel,
    voltageSagRiskLevel: missionRisk?.voltageSagRiskLevel,
    terminalVoltageV: terminalVoltage,
    cutoffVoltageV: cutoffVoltage,
    missionRiskPct: missionRisk?.missionRiskPct,
    phase: missionRisk?.phase,
    isPreFlight: missionRisk?.isPreFlight,
    socPct: stateEstimation?.estimated?.socPct,
  });

  const elapsedMin = (timestampSec / 60).toFixed(1);

  // Executive directive text based on status
  const attentionMessage = 
    statusLevel === 'CRITICAL'
      ? 'CRITICAL ALERT: Terminal voltage approaching lower cutoff. Severe cold-induced voltage sag risk.'
      : statusLevel === 'WARNING'
      ? 'CAUTION: Cryogenic thermal stress active. PTC membrane heater actively maintaining core above threshold.'
      : 'NOMINAL: System temperatures stabilized above freezing. Power reserve and voltage margins within safe limits.';

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 01</span>
            <span className="text-[#334155]">•</span>
            <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase">SYSTEM OVERVIEW</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Mission-critical battery health, closed-loop thermal actuation & multi-channel telemetry command
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#11141b] border border-[#1e2432] text-[#94a3b8]">
            SORTIE: <strong className="text-[#f8fafc]">{environment?.name?.split(' ')[0] ?? 'Ladakh'}</strong> ({environment?.altitudeM ?? 4180}m)
          </span>
          <span className={`text-[10px] px-2.5 py-1 rounded font-bold border ${
            statusLevel === 'CRITICAL'
              ? 'bg-red-950/60 border-red-500/60 text-red-300'
              : statusLevel === 'WARNING'
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
              : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
          }`}>
            {statusLevel}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: IMMEDIATE OPERATIONAL STATUS & 5 CORE QUESTIONS                   */}
      {/* ========================================================================= */}
      
      {/* 1.1 Executive Operational Health Banner */}
      <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded bg-[#161a24] border border-[#222938] shrink-0 mt-0.5 sm:mt-0">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#f8fafc] text-xs sm:text-sm tracking-wide">
                OPERATIONAL STATUS
              </span>
              <span 
                id="overview-status-badge"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${
                  statusLevel === 'CRITICAL'
                    ? 'bg-red-950/80 border-red-500/60 text-red-300'
                    : statusLevel === 'WARNING'
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {statusLevel === 'CRITICAL' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                {statusLevel === 'WARNING' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                {statusLevel === 'NORMAL' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {statusLevel}
              </span>
              <span className="text-[10px] text-[#64748b]">
                • {missionProfile?.name ?? 'Mission Profile'}
              </span>
            </div>
            <p className={`text-[11px] font-medium leading-tight ${
              statusLevel === 'CRITICAL' ? 'text-red-300' : statusLevel === 'WARNING' ? 'text-amber-300' : 'text-[#94a3b8]'
            }`}>
              {attentionMessage}
            </p>
          </div>
        </div>

        {/* Quick Context Strip */}
        <div className="flex items-center gap-3 text-[10px] bg-[#0c0e13] px-3 py-1.5 rounded border border-[#1e2432] self-start md:self-auto shrink-0">
          <div>
            <span className="text-[#64748b]">Sector: </span>
            <span className="text-[#cbd5e1] font-semibold">{environment?.name?.split(' ')[0] ?? 'Ladakh'}</span>
          </div>
          <span className="text-[#2d3546]">|</span>
          <div>
            <span className="text-[#64748b]">Phase: </span>
            <span className="text-amber-400 font-semibold">{missionRisk?.phase ?? 'ACTIVE'}</span>
          </div>
          <span className="text-[#2d3546]">|</span>
          <div>
            <span className="text-[#64748b]">Elapsed: </span>
            <span className="text-[#f8fafc] font-semibold">{elapsedMin}m</span>
          </div>
        </div>
      </div>

      {/* 1.2 The 4 Primary Operational Health Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* PILLAR 1: THERMAL STATE */}
        <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-[10px]">
            <span className="flex items-center gap-1.5 font-bold text-[#cbd5e1] tracking-wider">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              1. THERMAL STATE
            </span>
            <button 
              onClick={() => onOpenTrace('temperature')} 
              className="text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline cursor-pointer font-bold"
              title="Open temperature telemetry trace"
            >
              [TRACE]
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight ${
                tBattEst <= -20 ? 'text-red-400' : tBattEst <= 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {tBattEst.toFixed(1)}°C
              </span>
              <span className="text-[10px] text-[#64748b]">meas {tBattMeas.toFixed(1)}°C</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1 flex items-center justify-between">
              <span>Ambient / Gradient:</span>
              <span className="text-amber-300 font-semibold">
                {tAmb.toFixed(1)}°C (+{(physicsFeatures?.deltaTC ?? (tBattEst - tAmb)).toFixed(1)}°Δ)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a202c] flex items-center justify-between text-[10px]">
            <span className="text-[#64748b]">Membrane Heater:</span>
            <span className={`font-bold ${isHeating ? 'text-amber-400' : 'text-[#64748b]'}`}>
              {isHeating ? `${thermalControl?.heaterPowerW ?? 48}W (${(thermalControl?.energySubtractedWh ?? 0).toFixed(1)} Wh)` : 'STANDBY (0W)'}
            </span>
          </div>
        </div>

        {/* PILLAR 2: POWER & VOLTAGE HEALTH */}
        <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-[10px]">
            <TechTooltip term="Voltage Sag">
              <span className="flex items-center gap-1.5 font-bold text-[#cbd5e1] tracking-wider cursor-help">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                2. VOLTAGE & SAG
              </span>
            </TechTooltip>
            <button 
              onClick={() => onOpenTrace('voltage_sag')} 
              className="text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline cursor-pointer font-bold"
              title="Open voltage sag telemetry trace"
            >
              [TRACE]
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#f8fafc]">
                {terminalVoltage.toFixed(2)}V
              </span>
              <span className="text-[10px] text-red-400 font-semibold">
                -{(pred?.voltageSagV ?? 0.42).toFixed(2)}V sag
              </span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1 flex items-center justify-between">
              <span>Cutoff Margin (18.0V):</span>
              <span className={`font-bold ${cutoffMargin < 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                +{cutoffMargin.toFixed(2)}V
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a202c] flex items-center justify-between text-[10px]">
            <span className="text-[#64748b]">Sag Risk Category:</span>
            <span className={`font-bold ${
              missionRisk?.voltageSagRiskLevel === 'SAFE' ? 'text-emerald-400' :
              missionRisk?.voltageSagRiskLevel === 'ELEVATED' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {missionRisk?.voltageSagRiskLevel ?? 'SAFE'}
            </span>
          </div>
        </div>

        {/* PILLAR 3: BATTERY STATE & IMPEDANCE */}
        <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-[10px]">
            <TechTooltip term="SOC">
              <span className="flex items-center gap-1.5 font-bold text-[#cbd5e1] tracking-wider cursor-help">
                <Battery className="w-3.5 h-3.5 text-amber-400" />
                3. BATTERY & SOC
              </span>
            </TechTooltip>
            <button 
              onClick={() => onOpenTrace('internal_resistance')} 
              className="text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline cursor-pointer font-bold"
              title="Open internal resistance trace"
            >
              [TRACE]
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#f8fafc]">
                {(digitalTwin?.socPct ?? 88.0).toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#94a3b8]">
                {(digitalTwin?.usableCapacityAh ?? 4.8).toFixed(1)} Ah
              </span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1 flex items-center justify-between">
              <TechTooltip term="Internal Resistance">
                <span className="cursor-help hover:text-amber-300">Internal R_int:</span>
              </TechTooltip>
              <span className="text-amber-300 font-semibold">
                {(digitalTwin?.internalResistanceMOhm ?? 38.5).toFixed(1)} mΩ ({((digitalTwin?.internalResistanceMOhm ?? 38.5) / 18.5).toFixed(1)}x)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a202c] flex items-center justify-between text-[10px]">
            <span className="text-[#64748b]">Capacity Derating:</span>
            <span className="text-amber-400 font-semibold">
              {((1 - (digitalTwin?.usableCapacityAh ?? 4.8) / specs.nominalCapacityAh) * 100).toFixed(0)}% cryo-loss
            </span>
          </div>
        </div>

        {/* PILLAR 4: MISSION RISK & ENERGY MARGIN */}
        <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-[10px]">
            <TechTooltip term="Mission Risk">
              <span className="flex items-center gap-1.5 font-bold text-[#cbd5e1] tracking-wider cursor-help">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                4. MISSION RISK
              </span>
            </TechTooltip>
            <button 
              onClick={() => onOpenTrace('mission_risk')} 
              className="text-[9px] text-amber-400/80 hover:text-amber-300 hover:underline cursor-pointer font-bold"
              title="Open mission risk trace"
            >
              [TRACE]
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight ${
                (missionRisk?.missionRiskPct ?? 0) > 60 ? 'text-red-400' : (missionRisk?.missionRiskPct ?? 0) > 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {missionRisk?.missionRiskPct ?? 22}%
              </span>
              <span className="text-[10px] text-[#94a3b8]">
                prob {missionRisk?.missionCompletionProbabilityPct ?? 85}%
              </span>
            </div>
            <div className="text-[10px] text-[#94a3b8] mt-1 flex items-center justify-between">
              <span>Primary Evaluator:</span>
              <span className="text-amber-300 font-semibold">
                MISSION RISK ENGINE
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a202c] flex items-center justify-between text-[10px]">
            <span className="text-[#64748b]">Neural Model:</span>
            <span className="text-amber-400 font-semibold">
              <TechTooltip term="PIDNN">
                <span className="cursor-help hover:underline">{pidnnInference?.predictions?.missionRiskScorePct ?? 24}% PIDNN FORECAST</span>
              </TechTooltip>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 2: ENGINEERING TELEMETRY MONITOR & ISOMETRIC PACK TOPOGRAPHY        */}
      {/* Answers: "How are the variables evolving and where are the gradients?"    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* CENTER-LEFT (2 COLS): MULTI-CHANNEL ENGINEERING TELEMETRY MONITOR */}
        <div className="lg:col-span-2">
          <EngineeringTelemetryChart
            snapshot={snapshot}
            onOpenMissionLab={() => onSelectWorkspace('mission_lab')}
          />
        </div>

        {/* RIGHT (1 COL): ISOMETRIC PACK & TACTICAL MISSION ASSESSMENT */}
        <div className="space-y-4">
          {/* Isometric 24-Cell Pack Visualizer */}
          <IsometricBatteryPack
            snapshot={snapshot}
            onOpenDigitalTwin={() => onSelectWorkspace('digital_twin')}
          />

          {/* Tactical Mission Assessment Card */}
          <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1e2432] pb-2">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[#f8fafc] text-xs">TACTICAL FLIGHT ASSESSMENT</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                statusLevel === 'CRITICAL'
                  ? 'bg-red-950/80 border-red-500/60 text-red-300'
                  : statusLevel === 'WARNING'
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              }`}>
                {statusLevel}
              </span>
            </div>

            <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
              {missionRisk?.recommendation ?? 'Thermal management operating within planned bounds. Continue monitoring perimeter cells.'}
            </p>

            <div className="space-y-1 pt-1 border-t border-[#1a202c]">
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                <span>Mission Completion Probability:</span>
                <span className="text-[#f8fafc] font-bold">
                  {missionRisk?.missionCompletionProbabilityPct ?? 85}%
                </span>
              </div>
              <div className="w-full bg-[#0c0e12] h-1.5 rounded-full overflow-hidden border border-[#1a202c]">
                <div 
                  className={`h-full transition-all duration-300 ${
                    (missionRisk?.missionCompletionProbabilityPct ?? 85) >= 80 
                      ? 'bg-emerald-500' 
                      : (missionRisk?.missionCompletionProbabilityPct ?? 85) >= 50 
                      ? 'bg-amber-500' 
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${missionRisk?.missionCompletionProbabilityPct ?? 85}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#64748b] pt-1">
              <span>Energy Margin: {(missionRisk?.estimatedEnergyMarginWh ?? 42.0).toFixed(1)} Wh</span>
              <button
                onClick={() => onSelectWorkspace('whatif_lab')}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
              >
                Launch What-If Sim →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 3: DEEP MODEL, PHYSICS & DIAGNOSTICS DECK (PROGRESSIVE DISCLOSURE)  */}
      {/* Answers: "What are the underlying neural losses, constraints & chamber?"  */}
      {/* ========================================================================= */}
      <div className="rounded bg-[#11141b] border border-[#1e2432] overflow-hidden">
        {/* Header with Accordion Toggle & Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#141822] border-b border-[#1e2432] gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDiagnosticsExpanded(!isDiagnosticsExpanded)}
              className="flex items-center gap-1.5 font-bold text-[#f8fafc] text-xs hover:text-amber-400 transition cursor-pointer"
            >
              {isDiagnosticsExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
              <span>LEVEL 3 DIAGNOSTICS & VERIFICATION</span>
            </button>
            <span className="text-[#64748b] text-[10px] hidden sm:inline">
              (Deep Physics & Neural Validation)
            </span>
          </div>

          {/* Diagnostic Sub-Tabs */}
          {isDiagnosticsExpanded && (
            <div className="flex items-center gap-1 bg-[#0c0e12] p-0.5 rounded border border-[#1d2330]">
              <button
                onClick={() => setActiveDiagnosticTab('pidnn')}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                  activeDiagnosticTab === 'pidnn'
                    ? 'bg-[#1a202c] text-amber-400 border border-[#2a3449] font-bold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                PIDNN ENGINE
              </button>
              <button
                onClick={() => setActiveDiagnosticTab('physics')}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                  activeDiagnosticTab === 'physics'
                    ? 'bg-[#1a202c] text-emerald-400 border border-[#2a3449] font-bold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                PHYSICS CHECKS
              </button>
              <button
                onClick={() => setActiveDiagnosticTab('chamber')}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                  activeDiagnosticTab === 'chamber'
                    ? 'bg-[#1a202c] text-cyan-400 border border-[#2a3449] font-bold'
                    : 'text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                STRESS CHAMBER
              </button>
            </div>
          )}
        </div>

        {/* Content Deck */}
        {isDiagnosticsExpanded && (
          <div className="p-4">
            {/* TAB 1: PIDNN NEURAL DIAGNOSTICS */}
            {activeDiagnosticTab === 'pidnn' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[#cbd5e1] font-semibold flex items-center gap-1.5 text-xs">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    Neural Multi-Task Loss Decomposition & Divergence
                  </span>
                  <button
                    onClick={() => onSelectWorkspace('pidnn_lab')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    OPEN PIDNN LAB →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <span className="text-[#64748b] text-[10px] block">TOTAL LOSS</span>
                    <span className="font-bold text-amber-400 text-sm">
                      {pidnnInference?.lossComponents?.lossTotal ?? '0.0421'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <span className="text-[#64748b] text-[10px] block">DATA LOSS</span>
                    <span className="font-bold text-[#f8fafc] text-sm">
                      {pidnnInference?.lossComponents?.lossData ?? '0.0210'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <span className="text-[#64748b] text-[10px] block">PHYSICS LOSS</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {pidnnInference?.lossComponents?.lossPhysics ?? '0.0105'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <TechTooltip term="RUL">
                      <span className="text-[#64748b] text-[10px] block cursor-help hover:text-amber-400">PROJECTED RUL</span>
                    </TechTooltip>
                    <span className="font-bold text-[#cbd5e1] text-sm">
                      {degradation?.projectedRulCycles ?? 420} cycles
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Model / Physics Disagreement Diagnostic */}
                  <div className="p-3 rounded bg-[#0c0e12] border border-[#1a202c] flex items-center justify-between">
                    <div>
                      <TechTooltip term="Physics Divergence">
                        <span className="text-[#64748b] text-[10px] block cursor-help hover:text-amber-400">MODEL / PHYSICS RESIDUAL</span>
                      </TechTooltip>
                      <span className="text-[#cbd5e1] font-medium text-xs">
                        ΔT = {pidnnInference?.modelPhysicsDivergence?.divergenceDeltaC ?? '0.8'}°C (Bound: 4.5°C)
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      pidnnInference?.modelPhysicsDivergence?.divergenceDetected
                        ? 'bg-red-950 text-red-300 border border-red-600'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                    }`}>
                      {pidnnInference?.modelPhysicsDivergence?.divergenceDetected ? 'DIVERGENCE WARNING' : 'CONVERGENT (PASS)'}
                    </span>
                  </div>

                  {/* Primary Feature Attribution */}
                  <div className="p-3 rounded bg-[#0c0e12] border border-[#1a202c] flex items-center justify-between">
                    <div>
                      <span className="text-[#64748b] text-[10px] block">PRIMARY PREDICTION ATTRIBUTION</span>
                      <span className="text-[#f8fafc] text-xs font-medium">
                        {pidnnInference?.featureAttributions?.[0]?.featureName ?? 'Thermal Gradient (T_batt - T_amb)'}
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold text-xs bg-[#161a22] px-2 py-1 rounded border border-[#222836]">
                      {pidnnInference?.featureAttributions?.[0]?.weightPct ?? 32}% wt
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 1ST-LAW CONSERVATION & PHYSICS CONSTRAINTS */}
            {activeDiagnosticTab === 'physics' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[#cbd5e1] font-semibold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Physics Conservation & Thermodynamic Boundary Enforcements
                  </span>
                  <span className="text-[10px] text-[#64748b]">1st-Law Energy Conservation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <div>
                      <span className="text-[#cbd5e1] block">Thermal Consistency</span>
                      <span className="text-[10px] text-[#64748b]">|dT/dt| &le; 0.18 °C/s</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      physicsChecks?.thermalConsistency?.pass ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-300'
                    }`}>
                      {physicsChecks?.thermalConsistency?.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <div>
                      <span className="text-[#cbd5e1] block">SOC Boundary Compliance</span>
                      <span className="text-[10px] text-[#64748b]">0.0% &le; SOC &le; 100.0%</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      physicsChecks?.socBounds?.pass ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-300'
                    }`}>
                      {physicsChecks?.socBounds?.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <div>
                      <span className="text-[#cbd5e1] block">Capacity Monotonicity</span>
                      <span className="text-[10px] text-[#64748b]">dCap/dCycle &le; 0</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      physicsChecks?.capacityMonotonicity?.pass ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-300'
                    }`}>
                      {physicsChecks?.capacityMonotonicity?.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c0e12] border border-[#1a202c]">
                    <div>
                      <span className="text-[#cbd5e1] block">Arrhenius Trend Check</span>
                      <span className="text-[10px] text-[#64748b]">dR/dT &lt; 0 (Impedance growth)</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      physicsChecks?.resistanceTrend?.pass ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-300'
                    }`}>
                      {physicsChecks?.resistanceTrend?.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ENVIRONMENTAL STRESS CHAMBER */}
            {activeDiagnosticTab === 'chamber' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[#cbd5e1] font-semibold flex items-center gap-1.5 text-xs">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Environmental Chamber Ambient Stress Override
                  </span>
                  <span className="text-amber-400 font-bold text-xs">
                    Current T_amb: {environment?.ambientTempC?.toFixed(1) ?? -35.0}°C
                  </span>
                </div>

                <div className="p-3 rounded bg-[#0c0e12] border border-[#1a202c] space-y-2">
                  <div className="flex justify-between text-[10px] text-[#94a3b8]">
                    <span>Adjust Ambient Temperature:</span>
                    <span className="text-[#f8fafc] font-bold">
                      {environment?.ambientTempC?.toFixed(1) ?? -35.0}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="15"
                    step="1"
                    value={environment?.ambientTempC ?? -35.0}
                    onChange={(e) => onSetAmbientTemp(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#1e2430] rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-[#64748b]">
                    <span>-45°C (Extreme Cryo)</span>
                    <span>-35°C (Ladakh Nyoma)</span>
                    <span>-20°C (Cold Soak)</span>
                    <span>0°C (Freezing)</span>
                    <span>+15°C (Standard Lab)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
