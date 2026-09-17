/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Overview Isometric Battery Pack Visualization
 * 
 * 24-Cell 6S4P Pack Representation:
 * - 6 Series Modules (S1 to S6) x 4 Parallel Branches (P1 to P4)
 * - True dimensional isometric CAD perspective rendered via SVG
 * - Live per-cell temperature distribution from digitalTwin.cellTemperaturesC
 * - Core vs Perimeter thermal gradient visualization
 * - Dual-zone etched-foil heating membrane under-layer
 * - Interactive: Hover/click cell to inspect local status
 * - Clicking the pack navigates to the Digital Twin Lab
 */

import React, { useState } from 'react';
import { Layers, Flame, ArrowUpRight, Thermometer, Zap, Info } from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';

interface IsometricBatteryPackProps {
  snapshot: CompleteEngineSnapshot;
  onOpenDigitalTwin: () => void;
}

export const IsometricBatteryPack: React.FC<IsometricBatteryPackProps> = ({
  snapshot,
  onOpenDigitalTwin,
}) => {
  const { digitalTwin, sharedMissionState, thermalControl, specs } = snapshot;

  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);

  const packTempC = digitalTwin?.batteryTempC ?? sharedMissionState?.batteryTemperature ?? -35.0;
  const ambTempC = digitalTwin?.ambientTempC ?? sharedMissionState?.ambientTemperature ?? -35.0;
  const packVoltage = digitalTwin?.voltageV ?? sharedMissionState?.voltage ?? 22.2;
  const isHeating = thermalControl?.heaterRequested ?? ((sharedMissionState?.heaterPower ?? 0) > 0);
  const heaterPowerW = isHeating ? (thermalControl?.heaterPowerW ?? 48.0) : 0;

  // 24 cell temperatures from Digital Twin, or physically derived gradient fallback
  const cellTemps: number[] = React.useMemo(() => {
    if (digitalTwin?.cellTemperaturesC && digitalTwin.cellTemperaturesC.length >= 24) {
      return digitalTwin.cellTemperaturesC;
    }
    const perimeterGradient = Math.max(0, (packTempC - ambTempC) * 0.08);
    const temps: number[] = [];
    for (let i = 0; i < 24; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const isPerimeter = row === 0 || row === 5 || col === 0 || col === 3;
      const t = isPerimeter ? packTempC - perimeterGradient : packTempC + perimeterGradient * 0.4;
      temps.push(Number(t.toFixed(1)));
    }
    return temps;
  }, [digitalTwin?.cellTemperaturesC, packTempC, ambTempC]);

  // 6 series voltages
  const seriesVoltages: number[] = React.useMemo(() => {
    if (digitalTwin?.cellVoltagesV && digitalTwin.cellVoltagesV.length >= 6) {
      return digitalTwin.cellVoltagesV;
    }
    const baseV = packVoltage / 6.0;
    return [baseV - 0.01, baseV, baseV + 0.005, baseV + 0.005, baseV, baseV - 0.01];
  }, [digitalTwin?.cellVoltagesV, packVoltage]);

  // Determine active cell for detail readout (either hovered or default to S3P2 core cell)
  const activeCellIdx = hoveredCellIdx !== null ? hoveredCellIdx : 9; // S3P2 (cell #9)
  const activeSeries = Math.floor(activeCellIdx / 4) + 1;
  const activeParallel = (activeCellIdx % 4) + 1;
  const activeTemp = cellTemps[activeCellIdx] ?? packTempC;
  const activeVolt = seriesVoltages[activeSeries - 1] ?? (packVoltage / 6.0);
  const isPerimeterCell = activeSeries === 1 || activeSeries === 6 || activeParallel === 1 || activeParallel === 4;

  // Temperature color helper strictly matching aerospace engineering theme
  const getCellFill = (t: number, isHovered: boolean) => {
    if (isHovered) {
      return {
        top: '#3b82f6', // subtle focus indicator
        left: '#1d4ed8',
        right: '#1e40af',
        border: '#93c5fd',
      };
    }
    if (t <= -30) {
      return {
        top: '#131d2e', // deep cryogenic slate
        left: '#0c1320',
        right: '#0f1726',
        border: '#25354e',
      };
    }
    if (t <= -15) {
      return {
        top: '#182234', // cold soak
        left: '#101724',
        right: '#131b2a',
        border: '#2e4161',
      };
    }
    if (t <= 0) {
      return {
        top: '#21201c', // sub-zero transition
        left: '#171614',
        right: '#1c1b18',
        border: '#78350f',
      };
    }
    if (t <= 20) {
      return {
        top: '#142219', // nominal flight window
        left: '#0e1812',
        right: '#101d15',
        border: '#065f46',
      };
    }
    return {
      top: '#2d1b18', // elevated
      left: '#1e1210',
      right: '#241614',
      border: '#991b1b',
    };
  };

  // Isometric projection geometry constants
  // 6 Series modules along U axis (u: 0..5), 4 Parallel cells along V axis (v: 0..3)
  const uCount = 6;
  const vCount = 4;
  const cellHalfW = 20; // horizontal spread
  const cellHalfH = 11; // vertical slant
  const cellHeight = 14; // prism 3D extrusion height
  const originX = 185;  // center of SVG canvas (400px wide)
  const originY = 65;   // top offset

  return (
    <div className="p-3.5 rounded bg-[#12151c] border border-[#222836] space-y-3 font-mono text-xs">
      {/* Component Header with Direct Link to Digital Twin */}
      <div className="flex items-center justify-between border-b border-[#222836] pb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-[#f8fafc] text-xs">
            24-CELL 6S4P BATTERY PACK
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1a202c] text-amber-300 font-medium">
            ISOMETRIC SVG PROJECTION
          </span>
        </div>

        <button
          onClick={onOpenDigitalTwin}
          className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer px-2 py-0.5 rounded bg-[#181d26] border border-amber-500/30 hover:border-amber-500/60"
        >
          <span>OPEN DIGITAL TWIN</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Interactive 3D Isometric SVG Container */}
      <div 
        onClick={onOpenDigitalTwin}
        className="p-2 rounded bg-[#090b0e] border border-[#1e2430] hover:border-amber-500/40 transition cursor-pointer relative group"
        title="Click anywhere to inspect in the full Digital Twin Lab"
      >
        <div className="flex justify-between text-[10px] text-[#64748b] mb-1 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            6S4P Physical Derivation (NMC811)
          </span>
          <span className="text-amber-400 font-semibold group-hover:underline">
            Click Pack to Launch Lab →
          </span>
        </div>

        {/* The SVG Isometric Canvas */}
        <svg 
          viewBox="0 0 370 190" 
          className="w-full h-auto max-h-52 select-none overflow-visible"
        >
          <defs>
            {/* Aerogel base tray gradient */}
            <linearGradient id="trayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#141a24" />
              <stop offset="100%" stopColor="#0c1017" />
            </linearGradient>
            {/* Active heater glow gradient */}
            <linearGradient id="heaterGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* 1. AEROGEL ENCLOSURE BASE TRAY */}
          {/* Points calculated from bounding box of the 6x4 array */}
          <polygon
            points="
              185,28 
              345,108 
              185,188 
              25,108
            "
            fill="url(#trayGrad)"
            stroke="#263346"
            strokeWidth="1.5"
          />

          {/* Tray 3D Rim / Thickness */}
          <polygon
            points="
              25,108 
              185,188 
              185,193 
              25,113
            "
            fill="#090d14"
            stroke="#1b2533"
            strokeWidth="1"
          />
          <polygon
            points="
              185,188 
              345,108 
              345,113 
              185,193
            "
            fill="#0f1520"
            stroke="#1b2533"
            strokeWidth="1"
          />

          {/* 2. DUAL-ZONE ETCHED-FOIL HEATER MEMBRANE BASE TRACES */}
          {isHeating && (
            <g opacity="0.85">
              {/* Heating trace zone 1 (Baseplate) */}
              <polygon
                points="185,38 330,110 185,180 40,110"
                fill="none"
                stroke="url(#heaterGlow)"
                strokeWidth="3"
                strokeDasharray="6 3"
              />
              {/* Heating trace zone 2 (Core loop) */}
              <polygon
                points="185,55 285,110 185,162 85,110"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </g>
          )}

          {/* 3. 24 ISOMETRIC PRISMATIC BATTERY CELLS */}
          {/* Render back-to-front (order by u + v ascending) to ensure correct depth occlusion */}
          {Array.from({ length: uCount + vCount - 1 }).map((_, sum) => {
            return Array.from({ length: uCount }).map((_, u) => {
              const v = sum - u;
              if (v < 0 || v >= vCount) return null;

              const cellIdx = u * 4 + v;
              const tCell = cellTemps[cellIdx] ?? packTempC;
              const isHovered = hoveredCellIdx === cellIdx;
              const colors = getCellFill(tCell, isHovered);

              // Isometric Center Coordinate
              const cx = originX + (u - v) * cellHalfW;
              const cy = originY + (u + v) * cellHalfH;

              // Top face polygon points
              const topP1 = `${cx},${cy - cellHeight}`;
              const topP2 = `${cx + cellHalfW * 0.88},${cy + cellHalfH * 0.88 - cellHeight}`;
              const topP3 = `${cx},${cy + cellHalfH * 1.76 - cellHeight}`;
              const topP4 = `${cx - cellHalfW * 0.88},${cy + cellHalfH * 0.88 - cellHeight}`;

              // Left face polygon points
              const leftP1 = `${cx - cellHalfW * 0.88},${cy + cellHalfH * 0.88 - cellHeight}`;
              const leftP2 = `${cx},${cy + cellHalfH * 1.76 - cellHeight}`;
              const leftP3 = `${cx},${cy + cellHalfH * 1.76}`;
              const leftP4 = `${cx - cellHalfW * 0.88},${cy + cellHalfH * 0.88}`;

              // Right face polygon points
              const rightP1 = `${cx},${cy + cellHalfH * 1.76 - cellHeight}`;
              const rightP2 = `${cx + cellHalfW * 0.88},${cy + cellHalfH * 0.88 - cellHeight}`;
              const rightP3 = `${cx + cellHalfW * 0.88},${cy + cellHalfH * 0.88}`;
              const rightP4 = `${cx},${cy + cellHalfH * 1.76}`;

              return (
                <g 
                  key={cellIdx}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredCellIdx(cellIdx);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    setHoveredCellIdx(null);
                  }}
                  className="transition cursor-pointer"
                >
                  {/* Left Face */}
                  <polygon
                    points={`${leftP1} ${leftP2} ${leftP3} ${leftP4}`}
                    fill={colors.left}
                    stroke="#000000"
                    strokeWidth="0.5"
                  />

                  {/* Right Face */}
                  <polygon
                    points={`${rightP1} ${rightP2} ${rightP3} ${rightP4}`}
                    fill={colors.right}
                    stroke="#000000"
                    strokeWidth="0.5"
                  />

                  {/* Top Face */}
                  <polygon
                    points={`${topP1} ${topP2} ${topP3} ${topP4}`}
                    fill={colors.top}
                    stroke={colors.border}
                    strokeWidth={isHovered ? '1.5' : '0.8'}
                  />

                  {/* Cell Label (Temperature) on Top Face */}
                  <text
                    x={cx}
                    y={cy + cellHalfH * 0.88 - cellHeight + 3}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill={isHovered ? '#ffffff' : tCell < -20 ? '#cbd5e1' : '#f59e0b'}
                  >
                    {Math.round(tCell)}°
                  </text>
                </g>
              );
            });
          })}

          {/* Busbar indicators */}
          <text x="32" y="105" fill="#64748b" fontSize="8" fontFamily="monospace">
            - BUSBAR
          </text>
          <text x="290" y="105" fill="#ef4444" fontSize="8" fontFamily="monospace">
            + TERMINAL
          </text>
        </svg>

        {/* Active Thermal & Heater Overlay Status */}
        <div className="flex items-center justify-between text-[10px] text-[#94a3b8] px-1 pt-1 border-t border-[#181f2c]">
          <span className="flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-amber-400" />
            <span>Grad: <strong className="text-[#f8fafc]">{(Math.max(...cellTemps) - Math.min(...cellTemps)).toFixed(1)}°C</strong> spread</span>
          </span>

          <span className="flex items-center gap-1">
            <Flame className={`w-3 h-3 ${isHeating ? 'text-amber-400' : 'text-[#64748b]'}`} />
            <span className={isHeating ? 'text-amber-300 font-bold' : 'text-[#64748b]'}>
              {isHeating ? `Heater Active (${heaterPowerW}W)` : 'Heater Standby'}
            </span>
          </span>
        </div>
      </div>

      {/* Interactive Hover / Active Cell Readout Card */}
      <div className="p-2.5 rounded bg-[#0c0e12] border border-[#1e2430] space-y-1 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#f8fafc] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            CELL S{activeSeries}P{activeParallel} (#{activeCellIdx + 1} of 24)
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
            isPerimeterCell ? 'bg-[#182130] text-blue-300' : 'bg-[#1f2214] text-amber-300'
          }`}>
            {isPerimeterCell ? 'PERIMETER CELL' : 'CORE CELL'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 pt-0.5">
          <div className="p-1 rounded bg-[#12151c] text-center">
            <span className="text-[9px] text-[#64748b] block">LOCAL TEMP</span>
            <span className="font-bold text-[#f8fafc]">{activeTemp.toFixed(1)}°C</span>
          </div>
          <div className="p-1 rounded bg-[#12151c] text-center">
            <span className="text-[9px] text-[#64748b] block">SERIES VOLT</span>
            <span className="font-bold text-emerald-400">{activeVolt.toFixed(3)}V</span>
          </div>
          <div className="p-1 rounded bg-[#12151c] text-center">
            <span className="text-[9px] text-[#64748b] block">ΔT VS CORE</span>
            <span className="font-bold text-amber-300">
              {(activeTemp - packTempC) >= 0 ? '+' : ''}{(activeTemp - packTempC).toFixed(1)}°C
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
