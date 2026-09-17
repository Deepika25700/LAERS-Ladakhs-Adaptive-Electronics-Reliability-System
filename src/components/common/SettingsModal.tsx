/**
 * LAERS — Battery Intelligence Engine
 * Secondary Tool: System Settings, Environmental Parameters & Engineering Parameter Register Modal
 */

import React, { useState } from 'react';
import { X, Sliders, Mountain, Battery, Thermometer, BookOpen, Search, Info } from 'lucide-react';
import { BatterySpecs, EnvironmentalConditions } from '../../core/types';
import { LADAKH_LOCATIONS } from '../../simulation/missionSimulator';
import { LAERS_PARAMETER_REGISTER, ParameterEntry } from '../../core/parameterRegister';
import { ProvenanceBadge } from './ProvenanceBadge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: BatterySpecs;
  env: EnvironmentalConditions;
  onUpdateSpecs: (specs: BatterySpecs) => void;
  onUpdateEnv: (env: EnvironmentalConditions) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  specs,
  env,
  onUpdateSpecs,
  onUpdateEnv,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'REGISTER'>('SETTINGS');
  const [paramSearch, setParamSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const parameterList = Object.values(LAERS_PARAMETER_REGISTER);
  const filteredParams = parameterList.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(paramSearch.toLowerCase()) ||
      p.symbol.toLowerCase().includes(paramSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(paramSearch.toLowerCase()) ||
      p.source.toLowerCase().includes(paramSearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#2d3545] rounded max-w-3xl w-full shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222733] bg-[#0c0e12]">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-[#f8fafc]">SYSTEM SETTINGS & ENGINEERING PARAMETER REGISTER</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#222733] bg-[#0c0e12] px-5">
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-2 px-3 border-b-2 font-semibold transition cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            Physical Specs & Mission Environment
          </button>
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`py-2 px-3 border-b-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REGISTER'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Central Parameter Register ({parameterList.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeTab === 'SETTINGS' ? (
            <>
              {/* Ladakh Location Selector */}
              <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] space-y-2">
                <span className="font-bold text-[#cbd5e1] flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-amber-400" />
                  LADAKH FORWARD SECTOR LOCATION
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LADAKH_LOCATIONS.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => onUpdateEnv(loc as unknown as EnvironmentalConditions)}
                      className={`p-2 rounded border text-left transition cursor-pointer ${
                        env.id === loc.id
                          ? 'bg-amber-500/10 border-amber-500/60 text-[#f8fafc]'
                          : 'bg-[#0c0e12] border-[#1e2430] text-[#94a3b8] hover:border-[#374151]'
                      }`}
                    >
                      <span className="font-bold block text-[#cbd5e1]">{loc.name}</span>
                      <span className="text-[11px] text-amber-400">{loc.altitudeM}m MSL | ~{loc.atmosphericPressureMmhg} mmHg</span>
                      <span className="text-[10px] text-[#64748b] block mt-0.5">Ref Ambient: {loc.nominalTempC}°C</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Temperature Fine Tuning */}
              <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#cbd5e1] flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    AMBIENT TEMPERATURE OVERRIDE
                  </span>
                  <span className="text-amber-400 font-bold">{env.ambientTempC.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min="-45.0"
                  max="20.0"
                  step="1.0"
                  value={env.ambientTempC}
                  onChange={(e) => onUpdateEnv({ ...env, ambientTempC: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-[#64748b]">
                  <span>-45°C (Extreme Arctic)</span>
                  <span>-25°C</span>
                  <span>0°C</span>
                  <span>+20°C (Standard Lab)</span>
                </div>
              </div>

              {/* Battery Physical Model Parameters */}
              <div className="p-3.5 rounded bg-[#161b24] border border-[#262f3e] space-y-2">
                <span className="font-bold text-[#cbd5e1] flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-amber-400" />
                  BATTERY PACK & THERMAL MASS CONFIGURATION
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="text-[#64748b] block mb-1">Nominal Capacity (Ah):</label>
                    <input
                      type="number"
                      value={specs.nominalCapacityAh}
                      onChange={(e) => onUpdateSpecs({ ...specs, nominalCapacityAh: parseFloat(e.target.value) || 24.0 })}
                      className="w-full p-1.5 rounded bg-[#0c0e12] border border-[#1e2430] text-[#f8fafc]"
                    />
                  </div>
                  <div>
                    <label className="text-[#64748b] block mb-1">Emergency Cutoff (V):</label>
                    <input
                      type="number"
                      value={specs.lowerVoltageCutoffV}
                      onChange={(e) => onUpdateSpecs({ ...specs, lowerVoltageCutoffV: parseFloat(e.target.value) || 18.0 })}
                      className="w-full p-1.5 rounded bg-[#0c0e12] border border-[#1e2430] text-[#f8fafc]"
                    />
                  </div>
                  <div>
                    <label className="text-[#64748b] block mb-1">Heater Power (W):</label>
                    <input
                      type="number"
                      value={specs.membraneHeaterPowerW}
                      onChange={(e) => onUpdateSpecs({ ...specs, membraneHeaterPowerW: parseFloat(e.target.value) || 48.0 })}
                      className="w-full p-1.5 rounded bg-[#0c0e12] border border-[#1e2430] text-[#f8fafc]"
                    />
                  </div>
                  <div>
                    <label className="text-[#64748b] block mb-1">Thermal Resistance R_th (K/W):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={specs.thermalResistanceK_W}
                      onChange={(e) => onUpdateSpecs({ ...specs, thermalResistanceK_W: parseFloat(e.target.value) || 1.85 })}
                      className="w-full p-1.5 rounded bg-[#0c0e12] border border-[#1e2430] text-[#f8fafc]"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* Parameter Register Search & Filter */}
              <div className="flex flex-wrap gap-2 items-center justify-between pb-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748b]" />
                  <input
                    type="text"
                    placeholder="Search parameter name, symbol, or source..."
                    value={paramSearch}
                    onChange={(e) => setParamSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[#0c0e12] border border-[#2d3545] text-[#f8fafc] text-xs focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {['ALL', 'ENVIRONMENT', 'ELECTRICAL', 'THERMAL', 'AI_MODEL', 'MISSION_DESIGN'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                          : 'bg-[#151921] text-[#94a3b8] border border-[#262f3e]'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter Table */}
              <div className="border border-[#262f3e] rounded overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#0c0e12] border-b border-[#222733] text-[#94a3b8]">
                      <th className="p-2 font-semibold">SYMBOL / PARAMETER</th>
                      <th className="p-2 font-semibold">NOMINAL VALUE</th>
                      <th className="p-2 font-semibold">PROVENANCE</th>
                      <th className="p-2 font-semibold">STATUS / SOURCE</th>
                      <th className="p-2 font-semibold">VALID ENVELOPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2430]">
                    {filteredParams.map((p) => (
                      <tr key={p.id} className="hover:bg-[#161b24] transition">
                        <td className="p-2 align-top">
                          <div className="font-bold text-[#f8fafc] flex items-center gap-1.5">
                            <span className="text-amber-400 font-mono text-[12px]">{p.symbol}</span>
                            <span>{p.name}</span>
                          </div>
                          <div className="text-[10px] text-[#64748b] mt-0.5 max-w-xs">{p.description}</div>
                        </td>
                        <td className="p-2 align-top font-bold text-[#e2e8f0]">
                          {p.value} <span className="text-[#94a3b8] font-normal">{p.unit}</span>
                        </td>
                        <td className="p-2 align-top">
                          <ProvenanceBadge provenance={p.provenance} />
                        </td>
                        <td className="p-2 align-top">
                          <span className="block text-[10px] text-amber-300/90 font-semibold">{p.status}</span>
                          <span className="block text-[9px] text-[#64748b]">{p.source}</span>
                        </td>
                        <td className="p-2 align-top font-mono text-[10px] text-[#94a3b8]">
                          {Array.isArray(p.validRange)
                            ? `[${p.validRange[0]}, ${p.validRange[1]}] ${p.unit}`
                            : p.validRange || 'Design Range'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222733] bg-[#0c0e12] flex items-center justify-between">
          <span className="text-[10px] text-[#64748b]">
            LAERS Single Source of Truth — All physical coefficients mapped with strict provenance.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#232a35] hover:bg-[#2d3545] text-[#e2e8f0] transition cursor-pointer font-semibold"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

