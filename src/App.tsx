/**
 * LAERS — Battery Intelligence Engine
 * Main Workstation Application Shell
 * 
 * Physics-Informed Predictive BMS for Extreme-Altitude Reliability
 */

import React, { useState, useEffect } from 'react';
import { ActiveWorkspace, MetricTrace, BatterySpecs, EnvironmentalConditions, MissionProfile } from './core/types';
import { simulationEngine, CompleteEngineSnapshot } from './core/simulationEngine';
import { getMetricTrace } from './core/traceability';

// 6 Primary Workspaces
import { Navigation } from './components/common/Navigation';
import { Header } from './components/common/Header';
import { OverviewView } from './components/overview/OverviewView';
import { MissionSimulatorView } from './components/simulator/MissionSimulatorView';
import { PidnnEngineView } from './components/pidnn/PidnnEngineView';
import { DigitalTwinView } from './components/digitaltwin/DigitalTwinView';
import { WhatIfLabView } from './components/whatif/WhatIfLabView';
import { ArchitectureView } from './components/architecture/ArchitectureView';

// Secondary Tool Modals & Drawers
import { SihDemoModal } from './components/demo/SihDemoModal';
import { ModelInspectorModal } from './components/common/ModelInspectorModal';
import { TelemetryDrawer } from './components/common/TelemetryDrawer';
import { DatasetModal } from './components/common/DatasetModal';
import { EngineeringReportModal } from './components/common/EngineeringReportModal';
import { SettingsModal } from './components/common/SettingsModal';
import { TraceModal } from './components/common/TraceModal';
import { DocumentationModal } from './components/modals/DocumentationModal';

export default function App() {
  // Primary Workspace state (01 to 06)
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('overview');

  // Unified Closed-Loop Simulation Snapshot
  const [snapshot, setSnapshot] = useState<CompleteEngineSnapshot>(() => simulationEngine.getSnapshot());

  // Secondary Tools Modal States
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isModelInspectorOpen, setIsModelInspectorOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTrace, setActiveTrace] = useState<MetricTrace | null>(null);

  // Subscribe to real-time closed-loop simulation engine updates
  useEffect(() => {
    const unsubscribe = simulationEngine.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => unsubscribe();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable = target?.isContentEditable;
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable) {
        return;
      }

      // Space: Toggle Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        simulationEngine.togglePlayPause();
        return;
      }

      // R: Reset simulation
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          simulationEngine.resetState(-35.0, 88.0);
          return;
        }
      }

      // 1-6: Workspace Switching
      if (e.key === '1') {
        setActiveWorkspace('overview');
        return;
      }
      if (e.key === '2') {
        setActiveWorkspace('mission_lab');
        return;
      }
      if (e.key === '3') {
        setActiveWorkspace('pidnn_lab');
        return;
      }
      if (e.key === '4') {
        setActiveWorkspace('digital_twin');
        return;
      }
      if (e.key === '5') {
        setActiveWorkspace('whatif_lab');
        return;
      }
      if (e.key === '6') {
        setActiveWorkspace('architecture');
        return;
      }

      // T: Toggle Tools Menu
      if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setIsToolsOpen((prev) => !prev);
          return;
        }
      }

      // Esc: Dismiss active overlays and drawers
      if (e.key === 'Escape') {
        setIsDemoOpen(false);
        setIsModelInspectorOpen(false);
        setIsTelemetryOpen(false);
        setIsDatasetOpen(false);
        setIsReportOpen(false);
        setIsSettingsOpen(false);
        setIsDocumentationOpen(false);
        setActiveTrace(null);
        setIsToolsOpen(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Traceability Handler
  const handleOpenTrace = (metricKey: string) => {
    const trace = getMetricTrace(metricKey, snapshot);
    setActiveTrace(trace);
  };

  // Simulation Controls
  const handleTogglePlay = () => {
    simulationEngine.togglePlayPause();
  };

  const handleStepSimulation = () => {
    simulationEngine.step(5);
  };

  const handleResetSimulation = () => {
    simulationEngine.resetState(-35.0, 88.0);
  };

  const handleToggleThermalOverride = () => {
    const currentRequested = snapshot.thermalControl.heaterRequested;
    simulationEngine.setThermalOverride(!currentRequested);
  };

  const handleSetAmbientTemp = (tempC: number) => {
    simulationEngine.setAmbientTemperature(tempC);
  };

  const handleSetMissionProfile = (profile: MissionProfile) => {
    simulationEngine.setMissionProfile(profile);
  };

  const handleUpdateSpecs = (specs: BatterySpecs) => {
    simulationEngine.setSpecs(specs);
  };

  const handleUpdateEnv = (env: EnvironmentalConditions) => {
    simulationEngine.setEnvironment(env);
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e2e8f0] flex flex-col font-mono selection:bg-amber-500 selection:text-black">
      {/* 1. TOP ENGINEERING WORKSTATION HEADER */}
      <Header
        snapshot={snapshot}
        onTogglePlay={handleTogglePlay}
        onStepSimulation={handleStepSimulation}
        onResetSimulation={handleResetSimulation}
        onToggleThermalOverride={handleToggleThermalOverride}
        onOpenDemo={() => setIsDemoOpen(true)}
        onOpenModelInspector={() => setIsModelInspectorOpen(true)}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenDataset={() => setIsDatasetOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDocumentation={() => setIsDocumentationOpen(true)}
        isToolsOpen={isToolsOpen}
        onToggleToolsOpen={() => setIsToolsOpen((prev) => !prev)}
      />

      {/* 2. PRIMARY 6-WORKSPACE NAVIGATION STRIP */}
      <Navigation
        activeTab={activeWorkspace}
        onTabChange={setActiveWorkspace}
        isSimulating={snapshot.isPlaying}
      />

      {/* 3. MAIN WORKSPACE VIEWPORT (01 - 06) */}
      <main className="flex-1 w-full overflow-y-auto">
        {activeWorkspace === 'overview' && (
          <OverviewView
            snapshot={snapshot}
            onSelectWorkspace={setActiveWorkspace}
            onOpenTrace={handleOpenTrace}
            onToggleThermalOverride={handleToggleThermalOverride}
            onSetAmbientTemp={handleSetAmbientTemp}
          />
        )}

        {activeWorkspace === 'mission_lab' && (
          <MissionSimulatorView
            snapshot={snapshot}
            onSelectProfile={handleSetMissionProfile}
            onOpenTrace={handleOpenTrace}
          />
        )}

        {activeWorkspace === 'pidnn_lab' && (
          <PidnnEngineView
            snapshot={snapshot}
            onOpenTrace={handleOpenTrace}
            onRefreshInference={() => simulationEngine.step(0)}
          />
        )}

        {activeWorkspace === 'digital_twin' && (
          <DigitalTwinView
            snapshot={snapshot}
            onOpenTrace={handleOpenTrace}
            onToggleThermalOverride={handleToggleThermalOverride}
          />
        )}

        {activeWorkspace === 'whatif_lab' && (
          <WhatIfLabView
            snapshot={snapshot}
            onOpenTrace={handleOpenTrace}
          />
        )}

        {activeWorkspace === 'architecture' && (
          <ArchitectureView />
        )}
      </main>

      {/* 4. CONTEXTUAL SECONDARY TOOLS (DRAWERS & MODALS) */}
      <SihDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onSelectWorkspace={setActiveWorkspace}
        onSetAmbientTemp={handleSetAmbientTemp}
        onSetThermalOverride={(override) => simulationEngine.setThermalOverride(override)}
        onOpenReport={() => setIsReportOpen(true)}
      />

      <ModelInspectorModal
        isOpen={isModelInspectorOpen}
        onClose={() => setIsModelInspectorOpen(false)}
        pidnnOutput={snapshot.pidnnInference}
        onRetrainComplete={() => simulationEngine.step(0)}
      />

      <TelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        snapshot={snapshot}
        onForceStep={() => simulationEngine.step(0)}
      />

      <DatasetModal
        isOpen={isDatasetOpen}
        onClose={() => setIsDatasetOpen(false)}
      />

      <EngineeringReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        snapshot={snapshot}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        specs={snapshot.specs}
        env={snapshot.environment}
        onUpdateSpecs={handleUpdateSpecs}
        onUpdateEnv={handleUpdateEnv}
      />

      <TraceModal
        trace={activeTrace}
        onClose={() => setActiveTrace(null)}
      />

      <DocumentationModal
        isOpen={isDocumentationOpen}
        onClose={() => setIsDocumentationOpen(false)}
      />

      {/* 5. WORKSTATION FOOTER */}
      <footer className="border-t border-[#1e2432] bg-[#0c0e12] px-4 py-2 text-[10px] text-[#64748b] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[#94a3b8] font-semibold">LAERS</span>
          <span>•</span>
          <span>Physics-Informed Predictive BMS for Extreme-Altitude Reliability</span>
          <span>•</span>
          <span className="text-amber-400">Deterministic Closed-Loop Active</span>
        </div>
        <div className="text-[10px]">
          Research & Engineering Evaluation Prototype (Pending Environmental Chamber Testing)
        </div>
      </footer>
    </div>
  );
}
