/**
 * LAERS — Battery Intelligence Engine
 * Workspace 06: System Architecture (Systems Engineering Pipeline)
 * 
 * Clean engineering architecture diagram showing the actual LAERS flow:
 * Mission Inputs
 * ↓
 * Sensor Layer
 * ↓
 * State Estimation
 * ↓
 * Physics Features
 * ↓
 * PIDNN
 * ↓
 * Degradation / RUL
 * ↓
 * Thermal Controller
 * ↓
 * Battery / Thermal State
 * ↓
 * Mission Risk
 * ↓
 * Digital Twin
 * ↓
 * Mission Decision
 * 
 * Visually understandable in 5 seconds with interactive drill-down drawers for technical specs.
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Cpu, 
  BrainCircuit, 
  Flame, 
  Compass, 
  Activity, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowDown, 
  ArrowRight,
  Calculator,
  Terminal,
  AlertTriangle,
  ChevronRight,
  Box,
  Sliders,
  Battery
} from 'lucide-react';

interface ArchitectureNode {
  id: string;
  step: number;
  name: string;
  category: 'INPUT' | 'SENSING' | 'ESTIMATION' | 'INTELLIGENCE' | 'CONTROL' | 'PLANT' | 'MISSION';
  subtitle: string;
  description: string;
  equations: string[];
  hardware: string[];
  software: string[];
  inputs: string[];
  outputs: string[];
  failSafe: string;
}

const LAERS_FLOW_NODES: ArchitectureNode[] = [
  {
    id: 'mission_inputs',
    step: 1,
    name: 'Mission Inputs',
    category: 'INPUT',
    subtitle: 'Flight Sortie & Atmospheric Sink',
    description: 'Operational sortie profiles across Ladakh (Nyoma, Siachen, Khardung La) defining altitude, atmospheric pressure, and ambient convective temperature sink.',
    equations: [
      'P_{baro}(h) = P_0 \\cdot \\left(1 - \\frac{L \\cdot h}{T_0}\\right)^{\\frac{g \\cdot M}{R_0 \\cdot L}}',
      '\\rho_{air} = \\frac{P_{baro}}{R_{specific} \\cdot T_{amb}}'
    ],
    hardware: ['BMP390 Barometer (SPI)', 'Ambient PT1000 Class-A RTD', 'Pitot-Static Airspeed Probe'],
    software: ['Atmospheric density altitude reduction', 'Convective coefficient estimator'],
    inputs: ['Barometric pressure (mmHg)', 'Ambient temperature (°C)', 'Target altitude (m MSL)'],
    outputs: ['Air density (kg/m³)', 'Convective boundary sink (W/m²·K)'],
    failSafe: 'Barometer freeze fallback to GPS geometric altitude and standard lapse rate table.'
  },
  {
    id: 'sensor_layer',
    step: 2,
    name: 'Sensor Layer',
    category: 'SENSING',
    subtitle: 'Galvanically Isolated Telemetry Bus',
    description: 'Instrument layer providing precision current, cell tap voltages, and distributed core/perimeter temperature acquisitions.',
    equations: [
      'R_{RTD}(T) = R_0 (1 + A T + B T^2)',
      'V_{shunt} = I_{pack} \\cdot R_{shunt} \\pm \\epsilon_{thermal}'
    ],
    hardware: ['4x NTC 10k thermistors (corners)', '2x PT1000 4-wire RTDs (geometric core)', '50μΩ Manganin current shunt (100A)'],
    software: ['100Hz DMA ADC sampling', 'Sensor fault detection & cross-consistency checker'],
    inputs: ['Analog voltages', 'Bridge millivolts', 'Shunt voltage'],
    outputs: ['Raw noisy telemetry frame', 'Sensor health bitmask'],
    failSafe: 'Single-sensor open-circuit triggers auto-derated sensor covariance in estimator.'
  },
  {
    id: 'state_estimation',
    step: 3,
    name: 'State Estimation',
    category: 'ESTIMATION',
    subtitle: 'Recursive Extended Kalman Filter (EKF)',
    description: 'Authoritative EKF state estimator filtering sensor noise to compute true battery core temperature, internal resistance, and Coulomb-counted SOC.',
    equations: [
      '\\hat{x}_{k|k-1} = F_k \\hat{x}_{k-1|k-1} + B_k u_k',
      'K_k = P_{k|k-1} H_k^T (H_k P_{k|k-1} H_k^T + R_k)^{-1}',
      '\\text{SOC}_k = \\text{SOC}_0 - \\frac{1}{C_{nom}} \\int_0^t I(t) dt'
    ],
    hardware: ['32-bit Cortex-M7 floating-point MCU (STM32H7 / TI TMS570)'],
    software: ['Extended Kalman Filter', 'Coulomb counter with OCV table correction'],
    inputs: ['Raw telemetry frame', 'Pack specs', 'Heater state feedback'],
    outputs: ['Estimated Core Temp (T_core)', 'Internal Resistance (R_int)', 'SOC%'],
    failSafe: 'Innovation divergence monitor triggers immediate fallback to static OCV-SOC table.'
  },
  {
    id: 'physics_features',
    step: 4,
    name: 'Physics Features',
    category: 'ESTIMATION',
    subtitle: 'Analytical Thermodynamic & Kinetic Decoupling',
    description: 'Calculates physical boundary conditions including First-Law thermal balance rates (dT/dt), Arrhenius ion mobility exponents, and aerogel heat flux.',
    equations: [
      'C_{th} \\frac{dT}{dt} = Q_{gen} - Q_{loss} + Q_{heater}',
      'q_{aerogel} = \\frac{T_{pack} - T_{amb}}{R_{th}}'
    ],
    hardware: ['Digital Signal Processor (DSP) math co-processor'],
    software: ['Finite-difference temporal rate calculator', 'Aerogel heat flux boundary evaluator'],
    inputs: ['Estimated states (T_core, R_int, SOC)', 'Ambient conditions'],
    outputs: ['dT/dt cooling rate (°C/s)', 'Aerogel heat flux (W/m²)', 'Arrhenius factor'],
    failSafe: 'Clamps derivatives to physically feasible bounds (±1.5°C/s maximum).'
  },
  {
    id: 'pidnn',
    step: 5,
    name: 'PIDNN',
    category: 'INTELLIGENCE',
    subtitle: 'Physics-Informed Deep Neural Network',
    description: 'Multi-task neural network predicting cryogenic internal resistance, voltage sag under throttle, and temperature trajectories with First-Law PDE loss constraints.',
    equations: [
      'L_{total} = L_{data} + \\lambda_1 L_{th} + \\lambda_2 L_{deg} + \\lambda_3 L_{phys}',
      'L_{th} = \\left| C_{th} \\frac{dT}{dt} - (I^2 R - \\frac{\\Delta T}{R_{th}} + Q_h) \\right|^2'
    ],
    hardware: ['Edge NPU / TF.js embedded runtime'],
    software: ['Dense-GELU multi-task model', 'Model vs. physics divergence monitor (D_T <= 4.5°C)'],
    inputs: ['9 normalized input features', '5-step rolling temporal window'],
    outputs: ['Predicted R_int (mΩ)', 'Projected voltage sag (V)', 'Multi-step T_core'],
    failSafe: 'Engages deterministic rule-based thermal controller if D_T exceeds 4.5°C threshold.'
  },
  {
    id: 'degradation_rul',
    step: 6,
    name: 'Degradation / RUL',
    category: 'INTELLIGENCE',
    subtitle: 'Semi-Empirical SEI Growth & SOH Model',
    description: 'Tracks cold-induced lithium plating kinetics, electrolyte interface degradation, cycle fatigue, and remaining useful life (RUL).',
    equations: [
      'SOH_k = SOH_0 - A_{deg} \\cdot k^{0.5} \\cdot \\exp\\left(-\\frac{E_a}{R_g T}\\right)',
      '\\text{Stress} = f(T_{core} < 0^\\circ C, C_{rate} > 1.5C)'
    ],
    hardware: ['Persistent non-volatile FRAM / EEPROM'],
    software: ['Cumulative damage stress accumulator', 'RUL cycle projection engine'],
    inputs: ['Core temperature history', 'C-rate exposure', 'Cycle count'],
    outputs: ['State of Health (SOH%)', 'RUL flight cycles remaining', 'Stress index'],
    failSafe: 'Restricts fast charging if sub-zero lithium plating conditions are detected.'
  },
  {
    id: 'thermal_controller',
    step: 7,
    name: 'Thermal Controller',
    category: 'CONTROL',
    subtitle: 'Predictive Closed-Loop Energy Budgeting',
    description: 'Calculates active membrane heating setpoint (0-48W) by comparing heater energy expenditure against the Joulean energy saved and capacity unlocked.',
    equations: [
      '\\text{Target} = \\text{clamp}(T_{target}, -5^\\circ C, +5^\\circ C)',
      '\\text{Duty}_{heater} = \\text{clamp}\\left(K_p e_T + K_i \\int e_T dt, 0, 100\\%\\right)'
    ],
    hardware: ['Dual-channel MOSFET solid-state PWM driver'],
    software: ['Thermal energy budget manager (18% pack cap limit)', 'Anti-windup PID controller'],
    inputs: ['PIDNN sag predictions', 'Mission phase throttle demand', 'SOC reserve status'],
    outputs: ['PWM duty cycle (%)', 'Heater power request (W)', 'Heating advisory'],
    failSafe: 'Independent bimetallic hardware thermal cutoff switch at +65°C.'
  },
  {
    id: 'battery_thermal_state',
    step: 8,
    name: 'Battery / Thermal State',
    category: 'PLANT',
    subtitle: '6S4P Physical Pack & Aerogel Blanket',
    description: '24 cylindrical/prismatic NMC811/Si-C cells configured in 6S4P with dual-zone etched-foil heating membranes and 8mm silica aerogel insulation.',
    equations: [
      'Q_{heater} = \\frac{V_{bus}^2}{R_{foil}} \\cdot \\text{Duty}',
      'V_{terminal} = V_{OCV}(SOC) - I \\cdot R_{int}'
    ],
    hardware: ['24 NMC811/Si-C cells', '8mm silica aerogel blanket', 'Dual-zone etched-foil polyimide heaters'],
    software: ['Passive balancing circuitry (150mA per series node)'],
    inputs: ['PWM heater drive', 'Discharge load current'],
    outputs: ['Terminal DC bus voltage (24V nom)', 'Spatial temperature distribution'],
    failSafe: 'Cell micro-short detection via series voltage dispersion spread > 40mV.'
  },
  {
    id: 'mission_risk',
    step: 9,
    name: 'Mission Risk',
    category: 'MISSION',
    subtitle: 'Composite Flight Survivability Index',
    description: 'Real-time multi-hazard risk engine synthesizing voltage sag deficit, thermal freeze probability, and energy reserve margins into a tactical risk index.',
    equations: [
      'R_{mission} = w_v P_{sag} + w_t P_{thermal} + w_e P_{energy}',
      'P_{completion} = 100\\% - R_{mission}'
    ],
    hardware: ['Mission Avionics Mission Computer'],
    software: ['Cutoff horizon predictor (t_cutoff)', 'Mission risk aggregator'],
    inputs: ['Terminal voltage & sag', 'Core temperature', 'Reserve energy margin'],
    outputs: ['Mission Risk %', 'Completion Probability %', 'Emergency Cutoff Horizon'],
    failSafe: 'Automatic mission abort alert if completion probability drops below 60%.'
  },
  {
    id: 'digital_twin',
    step: 10,
    name: 'Digital Twin',
    category: 'MISSION',
    subtitle: '15-State Virtual Replica & CAD State',
    description: 'Complete digital twin synchronized with physical telemetry, mapping per-cell thermal gradients, CAD cross-sections, and historical sortie states.',
    equations: [
      '\\mathbf{x}_{twin} = [T_{core}, T_{cell,1..24}, V, I, SOC, SOH, R_{int}, \\dots]^T',
      '\\Delta T_{gradient} = T_{core} - \\min(T_{corner})'
    ],
    hardware: ['Telemetry CAN transceiver / ARINC-429 interface'],
    software: ['3D CAD isometric mesh synchronization', 'Thermal gradient field generator'],
    inputs: ['All filtered and predicted states', 'Physical pack telemetry'],
    outputs: ['Spatial CAD thermal field', 'Cell voltage dispersion', '15-state twin vector'],
    failSafe: 'Fallback to lumped single-node thermal model on packet timeout.'
  },
  {
    id: 'mission_decision',
    step: 11,
    name: 'Mission Decision',
    category: 'MISSION',
    subtitle: 'Autopilot Advisories & Tactical Abort',
    description: 'Final mission decision engine advising flight operators and autopilot systems on pre-flight go/no-go, throttle de-rate limits, and emergency loiter horizons.',
    equations: [
      '\\text{Decision} = f(P_{completion}, t_{cutoff}, \\Delta E_{margin})'
    ],
    hardware: ['Avionics Flight Display / UAV Ground Control Station (GCS)'],
    software: ['Tactical advisory generator', 'Throttle limiter interface'],
    inputs: ['Mission completion probability', 'Risk level', 'Cutoff horizon'],
    outputs: ['FLIGHT GO / NO-GO', 'Recommended throttle ceiling', 'Emergency abort warning'],
    failSafe: 'Mandatory fail-safe return-to-launch (RTL) trigger on persistent low-voltage sag.'
  }
];

export const ArchitectureView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('pidnn');

  const selectedNode = LAERS_FLOW_NODES.find(n => n.id === selectedNodeId) || LAERS_FLOW_NODES[4];

  const getCategoryColor = (cat: ArchitectureNode['category']) => {
    switch (cat) {
      case 'INPUT': return 'text-[#94a3b8] border-[#334155] bg-[#1e2432]/60';
      case 'SENSING': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30';
      case 'ESTIMATION': return 'text-blue-400 border-blue-500/40 bg-blue-950/30';
      case 'INTELLIGENCE': return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
      case 'CONTROL': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
      case 'PLANT': return 'text-orange-400 border-orange-500/40 bg-orange-950/30';
      case 'MISSION': return 'text-amber-300 border-amber-500/40 bg-amber-950/30';
    }
  };

  return (
    <div className="p-4 space-y-4 font-mono text-xs max-w-7xl mx-auto text-[#cbd5e1]">
      {/* 1. UNIFIED WORKSPACE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2432]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">WORKSPACE 06</span>
            <span className="text-[#334155]">•</span>
            <h1 className="text-base font-bold text-[#f8fafc] tracking-tight uppercase">SYSTEM ARCHITECTURE</h1>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            11-stage authoritative runtime pipeline from environmental sink ingestion to tactical flight decision
          </p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded bg-[#11141b] border border-[#1e2432] text-amber-300 font-semibold">
          11 SYNCHRONIZED STAGES
        </span>
      </div>

      {/* 2. MAIN WORKSPACE: CONNECTED ARCHITECTURE DIAGRAM & DRILL-DOWN PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: CONNECTED PIPELINE BLOCKS (7 COLS) */}
        <div className="lg:col-span-7 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-2 mb-2">
            <span className="font-bold text-[#f8fafc] text-xs uppercase tracking-wider">
              AUTHORITATIVE RUNTIME PIPELINE (11 STAGES)
            </span>
            <span className="text-[10px] text-[#64748b]">Directional data & control flow</span>
          </div>

          <div className="space-y-1.5">
            {LAERS_FLOW_NODES.map((node, idx) => {
              const isSelected = node.id === selectedNodeId;
              const catClass = getCategoryColor(node.category);

              return (
                <div key={node.id} className="space-y-1">
                  <button
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full p-2.5 rounded border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-[#f8fafc] ring-1 ring-amber-500/50 shadow-xs'
                        : 'bg-[#0b0e14] border-[#1e2432] text-[#94a3b8] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold text-[#64748b] w-4 text-right">
                        {node.step < 10 ? `0${node.step}` : node.step}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#f8fafc]">{node.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${catClass}`}>
                            {node.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748b] truncate block mt-0.5">
                          {node.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-[#475569]'}`} />
                    </div>
                  </button>

                  {/* Flow Arrow (except last) */}
                  {idx < LAERS_FLOW_NODES.length - 1 && (
                    <div className="flex justify-center text-[#2d3748] py-0.2">
                      <ArrowDown className="w-3 h-3 text-[#334155]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: TECHNICAL SPECIFICATIONS DRILL-DOWN DRAWER (5 COLS) */}
        <div className="lg:col-span-5 p-4 rounded bg-[#11141b] border border-[#1e2432] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-[#1e2432] pb-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#f8fafc] text-sm">{selectedNode.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold">
                  STAGE {selectedNode.step} OF 11
                </span>
              </div>
              <span className="text-[11px] text-amber-400/90 block mt-0.5">{selectedNode.subtitle}</span>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              {selectedNode.description}
            </p>

            {/* Governing Equations */}
            <div className="p-3 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1.5">
              <span className="font-bold text-[#f8fafc] text-[10px] uppercase block flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                GOVERNING MATHEMATICAL FORMULATION
              </span>
              <div className="space-y-1 text-[11px] text-amber-300/90 font-mono">
                {selectedNode.equations.map((eq, i) => (
                  <div key={i} className="p-1.5 rounded bg-[#11141b] border border-[#1e2432]">
                    <code>${eq}$</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware & Software Subsystems */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
                <span className="font-bold text-[#f8fafc] text-[10px] uppercase block flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-blue-400" />
                  Hardware
                </span>
                <ul className="text-[#94a3b8] text-[10px] space-y-0.5">
                  {selectedNode.hardware.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1">
                <span className="font-bold text-[#f8fafc] text-[10px] uppercase block flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  Software
                </span>
                <ul className="text-[#94a3b8] text-[10px] space-y-0.5">
                  {selectedNode.software.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Signal Interface (Inputs & Outputs) */}
            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1 text-[10px]">
              <span className="text-[#64748b] font-bold uppercase block">Signal Interface</span>
              <div className="text-[#cbd5e1]">
                <strong className="text-amber-400">Inputs:</strong> {selectedNode.inputs.join(', ')}
              </div>
              <div className="text-[#cbd5e1] mt-0.5">
                <strong className="text-emerald-400">Outputs:</strong> {selectedNode.outputs.join(', ')}
              </div>
            </div>

            {/* Fail-Safe & Redundancy Behavior */}
            <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] space-y-1 text-[10px]">
              <span className="text-[#64748b] font-bold uppercase block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Fail-Safe & Redundancy
              </span>
              <p className="text-[#94a3b8]">
                {selectedNode.failSafe}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
