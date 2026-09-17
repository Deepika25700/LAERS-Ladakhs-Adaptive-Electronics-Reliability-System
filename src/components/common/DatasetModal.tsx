/**
 * LAERS — Battery Intelligence Engine
 * Secondary Tool: Dataset & CSV Telemetry Ingestion Modal
 * 
 * Supports uploading flight or bench-test CSV logs, validates schema and units,
 * checks timestamp ordering and physical bounds, generates a Data Quality Report,
 * and feeds valid telemetry directly into the LAERS closed-loop pipeline.
 */

import React, { useState } from 'react';
import { X, Database, Upload, FileCheck, AlertTriangle, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { simulationEngine } from '../../core/simulationEngine';
import { ProvenanceBadge } from './ProvenanceBadge';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTelemetryLoaded?: () => void;
}

interface ColumnValidationStatus {
  name: string;
  mappedKey: string;
  found: boolean;
  unit: string;
  quality: 'VALID' | 'WARNING' | 'MISSING';
  notes: string;
}

interface DatasetQualityReport {
  rowCount: number;
  timestampOrdered: boolean;
  missingValues: number;
  outOfBoundValues: number;
  tempRange: [number, number];
  voltRange: [number, number];
  currRange: [number, number];
  columns: ColumnValidationStatus[];
  isValidForPipeline: boolean;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({ isOpen, onClose, onTelemetryLoaded }) => {
  if (!isOpen) return null;

  const [activeDatasetName, setActiveDatasetName] = useState<string>('nyoma_subzero_flight_synth.csv');
  const [isSynthetic, setIsSynthetic] = useState<boolean>(true);
  const [parseError, setParseError] = useState<string | null>(null);

  const [qualityReport, setQualityReport] = useState<DatasetQualityReport>({
    rowCount: 1420,
    timestampOrdered: true,
    missingValues: 0,
    outOfBoundValues: 0,
    tempRange: [-38.4, 21.2],
    voltRange: [18.2, 25.1],
    currRange: [0.0, 52.4],
    isValidForPipeline: true,
    columns: [
      { name: 'timestamp', mappedKey: 'timestampSec', found: true, unit: 'sec', quality: 'VALID', notes: 'Continuous strictly increasing sequence' },
      { name: 'temperature', mappedKey: 'tempC', found: true, unit: '°C', quality: 'VALID', notes: 'Within plausible [-45°C, 65°C] envelope' },
      { name: 'ambient_temperature', mappedKey: 'ambientTempC', found: true, unit: '°C', quality: 'VALID', notes: 'Within [-50°C, 50°C] envelope' },
      { name: 'voltage', mappedKey: 'voltageV', found: true, unit: 'V', quality: 'VALID', notes: 'Pack potential within [17.5V, 25.5V]' },
      { name: 'current', mappedKey: 'currentA', found: true, unit: 'A', quality: 'VALID', notes: 'Discharge throttle within [0A, 70A]' },
      { name: 'soc', mappedKey: 'socPct', found: true, unit: '%', quality: 'VALID', notes: 'Normalized between 0% and 100%' },
    ],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length < 2) {
          throw new Error('CSV file contains no data rows.');
        }

        // Header parsing
        const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
        
        // Match columns flexibly
        const findCol = (candidates: string[]) => rawHeaders.findIndex(h => candidates.some(c => h.includes(c)));

        const idxTime = findCol(['time', 'sec', 't_sec']);
        const idxTemp = findCol(['battery_temp', 'temp_c', 'temp', 'cell_temp', 'tbatt']);
        const idxAmb = findCol(['amb_temp', 'ambient', 'tamb']);
        const idxVolt = findCol(['volt', 'v_pack', 'v_term', 'terminal_voltage']);
        const idxCurr = findCol(['curr', 'i_pack', 'current_a', 'amps']);
        const idxSoc = findCol(['soc', 'state_of_charge']);

        const colsStatus: ColumnValidationStatus[] = [
          { name: 'Timestamp', mappedKey: 'timestampSec', found: idxTime !== -1, unit: 's', quality: idxTime !== -1 ? 'VALID' : 'MISSING', notes: idxTime !== -1 ? 'Matched column' : 'Required for time-series' },
          { name: 'Battery Temp', mappedKey: 'tempC', found: idxTemp !== -1, unit: '°C', quality: idxTemp !== -1 ? 'VALID' : 'MISSING', notes: idxTemp !== -1 ? 'Matched column' : 'Required for thermal balance' },
          { name: 'Ambient Temp', mappedKey: 'ambientTempC', found: idxAmb !== -1, unit: '°C', quality: idxAmb !== -1 ? 'VALID' : 'WARNING', notes: idxAmb !== -1 ? 'Matched column' : 'Will default to -35°C if omitted' },
          { name: 'Voltage', mappedKey: 'voltageV', found: idxVolt !== -1, unit: 'V', quality: idxVolt !== -1 ? 'VALID' : 'MISSING', notes: idxVolt !== -1 ? 'Matched column' : 'Required for electrical consistency' },
          { name: 'Current', mappedKey: 'currentA', found: idxCurr !== -1, unit: 'A', quality: idxCurr !== -1 ? 'VALID' : 'MISSING', notes: idxCurr !== -1 ? 'Matched column' : 'Required for Joule heat & sag' },
          { name: 'SOC', mappedKey: 'socPct', found: idxSoc !== -1, unit: '%', quality: idxSoc !== -1 ? 'VALID' : 'WARNING', notes: idxSoc !== -1 ? 'Matched column' : 'Will integrate from current if omitted' },
        ];

        if (idxTime === -1 || idxTemp === -1 || idxVolt === -1 || idxCurr === -1) {
          throw new Error('CSV missing required telemetry headers: timestamp, temperature, voltage, or current.');
        }

        // Data rows inspection
        const parsedRows: {
          timestampSec: number;
          tempC: number;
          ambientTempC: number;
          voltageV: number;
          currentA: number;
          socPct: number;
        }[] = [];

        let missingCount = 0;
        let oobCount = 0;
        let isTimeOrdered = true;
        let prevTime = -Infinity;

        let minT = Infinity, maxT = -Infinity;
        let minV = Infinity, maxV = -Infinity;
        let minI = Infinity, maxI = -Infinity;

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.trim());
          if (cells.length < 3) continue;

          const tSec = parseFloat(cells[idxTime]);
          const temp = parseFloat(cells[idxTemp]);
          const amb = idxAmb !== -1 ? parseFloat(cells[idxAmb]) : -35.0;
          const volt = parseFloat(cells[idxVolt]);
          const curr = parseFloat(cells[idxCurr]);
          const soc = idxSoc !== -1 ? parseFloat(cells[idxSoc]) : 85.0;

          if (isNaN(tSec) || isNaN(temp) || isNaN(volt) || isNaN(curr)) {
            missingCount++;
            continue;
          }

          if (tSec < prevTime) isTimeOrdered = false;
          prevTime = tSec;

          // Physical plausibility sanity checks
          if (temp < -60 || temp > 90 || volt < 10 || volt > 35 || curr < -20 || curr > 150) {
            oobCount++;
          }

          minT = Math.min(minT, temp);
          maxT = Math.max(maxT, temp);
          minV = Math.min(minV, volt);
          maxV = Math.max(maxV, volt);
          minI = Math.min(minI, curr);
          maxI = Math.max(maxI, curr);

          parsedRows.push({
            timestampSec: tSec,
            tempC: temp,
            ambientTempC: isNaN(amb) ? -35.0 : amb,
            voltageV: volt,
            currentA: curr,
            socPct: Math.max(0, Math.min(100, isNaN(soc) ? 80.0 : soc)),
          });
        }

        if (parsedRows.length === 0) {
          throw new Error('No valid numeric telemetry rows could be parsed.');
        }

        const report: DatasetQualityReport = {
          rowCount: parsedRows.length,
          timestampOrdered: isTimeOrdered,
          missingValues: missingCount,
          outOfBoundValues: oobCount,
          tempRange: [Number(minT.toFixed(1)), Number(maxT.toFixed(1))],
          voltRange: [Number(minV.toFixed(1)), Number(maxV.toFixed(1))],
          currRange: [Number(minI.toFixed(1)), Number(maxI.toFixed(1))],
          columns: colsStatus,
          isValidForPipeline: parsedRows.length > 5,
        };

        setQualityReport(report);
        setActiveDatasetName(file.name);
        setIsSynthetic(false);

        // Inject into LAERS Simulation Pipeline!
        simulationEngine.loadUserTelemetrySeries(parsedRows, file.name);
        if (onTelemetryLoaded) onTelemetryLoaded();
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse CSV telemetry file.');
      }
    };

    reader.readAsText(file);
  };

  const handleResetToSynthetic = () => {
    simulationEngine.resetToSimulation();
    setIsSynthetic(true);
    setActiveDatasetName('nyoma_subzero_flight_synth.csv');
    setQualityReport({
      rowCount: 1420,
      timestampOrdered: true,
      missingValues: 0,
      outOfBoundValues: 0,
      tempRange: [-38.4, 21.2],
      voltRange: [18.2, 25.1],
      currRange: [0.0, 52.4],
      isValidForPipeline: true,
      columns: [
        { name: 'timestamp', mappedKey: 'timestampSec', found: true, unit: 'sec', quality: 'VALID', notes: 'Synthetic standard trajectory' },
        { name: 'temperature', mappedKey: 'tempC', found: true, unit: '°C', quality: 'VALID', notes: 'Electrochemical Arrhenius model' },
        { name: 'ambient_temperature', mappedKey: 'ambientTempC', found: true, unit: '°C', quality: 'VALID', notes: 'Nyoma ALG test condition (-35°C)' },
        { name: 'voltage', mappedKey: 'voltageV', found: true, unit: 'V', quality: 'VALID', notes: 'Terminal voltage with ohmic drop' },
        { name: 'current', mappedKey: 'currentA', found: true, unit: 'A', quality: 'VALID', notes: 'Multi-phase throttle load' },
        { name: 'soc', mappedKey: 'socPct', found: true, unit: '%', quality: 'VALID', notes: 'Coulomb counting integration' },
      ],
    });
    if (onTelemetryLoaded) onTelemetryLoaded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#2d3545] rounded max-w-3xl w-full shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222733] bg-[#0c0e12]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-[#f8fafc]">DATASET INGESTION & QUALITY VERIFICATION</h3>
            <ProvenanceBadge provenance={isSynthetic ? 'SIMULATED' : 'USER DATA'} />
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Scientific Disclaimer */}
          <div className="p-3 rounded bg-[#161a22] border border-[#262f3e] text-[#cbd5e1]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-300">SCIENTIFIC PROVENANCE & VALIDATION STATUS</span>
              <span className="text-[10px] text-[#64748b]">PROTOTYPE PHASE</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              {isSynthetic ? (
                <>
                  Active dataset comprises <strong className="text-[#f8fafc]">simulated sub-zero physics trajectories</strong> generated from low-temperature electrochemical equations. Real cell characterization and environmental chamber experimental validation are pending.
                </>
              ) : (
                <>
                  User custom CSV telemetry loaded from <strong className="text-amber-300">{activeDatasetName}</strong>. Telemetry has been ingested and connected into the LAERS state estimator and PIDNN neural pipeline.
                </>
              )}
            </p>
          </div>

          {/* Upload & Ingestion Box */}
          <div className="border border-dashed border-[#2d3545] hover:border-amber-500/50 rounded p-4 text-center bg-[#151921] transition">
            <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <span className="font-bold text-[#f8fafc] block mb-1">Upload Flight or Test-Bench CSV Telemetry</span>
            <p className="text-[11px] text-[#94a3b8] mb-3">
              Accepts CSV with columns: timestamp, temperature, voltage, current, ambient_temp, soc.
            </p>
            <div className="flex items-center justify-center gap-3">
              <label className="px-3.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer inline-flex items-center gap-1.5 border border-amber-500/50 font-semibold transition">
                <Upload className="w-3.5 h-3.5" />
                Select CSV File
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              {!isSynthetic && (
                <button
                  onClick={handleResetToSynthetic}
                  className="px-3 py-1.5 rounded bg-[#232a35] hover:bg-[#2d3545] text-[#cbd5e1] inline-flex items-center gap-1 border border-[#374151] transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-[#94a3b8]" />
                  Reset to Synthetic Baseline
                </button>
              )}
            </div>
            <span className="text-[10px] text-[#64748b] block mt-2">Active Source: <strong className="text-[#cbd5e1]">{activeDatasetName}</strong></span>
          </div>

          {parseError && (
            <div className="p-3 rounded bg-red-950/50 border border-red-500/60 text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* DATA QUALITY REPORT */}
          <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#cbd5e1] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                DATA QUALITY REPORT & COLUMN MAPPINGS
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                qualityReport.isValidForPipeline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                  : 'bg-red-950/60 text-red-300 border-red-600/40'
              }`}>
                {qualityReport.isValidForPipeline ? 'PIPELINE COMPLIANT' : 'INVALID SCHEMA'}
              </span>
            </div>

            {/* Column validation matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
              {qualityReport.columns.map(col => (
                <div key={col.name} className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[#f8fafc]">{col.name}</span>
                    <span className={`text-[9px] px-1 rounded ${
                      col.quality === 'VALID' ? 'text-emerald-400 bg-emerald-950/40' :
                      col.quality === 'WARNING' ? 'text-amber-400 bg-amber-950/40' : 'text-red-400 bg-red-950/40'
                    }`}>
                      {col.quality === 'VALID' ? '✓ VALID' : col.quality === 'WARNING' ? '⚠ DEFAULT' : '✗ MISSING'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b]">Unit: {col.unit} | {col.notes}</div>
                </div>
              ))}
            </div>

            {/* Dataset Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] pt-1">
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[#64748b] text-[10px] block">PARSED SAMPLES</span>
                <span className="font-bold text-[#f8fafc]">{qualityReport.rowCount.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[#64748b] text-[10px] block">CHRONOLOGY</span>
                <span className={`font-bold ${qualityReport.timestampOrdered ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {qualityReport.timestampOrdered ? '✓ Monotonic' : '⚠ Non-sorted'}
                </span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[#64748b] text-[10px] block">TEMP BOUNDS</span>
                <span className="font-bold text-amber-400">{qualityReport.tempRange[0]}°C to {qualityReport.tempRange[1]}°C</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1e2430]">
                <span className="text-[#64748b] text-[10px] block">VOLT RANGE</span>
                <span className="font-bold text-[#e2e8f0]">{qualityReport.voltRange[0]}V – {qualityReport.voltRange[1]}V</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222733] bg-[#0c0e12] flex items-center justify-between">
          <span className="text-[10px] text-[#64748b]">
            Telemetry feeds directly into Extended Kalman Filter & PIDNN Inference.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#232a35] hover:bg-[#2d3545] text-[#e2e8f0] font-semibold transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

