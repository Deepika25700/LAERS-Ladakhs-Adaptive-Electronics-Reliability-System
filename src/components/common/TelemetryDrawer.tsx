/**
 * LAERS — Battery Intelligence Engine
 * Secondary Tool: Real-Time Telemetry & Avionics Console Drawer
 * 
 * Provides live telemetry inspection, sensor quality status toggling,
 * and low-level hex avionics frame inspection.
 */

import React from 'react';
import { X, Terminal, Download, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import { CompleteEngineSnapshot } from '../../core/simulationEngine';
import { sensorLayer } from '../../core/sensors';
import { SensorQuality } from '../../core/types';
import { ProvenanceBadge } from './ProvenanceBadge';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: CompleteEngineSnapshot;
  onForceStep: () => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  isOpen,
  onClose,
  snapshot,
  onForceStep,
}) => {
  if (!isOpen) return null;

  const { rawTelemetry, stateEstimation, telemetryHistory } = snapshot;
  const sensorQualities = sensorLayer.getSensorQualities();

  const handleToggleQuality = (channel: string, current: SensorQuality) => {
    const next: SensorQuality = current === 'GOOD' ? 'DEGRADED' : current === 'DEGRADED' ? 'MISSING' : 'GOOD';
    sensorLayer.setSensorQuality(channel, next);
    onForceStep();
  };

  const handleExportCsv = () => {
    let csv = 'Timestamp_sec,T_batt_measured_C,T_batt_estimated_C,T_amb_C,Voltage_V,Current_A,SOC_pct,R_int_mOhm,Thermal_Heater\n';
    telemetryHistory.forEach(pt => {
      csv += `${pt.timestamp},${pt.batteryTempC},${pt.batteryTempC},${pt.ambientTempC},${pt.voltageV},${pt.currentA},${pt.socPct},${pt.internalResistanceMOhm},${pt.thermalControlActive ? 1 : 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laers_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0f1217] border-l border-[#222733] shadow-2xl flex flex-col font-mono text-xs animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#222733] flex items-center justify-between bg-[#0c0e12]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-[#f8fafc]">AVIONICS TELEMETRY STREAM</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            LIVE RS-485/CAN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#161a22] hover:bg-[#202632] border border-[#262f3e] text-[#cbd5e1] text-[11px] transition cursor-pointer"
          >
            <Download className="w-3 h-3 text-[#94a3b8]" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1f2633] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Sensor Health Matrix with Injectable Faults */}
        <div className="p-3 rounded bg-[#151921] border border-[#242c3b]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[#cbd5e1] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              SENSOR BUS HEALTH & FAULT INJECTION
            </span>
            <span className="text-[10px] text-[#64748b]">Click badge to toggle fault</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {Object.entries(sensorQualities).map(([channel, quality]) => (
              <button
                key={channel}
                onClick={() => handleToggleQuality(channel, quality)}
                className="p-2 rounded bg-[#0c0e12] border border-[#1e2430] hover:border-amber-500/50 text-left transition cursor-pointer"
              >
                <span className="text-[#64748b] uppercase text-[10px] block">{channel}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 ${
                  quality === 'GOOD' ? 'text-emerald-400' :
                  quality === 'DEGRADED' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {quality === 'GOOD' ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                  {quality}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Raw Hex Avionics Frame */}
        <div className="p-3 rounded bg-[#0c0e12] border border-[#1e2430]">
          <span className="text-[10px] text-[#64748b] block mb-1">CAN 2.0B / ARINC-429 FRAME INSPECTOR:</span>
          <div className="bg-black/50 p-2 rounded border border-[#1a1f29] font-mono text-amber-400 text-xs tracking-wider break-all">
            {rawTelemetry.rawHexPayload || '55AA:0168:08B4:00F0:FF7A:FE58:E3F1'}
          </div>
        </div>

        {/* State Estimation Innovation Matrix */}
        <div className="p-3 rounded bg-[#151921] border border-[#242c3b] space-y-2">
          <span className="font-bold text-[#cbd5e1] block">EXTENDED KALMAN FILTER INNOVATION</span>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-1.5 rounded bg-[#0c0e12] border border-[#1e2430]">
              <span className="text-[#64748b] text-[10px] block">ΔT RESIDUAL</span>
              <span className="font-bold text-[#e2e8f0]">{stateEstimation.filterInnovation.tempResidualC}°C</span>
            </div>
            <div className="p-1.5 rounded bg-[#0c0e12] border border-[#1e2430]">
              <span className="text-[#64748b] text-[10px] block">ΔV RESIDUAL</span>
              <span className="font-bold text-[#e2e8f0]">{stateEstimation.filterInnovation.voltageResidualV}V</span>
            </div>
            <div className="p-1.5 rounded bg-[#0c0e12] border border-[#1e2430]">
              <span className="text-[#64748b] text-[10px] block">COV TRACE</span>
              <span className="font-bold text-amber-400">{stateEstimation.filterInnovation.covarianceTrace}</span>
            </div>
          </div>
        </div>

        {/* Recent Telemetry Stream Table */}
        <div className="p-3 rounded bg-[#151921] border border-[#242c3b] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#cbd5e1] block">RECENT TELEMETRY SAMPLES (LAST 8 FRAMES)</span>
            <ProvenanceBadge provenance={snapshot.datasetMode === 'USER DATA' ? 'USER DATA' : 'SIMULATED'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-[#cbd5e1]">
              <thead className="border-b border-[#242c3b] text-[#64748b] text-[10px]">
                <tr>
                  <th className="pb-1">TIME</th>
                  <th className="pb-1">T_CORE</th>
                  <th className="pb-1">VOLT</th>
                  <th className="pb-1">CURR</th>
                  <th className="pb-1">SOC</th>
                  <th className="pb-1">R_INT</th>
                  <th className="pb-1">HEAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2430]">
                {telemetryHistory.slice(-8).reverse().map((pt, i) => (
                  <tr key={i} className="hover:bg-[#1a202a]">
                    <td className="py-1 text-[#94a3b8]">{pt.timestamp}s</td>
                    <td className={`py-1 font-semibold ${pt.batteryTempC <= -20 ? 'text-red-400' : pt.batteryTempC <= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pt.batteryTempC.toFixed(1)}°C
                    </td>
                    <td className="py-1">{pt.voltageV.toFixed(2)}V</td>
                    <td className="py-1">{pt.currentA.toFixed(1)}A</td>
                    <td className="py-1">{pt.socPct.toFixed(1)}%</td>
                    <td className="py-1">{pt.internalResistanceMOhm.toFixed(1)}mΩ</td>
                    <td className="py-1">
                      <span className={`px-1 rounded text-[9px] font-bold ${pt.thermalControlActive ? 'bg-amber-950 text-amber-300' : 'text-[#64748b]'}`}>
                        {pt.thermalControlActive ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
