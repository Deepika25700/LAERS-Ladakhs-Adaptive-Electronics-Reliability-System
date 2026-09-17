/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Overview Engineering Telemetry Monitor
 * 
 * Multi-Channel Aerospace Telemetry Visualization:
 * - 5 Selectable Channels: Temperature (Envelope), Voltage & Sag, Load Current, SOC, Thermal Stress
 * - Continuous smooth monotone curves with subtle aerospace gradient fills
 * - Minimum / Average / Maximum cell temperature envelope
 * - Ambient reference boundary
 * - Vertical live mission-time marker (follows simulation time)
 * - Custom aerospace hover tooltip with exact timestamps, phases, and deltas
 * - Physical threshold reference lines (0°C Freezing, -20°C Cryo, 18.0V Cutoff, 15% SOC)
 */

import React, { useState, useMemo } from 'react';
import { 
  Thermometer, 
  Zap, 
  Activity, 
  Battery, 
  ShieldAlert, 
  Clock, 
  Sliders,
  ChevronRight,
  Flame,
  Radio
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Legend
} from 'recharts';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface EngineeringTelemetryChartProps {
  snapshot: CompleteEngineSnapshot;
  onOpenMissionLab: () => void;
}

export type TelemetryChannel = 'temperature' | 'voltage' | 'current' | 'soc' | 'stress';

export const EngineeringTelemetryChart: React.FC<EngineeringTelemetryChartProps> = ({
  snapshot,
  onOpenMissionLab,
}) => {
  const {
    telemetryHistory,
    specs,
    missionProfile,
    timestampSec,
    digitalTwin,
    sharedMissionState,
  } = snapshot;

  const [activeChannel, setActiveChannel] = useState<TelemetryChannel>('temperature');

  // Format and build smooth telemetry dataset from real history
  const chartData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      // Fallback single initial point if history is empty
      const tCore = digitalTwin?.batteryTempC ?? sharedMissionState?.batteryTemperature ?? -35.0;
      const tAmb = digitalTwin?.ambientTempC ?? sharedMissionState?.ambientTemperature ?? -35.0;
      return [{
        timeSec: timestampSec,
        timeMin: (timestampSec / 60).toFixed(1),
        tCore,
        tMin: tCore - 2.0,
        tMax: tCore + 1.0,
        tAmb,
        voltage: digitalTwin?.voltageV ?? 22.2,
        current: digitalTwin?.currentA ?? 0,
        soc: digitalTwin?.socPct ?? 88.0,
        rInt: digitalTwin?.internalResistanceMOhm ?? 38.0,
        voltageSag: 0.5,
        thermalStress: digitalTwin?.thermalStressScore ?? 0,
        heaterActive: false,
        phase: 'CRUISE',
      }];
    }

    return telemetryHistory.map((pt) => {
      const tCore = Number(pt.batteryTempC.toFixed(1));
      const tAmb = Number(pt.ambientTempC.toFixed(1));
      // Derive physical perimeter-to-core gradient if min/max per frame
      const gradientDelta = Math.max(0, (tCore - tAmb) * 0.08);
      const tMin = Number((tCore - gradientDelta).toFixed(1));
      const tMax = Number((tCore + gradientDelta * 0.4).toFixed(1));
      const vSag = Number((pt.voltageSagV ?? (pt.currentA * (pt.internalResistanceMOhm / 1000.0))).toFixed(2));

      return {
        timeSec: pt.timestamp,
        timeMin: (pt.timestamp / 60).toFixed(1),
        tCore,
        tMin,
        tMax,
        tAmb,
        voltage: Number(pt.voltageV.toFixed(2)),
        current: Number(pt.currentA.toFixed(1)),
        soc: Number(pt.socPct.toFixed(1)),
        rInt: Number(pt.internalResistanceMOhm.toFixed(1)),
        voltageSag: vSag,
        thermalStress: Number((pt.thermalStressScore ?? 0).toFixed(0)),
        heaterActive: pt.thermalControlActive,
        phase: pt.phase,
      };
    });
  }, [telemetryHistory, digitalTwin, sharedMissionState, timestampSec]);

  // Channel configuration metadata
  const channelMeta = {
    temperature: {
      label: 'TEMPERATURE ENVELOPE',
      unit: '°C',
      provenance: 'ESTIMATED (EKF + PIDNN)',
      description: 'Core pack temperature with multi-cell envelope band and ambient boundary reference',
    },
    voltage: {
      label: 'TERMINAL VOLTAGE & SAG',
      unit: 'V',
      provenance: 'MEASURED (HALL SENSORS)',
      description: 'Pack bus voltage with dynamic ohmic sag and BMS cutoff protection limit',
    },
    current: {
      label: 'DISCHARGE LOAD CURRENT',
      unit: 'A',
      provenance: 'MEASURED (CURRENT SHUNT)',
      description: 'Flight motor and electronics current load profile across mission phases',
    },
    soc: {
      label: 'STATE OF CHARGE (SOC)',
      unit: '%',
      provenance: 'ESTIMATED (COULOMB + OCV)',
      description: 'Usable chemical energy reserve accounting for cryogenic capacity derating',
    },
    stress: {
      label: 'THERMAL STRESS & IMPEDANCE',
      unit: 'Score / mΩ',
      provenance: 'PHYSICS-INFORMED DERIVATION',
      description: 'Arrhenius cold-soak impedance surge and cumulative thermal stress score',
    },
  }[activeChannel];

  // Aerospace Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="p-3 rounded bg-[#0c0e12] border border-[#2d3545] font-mono text-[11px] text-[#cbd5e1] space-y-1.5 shadow-xl min-w-[200px]">
        <div className="flex items-center justify-between border-b border-[#1e2430] pb-1 text-[10px]">
          <span className="text-amber-400 font-bold">
            T + {data.timeSec}s ({data.timeMin}m)
          </span>
          <span className="text-[#94a3b8]">{data.phase}</span>
        </div>

        {activeChannel === 'temperature' && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400 font-bold">T_core:</span>
              <span className="font-bold text-[#f8fafc]">{data.tCore}°C</span>
            </div>
            <div className="flex justify-between text-[#94a3b8]">
              <span>Cell Envelope:</span>
              <span>[{data.tMin}°C ... {data.tMax}°C]</span>
            </div>
            <div className="flex justify-between text-[#64748b]">
              <span>T_ambient:</span>
              <span>{data.tAmb}°C</span>
            </div>
            <div className="flex justify-between text-[#64748b]">
              <span>ΔT (Core - Amb):</span>
              <span className="text-amber-300">+{(data.tCore - data.tAmb).toFixed(1)}°C</span>
            </div>
            {data.heaterActive && (
              <div className="text-[10px] text-amber-400 font-semibold pt-0.5 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>HEATER ACTIVE (DUAL-ZONE)</span>
              </div>
            )}
          </div>
        )}

        {activeChannel === 'voltage' && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-emerald-400 font-bold">Terminal V:</span>
              <span className="font-bold text-[#f8fafc]">{data.voltage} V</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Dynamic Sag:</span>
              <span>-{data.voltageSag} V</span>
            </div>
            <div className="flex justify-between text-[#64748b]">
              <span>Cutoff Margin:</span>
              <span>+{(data.voltage - specs.lowerVoltageCutoffV).toFixed(2)} V</span>
            </div>
          </div>
        )}

        {activeChannel === 'current' && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400 font-bold">Load Current:</span>
              <span className="font-bold text-[#f8fafc]">{data.current} A</span>
            </div>
            <div className="flex justify-between text-[#94a3b8]">
              <span>Electric Power:</span>
              <span>{(data.voltage * data.current).toFixed(0)} W</span>
            </div>
          </div>
        )}

        {activeChannel === 'soc' && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-emerald-400 font-bold">State of Charge:</span>
              <span className="font-bold text-[#f8fafc]">{data.soc}%</span>
            </div>
            <div className="flex justify-between text-[#94a3b8]">
              <span>R_int:</span>
              <span>{data.rInt} mΩ</span>
            </div>
          </div>
        )}

        {activeChannel === 'stress' && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400 font-bold">Thermal Stress:</span>
              <span className="font-bold text-[#f8fafc]">{data.thermalStress} / 100</span>
            </div>
            <div className="flex justify-between text-[#94a3b8]">
              <span>Internal R_int:</span>
              <span>{data.rInt} mΩ</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 rounded bg-[#12151c] border border-[#222836] space-y-3 font-mono text-xs">
      {/* 1. CHART CONTROL HEADER & CHANNEL SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-[#222836] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${snapshot.isPlaying ? 'text-amber-400 animate-pulse' : 'text-[#64748b]'}`} />
            <span className="font-bold text-[#f8fafc] text-xs">
              MISSION TELEMETRY PROFILE
            </span>
            <span className="text-[10px] text-[#64748b]">
              • {missionProfile.name.split(' ')[0]} ({chartData.length} samples)
            </span>
          </div>
          <p className="text-[10px] text-[#94a3b8] mt-0.5">
            {channelMeta.description}
          </p>
        </div>

        {/* 5 Channel Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0c0e12] p-1 rounded border border-[#1e2430]">
          <button
            onClick={() => setActiveChannel('temperature')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              activeChannel === 'temperature'
                ? 'bg-[#1f2635] text-amber-300 border border-amber-500/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <Thermometer className="w-3 h-3" />
            <span>Temp Envelope</span>
          </button>

          <button
            onClick={() => setActiveChannel('voltage')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              activeChannel === 'voltage'
                ? 'bg-[#1f2635] text-emerald-300 border border-emerald-500/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Voltage & Sag</span>
          </button>

          <button
            onClick={() => setActiveChannel('current')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              activeChannel === 'current'
                ? 'bg-[#1f2635] text-amber-300 border border-amber-500/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Current</span>
          </button>

          <button
            onClick={() => setActiveChannel('soc')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              activeChannel === 'soc'
                ? 'bg-[#1f2635] text-emerald-300 border border-emerald-500/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <Battery className="w-3 h-3" />
            <span>SOC</span>
          </button>

          <button
            onClick={() => setActiveChannel('stress')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
              activeChannel === 'stress'
                ? 'bg-[#1f2635] text-amber-300 border border-amber-500/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Stress & R_int</span>
          </button>
        </div>
      </div>

      {/* 2. RECHARTS HIGH-DENSITY ENGINEERING VISUALIZATION OR SPARSE HISTORY STATE */}
      {chartData.length <= 1 ? (
        <div className="h-72 w-full flex flex-col items-center justify-center border border-dashed border-[#202738] rounded bg-[#0c0e13] text-center p-6 space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#161c28] border border-[#2d374a] flex items-center justify-center text-[#64748b]">
            <Radio className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold tracking-wider text-[#f8fafc]">
            WAITING FOR TELEMETRY HISTORY
          </div>
          <p className="text-[11px] text-[#64748b] max-w-sm">
            Run the mission simulation to populate the engineering trace.
          </p>
        </div>
      ) : (
      <div className="h-72 w-full select-none pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              {/* Thermal Core Area Gradient */}
              <linearGradient id="coreTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>

              {/* Thermal Envelope Band Gradient */}
              <linearGradient id="envelopeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.04} />
              </linearGradient>

              {/* Voltage Gradient */}
              <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Current Gradient */}
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>

              {/* SOC Gradient */}
              <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1c2331" vertical={false} />

            <XAxis 
              dataKey="timeSec" 
              stroke="#64748b" 
              fontSize={10} 
              tickFormatter={(v) => `${Math.round(v)}s`}
              tickLine={{ stroke: '#222c3d' }}
            />

            {/* CHANNEL 1: TEMPERATURE ENVELOPE */}
            {activeChannel === 'temperature' && (
              <>
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={[-42, 22]} 
                  unit="°C" 
                  tickLine={{ stroke: '#222c3d' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Physical Boundary Reference Lines */}
                <ReferenceLine 
                  y={0} 
                  stroke="#475569" 
                  strokeDasharray="4 4" 
                  label={{ value: '0°C Freezing Limit', fill: '#94a3b8', fontSize: 9, position: 'insideLeft' }} 
                />
                <ReferenceLine 
                  y={-20} 
                  stroke="#dc2626" 
                  strokeDasharray="4 4" 
                  label={{ value: '-20°C Severe Cryo Limit', fill: '#ef4444', fontSize: 9, position: 'insideLeft' }} 
                />

                {/* Simulation Time Marker */}
                <ReferenceLine 
                  x={timestampSec} 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3" 
                  label={{ value: `T+${timestampSec}s (LIVE)`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} 
                />

                {/* Maximum Cell Temperature Boundary */}
                <Line 
                  type="monotone" 
                  dataKey="tMax" 
                  stroke="#fbbf24" 
                  strokeWidth={1} 
                  strokeDasharray="3 2" 
                  dot={false} 
                  name="T_max (Core Cells)" 
                />

                {/* Core Pack Temperature with subtle area fill */}
                <Area 
                  type="monotone" 
                  dataKey="tCore" 
                  stroke="#f59e0b" 
                  strokeWidth={2.2} 
                  fill="url(#coreTempGrad)" 
                  dot={false} 
                  name="T_core (Average Pack)" 
                />

                {/* Minimum Cell Temperature Boundary */}
                <Line 
                  type="monotone" 
                  dataKey="tMin" 
                  stroke="#60a5fa" 
                  strokeWidth={1} 
                  strokeDasharray="3 2" 
                  dot={false} 
                  name="T_min (Perimeter Cells)" 
                />

                {/* Ambient Reference Line */}
                <Line 
                  type="monotone" 
                  dataKey="tAmb" 
                  stroke="#64748b" 
                  strokeWidth={1.5} 
                  strokeDasharray="5 5" 
                  dot={false} 
                  name="T_amb (Ambient Boundary)" 
                />
              </>
            )}

            {/* CHANNEL 2: VOLTAGE & SAG */}
            {activeChannel === 'voltage' && (
              <>
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={[17, 26]} 
                  unit="V" 
                  tickLine={{ stroke: '#222c3d' }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* BMS Cutoff Limit */}
                <ReferenceLine 
                  y={specs.lowerVoltageCutoffV} 
                  stroke="#dc2626" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4" 
                  label={{ value: `${specs.lowerVoltageCutoffV.toFixed(1)}V BMS Cutoff`, fill: '#ef4444', fontSize: 9, position: 'insideLeft' }} 
                />

                {/* Simulation Time Marker */}
                <ReferenceLine 
                  x={timestampSec} 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3" 
                  label={{ value: `T+${timestampSec}s (LIVE)`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} 
                />

                <Area 
                  type="monotone" 
                  dataKey="voltage" 
                  stroke="#10b981" 
                  strokeWidth={2.2} 
                  fill="url(#voltageGrad)" 
                  dot={false} 
                  name="Terminal Voltage (V)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="voltageSag" 
                  stroke="#ef4444" 
                  strokeWidth={1.5} 
                  dot={false} 
                  name="Ohmic Sag (V)" 
                />
              </>
            )}

            {/* CHANNEL 3: LOAD CURRENT */}
            {activeChannel === 'current' && (
              <>
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={[0, 60]} 
                  unit="A" 
                  tickLine={{ stroke: '#222c3d' }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Simulation Time Marker */}
                <ReferenceLine 
                  x={timestampSec} 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3" 
                  label={{ value: `T+${timestampSec}s (LIVE)`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} 
                />

                <Area 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#d97706" 
                  strokeWidth={2.2} 
                  fill="url(#currentGrad)" 
                  dot={false} 
                  name="Throttle Current (A)" 
                />
              </>
            )}

            {/* CHANNEL 4: STATE OF CHARGE */}
            {activeChannel === 'soc' && (
              <>
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={[0, 100]} 
                  unit="%" 
                  tickLine={{ stroke: '#222c3d' }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* 15% Reserve Warning */}
                <ReferenceLine 
                  y={15} 
                  stroke="#dc2626" 
                  strokeDasharray="4 4" 
                  label={{ value: '15% Emergency Reserve', fill: '#ef4444', fontSize: 9, position: 'insideLeft' }} 
                />

                {/* Simulation Time Marker */}
                <ReferenceLine 
                  x={timestampSec} 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3" 
                  label={{ value: `T+${timestampSec}s (LIVE)`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} 
                />

                <Area 
                  type="monotone" 
                  dataKey="soc" 
                  stroke="#10b981" 
                  strokeWidth={2.2} 
                  fill="url(#socGrad)" 
                  dot={false} 
                  name="Pack SOC (%)" 
                />
              </>
            )}

            {/* CHANNEL 5: STRESS & R_INT */}
            {activeChannel === 'stress' && (
              <>
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={[0, 100]} 
                  tickLine={{ stroke: '#222c3d' }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Simulation Time Marker */}
                <ReferenceLine 
                  x={timestampSec} 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3" 
                  label={{ value: `T+${timestampSec}s (LIVE)`, fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} 
                />

                <Line 
                  type="monotone" 
                  dataKey="thermalStress" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  dot={false} 
                  name="Thermal Stress Score" 
                />
                <Line 
                  type="monotone" 
                  dataKey="rInt" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  dot={false} 
                  name="R_int (mΩ)" 
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* 3. CHART FOOTER METADATA */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#64748b] pt-1 border-t border-[#1f2633]">
        <div className="flex items-center gap-2">
          <span>CHANNEL: <strong className="text-[#cbd5e1]">{channelMeta.label}</strong></span>
          <span>•</span>
          <span>PROVENANCE: <strong className="text-amber-300">{channelMeta.provenance}</strong></span>
        </div>

        <button
          onClick={onOpenMissionLab}
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition"
        >
          <span>Configure Flight Profile in Mission Lab</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
