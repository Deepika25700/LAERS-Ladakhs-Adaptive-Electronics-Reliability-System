/**
 * LAERS — Battery Intelligence Engine
 * Workspace 04: Digital Twin (24-Cell Hero CAD & 3D Isometric Pack Model)
 * 
 * 6S4P Pack Architecture:
 * - 24 Low-Temp NMC811/Si-C Cells (6 Series x 4 Parallel)
 * - Large HERO interactive 3D isometric pack with true mathematical projection
 * - Top-down CAD cross-section mode with layer toggles (Cells, Heaters, Aerogel, Sensors)
 * - Cell-level telemetry inspection: position (S1..S6, P1..P4), temperature, gradient, voltage spread
 * - Thermal boundary behavior: 8mm silica aerogel envelope (R_th = 0.42 K/W)
 * - Dual-zone thin-film etched-foil heating membrane state (Zone 1 & 2)
 * - Secondary engineering telemetry panel beneath hero pack
 */

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Flame, 
  Zap, 
  Thermometer, 
  Activity, 
  ShieldCheck, 
  Sliders, 
  Info,
  Maximize2,
  Box,
  LayoutGrid,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { BatteryTelemetry } from '../../core/types';
import { TechTooltip } from '../common/TechTooltip';

interface DigitalTwinViewProps {
  snapshot: CompleteEngineSnapshot;
  onOpenTrace: (metricKey: string) => void;
  onToggleThermalOverride: () => void;
}

type ViewMode = 'isometric' | 'cad';
type FilterLayer = 'all' | 'cells' | 'heaters' | 'aerogel' | 'sensors';

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({
  snapshot,
  onOpenTrace,
  onToggleThermalOverride,
}) => {
  const dt = snapshot.digitalTwin;
  const shared = snapshot.sharedMissionState;
  const tc = snapshot.thermalControl;
  const pf = snapshot.physicsFeatures;
  const deg = snapshot.degradation;
  const specs = snapshot.specs;

  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [selectedCellIdx, setSelectedCellIdx] = useState<number>(9); // S3P2 core cell default
  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);
  const [filterLayer, setFilterLayer] = useState<FilterLayer>('all');

  // Temperatures & Telemetry
  const packTempC = dt?.batteryTempC ?? shared?.batteryTemperature ?? -35.0;
  const ambTempC = dt?.ambientTempC ?? shared?.ambientTemperature ?? -35.0;
  const voltageV = dt?.voltageV ?? shared?.voltage ?? 22.2;
  const currentA = dt?.currentA ?? shared?.current ?? 0.0;
  const socPct = dt?.socPct ?? shared?.soc ?? 88.0;
  const sohPct = deg?.currentSohPct ?? dt?.sohPct ?? shared?.soh ?? 97.0;
  const rIntMOhm = dt?.internalResistanceMOhm ?? shared?.internalResistance ?? 38.0;
  const voltageSagV = snapshot.pidnnInference?.predictions?.voltageSagV ?? (currentA * (rIntMOhm / 1000.0));
  const heaterActive = tc?.heaterRequested ?? (shared?.heaterPower > 0);
  const heaterPowerW = heaterActive ? (tc?.heaterPowerW ?? shared?.heaterPower ?? 48.0) : 0.0;
  const heaterEnergyWh = dt?.heaterEnergyWh ?? shared?.heaterEnergy ?? snapshot.missionRisk?.heaterEnergySpentWh ?? 0.0;
  const voltageSpreadMv = dt?.voltageSpreadMv ?? 18.0;
  const aerogelRth = specs?.thermalResistanceK_W || 0.42;
  const aerogelFluxWm2 = pf?.aerogelHeatFluxWm2 ?? Math.max(0, (packTempC - ambTempC) / aerogelRth);

  // 24-cell temperature array
  const cellTemps: number[] = useMemo(() => {
    if (dt?.cellTemperaturesC && dt.cellTemperaturesC.length >= 24) {
      return dt.cellTemperaturesC;
    }
    const perimeterGradient = Math.max(0, (packTempC - ambTempC) * 0.08);
    const result: number[] = [];
    for (let i = 0; i < 24; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const isPerimeter = row === 0 || row === 5 || col === 0 || col === 3;
      const t = isPerimeter ? packTempC - perimeterGradient : packTempC + perimeterGradient * 0.4;
      result.push(Number(t.toFixed(1)));
    }
    return result;
  }, [dt?.cellTemperaturesC, packTempC, ambTempC]);

  // 6 series voltages
  const seriesVoltages: number[] = useMemo(() => {
    if (dt?.cellVoltagesV && dt.cellVoltagesV.length >= 6) {
      return dt.cellVoltagesV;
    }
    const baseV = voltageV / 6.0;
    const result: number[] = [];
    for (let s = 0; s < 6; s++) {
      const isEnd = s === 0 || s === 5;
      const v = isEnd ? baseV - 0.008 * (currentA / 20.0) : baseV + 0.004 * (currentA / 20.0);
      result.push(Number(v.toFixed(3)));
    }
    return result;
  }, [dt?.cellVoltagesV, voltageV, currentA]);

  // Selected cell metrics
  const activeIdx = hoveredCellIdx !== null ? hoveredCellIdx : selectedCellIdx;
  const seriesGroup = Math.floor(activeIdx / 4) + 1; // S1..S6
  const parallelBranch = (activeIdx % 4) + 1;        // P1..P4
  const cellTemp = cellTemps[activeIdx] ?? packTempC;
  const cellVolt = seriesVoltages[seriesGroup - 1] ?? (voltageV / 6.0);
  const isPerimeter = seriesGroup === 1 || seriesGroup === 6 || parallelBranch === 1 || parallelBranch === 4;
  const cellDeltaFromCore = Number((cellTemp - packTempC).toFixed(1));

  const isCornerCell = activeIdx === 0 || activeIdx === 3 || activeIdx === 20 || activeIdx === 23;
  const isCoreRtdCell = activeIdx === 9 || activeIdx === 14;
  const sensorType = isCornerCell
    ? `NTC 10k Thermistor Tab #${activeIdx === 0 ? 1 : activeIdx === 3 ? 2 : activeIdx === 20 ? 3 : 4} (Perimeter Cold Zone)`
    : isCoreRtdCell
    ? `PT1000 4-Wire RTD Core Sensor #${activeIdx === 9 ? 1 : 2} (Active Joule Core)`
    : `Series Busbar Voltage Sensor Tap S${seriesGroup}`;

  // Mathematical 3D Isometric Projection Helper
  // Canvas: 650x360 SVG, 6 Series x 4 Parallel prisms
  const uCount = 6;
  const vCount = 4;
  const cellHalfW = 34;
  const cellHalfH = 18;
  const cellHeight = 24;
  const originX = 310;
  const originY = 85;

  const getIsometricFaceColors = (t: number, isSelected: boolean) => {
    if (isSelected) {
      return {
        top: '#3b82f6',
        left: '#1d4ed8',
        right: '#1e40af',
        stroke: '#93c5fd',
      };
    }
    if (t <= -30) {
      return {
        top: '#142034',
        left: '#0c1422',
        right: '#101a2c',
        stroke: '#293d61',
      };
    }
    if (t <= -15) {
      return {
        top: '#1b2a42',
        left: '#101c2e',
        right: '#16233a',
        stroke: '#364e75',
      };
    }
    if (t <= 0) {
      return {
        top: '#2b2416',
        left: '#1c160a',
        right: '#221c10',
        stroke: '#855314',
      };
    }
    if (t <= 20) {
      return {
        top: '#142b1f',
        left: '#0b1c13',
        right: '#102419',
        stroke: '#0d7853',
      };
    }
    return {
      top: '#381c18',
      left: '#240f0c',
      right: '#2e1511',
      stroke: '#a82c2c',
    };
  };

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto text-[#cbd5e1]">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 04</span>
            <span className="text-[#334155]">•</span>
            <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase">DIGITAL TWIN</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            6S4P battery pack topology, mathematical isometric projection, cell gradients & etched-foil thermal membranes
          </p>
        </div>

        {/* View Switcher & Layer Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#0b0e14] p-1 rounded border border-[#1e2432]">
            <button
              onClick={() => setViewMode('isometric')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                viewMode === 'isometric'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Isometric Projection</span>
            </button>
            <button
              onClick={() => setViewMode('cad')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                viewMode === 'cad'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>CAD Cross-Section</span>
            </button>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-[#11141b] border border-[#1e2432] text-amber-300 font-semibold">
            NMC811 / SI-C 6S4P
          </span>
        </div>
      </div>

      {/* 2. THE HERO 24-CELL PACK VISUALIZATION & CELL INSPECTOR (HERO SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* HERO PACK VISUALIZATION (8 COLS) */}
        <div className="lg:col-span-8 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
                {viewMode === 'isometric' ? '24-CELL ISOMETRIC THERMAL FIELD' : 'CAD STRUCTURAL CROSS-SECTION'}
              </span>
              <span className="text-[10px] text-[#64748b]">
                Click or hover any cell to inspect local telemetry
              </span>
            </div>

            {/* Thermal Palette Legend */}
            <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#142034] border border-[#293d61]" />
                &lt; -30°C
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2b2416] border border-[#855314]" />
                -15 to 0°C
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#142b1f] border border-[#0d7853]" />
                &gt; 0°C
              </span>
            </div>
          </div>

          {/* VIEWPORT: ISOMETRIC OR CAD */}
          <div className="p-3 rounded bg-[#090b10] border border-[#1e2432] relative select-none flex items-center justify-center min-h-[380px]">
            {viewMode === 'isometric' ? (
              /* HERO 3D ISOMETRIC PACK SVG */
              <svg viewBox="0 0 650 370" className="w-full h-auto max-h-[440px]">
                {/* 1. Outer Aerogel Insulation Blanket Base Plate */}
                <polygon
                  points="310,25 615,188 310,350 5,188"
                  fill="#0e131d"
                  stroke="#26354a"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <text x="310" y="44" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  8mm SILICA AEROGEL ENVELOPE (R_th = {aerogelRth.toFixed(2)} K/W)
                </text>

                {/* 2. Dual-Zone Etched-Foil Heating Membrane Under-Layer */}
                <polygon
                  points="310,48 580,192 310,336 40,192"
                  fill={heaterActive ? '#26170d' : '#121722'}
                  stroke={heaterActive ? '#f59e0b' : '#1e293b'}
                  strokeWidth={heaterActive ? '2' : '1'}
                />
                {heaterActive && (
                  <text x="310" y="325" fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    ACTIVE HEATING MEMBRANE ({heaterPowerW.toFixed(0)}W DUAL-ZONE DISSIPATION)
                  </text>
                )}

                {/* 3. 24 Prismatic Battery Cells (Rendered back-to-front for painter's depth algorithm) */}
                {Array.from({ length: uCount }).map((_, u) =>
                  Array.from({ length: vCount }).map((_, v) => {
                    const cellIdx = u * vCount + v;
                    const isSelected = cellIdx === activeIdx;
                    const t = cellTemps[cellIdx] ?? packTempC;
                    const fill = getIsometricFaceColors(t, isSelected);

                    // Isometric Projection Geometry
                    const cx = originX + (u - v) * cellHalfW;
                    const cy = originY + (u + v) * cellHalfH;

                    // 4 vertices of top diamond
                    const pTop = `${cx},${cy - cellHalfH}`;
                    const pRight = `${cx + cellHalfW},${cy}`;
                    const pBottom = `${cx},${cy + cellHalfH}`;
                    const pLeft = `${cx - cellHalfW},${cy}`;

                    // 3D extrusion bottom vertices
                    const pBottomExt = `${cx},${cy + cellHalfH + cellHeight}`;
                    const pLeftExt = `${cx - cellHalfW},${cy + cellHeight}`;
                    const pRightExt = `${cx + cellHalfW},${cy + cellHeight}`;

                    return (
                      <g
                        key={cellIdx}
                        onClick={() => setSelectedCellIdx(cellIdx)}
                        onMouseEnter={() => setHoveredCellIdx(cellIdx)}
                        onMouseLeave={() => setHoveredCellIdx(null)}
                        className="cursor-pointer transition duration-150"
                      >
                        {/* Left extruded face */}
                        <polygon
                          points={`${pLeft},${pBottom},${pBottomExt},${pLeftExt}`}
                          fill={fill.left}
                          stroke={fill.stroke}
                          strokeWidth={isSelected ? '2' : '1'}
                        />
                        {/* Right extruded face */}
                        <polygon
                          points={`${pBottom},${pRight},${pRightExt},${pBottomExt}`}
                          fill={fill.right}
                          stroke={fill.stroke}
                          strokeWidth={isSelected ? '2' : '1'}
                        />
                        {/* Top diamond face */}
                        <polygon
                          points={`${pTop},${pRight},${pBottom},${pLeft}`}
                          fill={fill.top}
                          stroke={fill.stroke}
                          strokeWidth={isSelected ? '2.5' : '1.2'}
                        />
                        {/* Cell Series/Parallel identifier & Temp */}
                        <text
                          x={cx}
                          y={cy - 2}
                          fill={isSelected ? '#ffffff' : '#cbd5e1'}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          S{u + 1}P{v + 1}
                        </text>
                        <text
                          x={cx}
                          y={cy + 8}
                          fill={isSelected ? '#fde68a' : t < -25 ? '#93c5fd' : '#f59e0b'}
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {t.toFixed(1)}°
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            ) : (
              /* CAD TOP-DOWN CROSS-SECTION VIEW */
              <div className="w-full space-y-3 p-3">
                <div className="p-3 rounded-lg border-2 border-dashed border-[#334155] bg-[#0c0f16] space-y-2">
                  <div className="flex justify-between text-[10px] text-amber-300 font-bold border-b border-[#1c2432] pb-1.5">
                    <span>SILICA AEROGEL THERMAL BARRIER (8mm)</span>
                    <span>FLUX: {aerogelFluxWm2.toFixed(1)} W/m²</span>
                  </div>

                  {/* 6S4P Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {Array.from({ length: 24 }).map((_, idx) => {
                      const s = Math.floor(idx / 4) + 1;
                      const p = (idx % 4) + 1;
                      const isSel = idx === activeIdx;
                      const t = cellTemps[idx] ?? packTempC;
                      const v = seriesVoltages[s - 1] ?? 3.7;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedCellIdx(idx)}
                          className={`p-2.5 rounded border text-left cursor-pointer transition ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 text-[#f8fafc]'
                              : 'bg-[#121620] border-[#222c3e] text-[#94a3b8] hover:border-[#475569]'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="font-bold text-[#f8fafc]">S{s}P{p}</span>
                            <span className={t < -20 ? 'text-blue-400' : 'text-amber-400'}>{t.toFixed(1)}°C</span>
                          </div>
                          <div className="text-[9px] text-[#64748b]">Tap: {v.toFixed(3)}V</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CELL & THERMAL BOUNDARY INSPECTOR (4 COLS) */}
        <div className="lg:col-span-4 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-[#1e2432] pb-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
                  CELL S{seriesGroup}P{parallelBranch} TELEMETRY
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold">
                  CELL #{activeIdx + 1} OF 24
                </span>
              </div>
              <span className="text-[10px] text-[#64748b] block mt-0.5">
                {isPerimeter ? 'Perimeter cell (high convective loss)' : 'Geometric core cell (high Joule retention)'}
              </span>
            </div>

            {/* Selected Cell Parameters */}
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">TEMPERATURE</span>
                <div className="text-right">
                  <span className="text-base font-bold text-[#f8fafc]">{cellTemp.toFixed(1)}°C</span>
                  <span className="text-[10px] text-amber-400 block">ΔT core: {cellDeltaFromCore > 0 ? `+${cellDeltaFromCore}` : cellDeltaFromCore}°C</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] flex justify-between items-baseline">
                <span className="text-[#64748b] text-[11px] font-bold uppercase">VOLTAGE TAP</span>
                <div className="text-right">
                  <span className="text-base font-bold text-amber-400">{cellVolt.toFixed(3)} V</span>
                  <span className="text-[10px] text-[#64748b] block">Dispersion: ±{voltageSpreadMv.toFixed(1)} mV</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
                <span className="text-[#64748b] text-[10px] font-bold uppercase block">HARDWARE SENSOR PROXIMITY</span>
                <div className="text-[11px] text-[#f8fafc] font-semibold">{sensorType}</div>
              </div>

              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
                <TechTooltip term="Aerogel">
                  <span className="text-[#64748b] text-[10px] font-bold uppercase block cursor-help hover:text-amber-400">AEROGEL BOUNDARY</span>
                </TechTooltip>
                <div className="text-[11px] text-[#94a3b8]">
                  Thickness: 8mm • Conductivity: 0.015 W/m·K • R_th: {aerogelRth.toFixed(2)} K/W
                </div>
              </div>
            </div>
          </div>

          {/* Quick Manual Heater Toggle */}
          <div className="pt-2 border-t border-[#1e2432]">
            <button
              onClick={onToggleThermalOverride}
              className={`w-full py-2 px-3 rounded text-[11px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-2 border ${
                heaterActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-[#0b0e14] border-[#1e2432] text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${heaterActive ? (snapshot.isPlaying ? 'text-amber-400 animate-pulse' : 'text-amber-400') : 'text-[#64748b]'}`} />
              <span>{heaterActive ? 'DEACTIVATE MEMBRANE HEATER' : 'ACTIVATE MEMBRANE HEATER (48W)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY ENGINEERING TELEMETRY ROW (BENEATH HERO PACK) */}
      <div className="rounded bg-[#11141b] border border-[#1e2432] divide-y sm:divide-y-0 sm:divide-x divide-[#1e2432] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="p-3">
          <span className="text-[#64748b] text-[10px] uppercase font-bold block">TERMINAL VOLTAGE</span>
          <div className="text-base font-bold text-[#f8fafc] mt-0.5">{voltageV.toFixed(2)} V</div>
          <TechTooltip term="Voltage Sag">
            <span className="text-[10px] text-red-400 block mt-0.5 cursor-help hover:underline">-{voltageSagV.toFixed(2)}V projected sag</span>
          </TechTooltip>
        </div>

        <div className="p-3">
          <span className="text-[#64748b] text-[10px] uppercase font-bold block">DISCHARGE CURRENT</span>
          <div className="text-base font-bold text-[#f8fafc] mt-0.5">{currentA.toFixed(1)} A</div>
          <span className="text-[10px] text-[#64748b] block mt-0.5">{(voltageV * currentA).toFixed(0)} W power</span>
        </div>

        <div className="p-3">
          <span className="text-[#64748b] text-[10px] uppercase font-bold block">CORE TEMPERATURE</span>
          <div className="text-base font-bold text-amber-400 mt-0.5">{packTempC.toFixed(1)}°C</div>
          <span className="text-[10px] text-[#64748b] block mt-0.5">Ambient: {ambTempC}°C sink</span>
        </div>

        <div className="p-3">
          <TechTooltip term="Internal Resistance">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block cursor-help hover:text-amber-400">INTERNAL RESISTANCE</span>
          </TechTooltip>
          <div className="text-base font-bold text-amber-400 mt-0.5">{rIntMOhm.toFixed(1)} mΩ</div>
          <span className="text-[10px] text-[#64748b] block mt-0.5">18.5 mΩ room baseline</span>
        </div>

        <div className="p-3">
          <TechTooltip term="SOC">
            <span className="text-[#64748b] text-[10px] uppercase font-bold block cursor-help hover:text-amber-400">STATE OF CHARGE</span>
          </TechTooltip>
          <div className="text-base font-bold text-emerald-400 mt-0.5">{socPct.toFixed(1)}%</div>
          <TechTooltip term="SOH">
            <span className="text-[10px] text-[#64748b] block mt-0.5 cursor-help hover:text-[#94a3b8]">SOH: {sohPct.toFixed(1)}%</span>
          </TechTooltip>
        </div>

        <div className="p-3">
          <span className="text-[#64748b] text-[10px] uppercase font-bold block">HEATER EXPENDITURE</span>
          <div className="text-base font-bold text-amber-300 mt-0.5">{heaterEnergyWh.toFixed(2)} Wh</div>
          <span className="text-[10px] text-amber-400/80 block mt-0.5">Cumulative monotonic</span>
        </div>
      </div>
    </div>
  );
};
