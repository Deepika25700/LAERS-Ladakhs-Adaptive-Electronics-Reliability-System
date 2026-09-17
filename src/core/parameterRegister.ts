/**
 * LAERS — Battery Intelligence Engine
 * Central Engineering Parameter Register
 * 
 * Single source of truth for all simulation, physics, and architecture parameters.
 * Every engineering parameter has an exact name, symbol, value, unit, status,
 * valid range, and provenance classification.
 */

export type ParameterProvenance = 
  | 'MEASURED' 
  | 'USER DATA' 
  | 'SIMULATED' 
  | 'ESTIMATED' 
  | 'PHYSICS MODEL' 
  | 'PIDNN PREDICTION' 
  | 'ENGINEERING ASSUMPTION' 
  | 'TARGET' 
  | 'REFERENCE' 
  | 'TBD';

export interface ParameterEntry {
  id: string;
  name: string;
  symbol: string;
  value: number | string;
  unit: string;
  source: string;
  status: string;
  description: string;
  validRange?: [number, number] | string;
  provenance: ParameterProvenance;
  category: 'ENVIRONMENT' | 'ELECTRICAL' | 'THERMAL' | 'AI_MODEL' | 'MISSION_DESIGN';
}

export const LAERS_PARAMETER_REGISTER: Record<string, ParameterEntry> = {
  // 1. Environmental Parameters
  T_amb: {
    id: 'T_amb',
    name: 'Ambient Temperature',
    symbol: 'T_amb',
    value: -35.0,
    unit: '°C',
    source: 'Ladakh High-Altitude Cold Soak Standard',
    status: 'CONFIGURED TEST CONDITION',
    description: 'Ambient air temperature at forward defense sector (e.g. Nyoma ALG / Siachen base)',
    validRange: [-50, 45],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ENVIRONMENT',
  },
  P_atm: {
    id: 'P_atm',
    name: 'Atmospheric Pressure',
    symbol: 'P_atm',
    value: 510,
    unit: 'mmHg',
    source: 'Representative Test / Design Condition (~68 kPa, 4,500m MSL)',
    status: 'REPRESENTATIVE TEST / DESIGN CONDITION',
    description: 'Representative barometric pressure at extreme altitude (4,500m–5,000m AMSL). Note: Not universal to all Ladakh sectors.',
    validRange: [350, 760],
    provenance: 'REFERENCE',
    category: 'ENVIRONMENT',
  },
  Alt_msl: {
    id: 'Alt_msl',
    name: 'Deployment Altitude',
    symbol: 'Alt',
    value: 4180,
    unit: 'm MSL',
    source: 'Forward Sector Nyoma ALG elevation',
    status: 'DEPLOYMENT LOCATION',
    description: 'Elevation above mean sea level. Reduced air density lowers convective heat-transfer capability.',
    validRange: [0, 7000],
    provenance: 'REFERENCE',
    category: 'ENVIRONMENT',
  },

  // 2. Battery & Electrical Architecture
  V_nom: {
    id: 'V_nom',
    name: 'Nominal Pack Voltage',
    symbol: 'V_nom',
    value: 22.2,
    unit: 'V',
    source: '6S Equivalent Circuit Architecture (3.7V / cell nominal)',
    status: 'SIMULATION ASSUMPTION',
    description: 'Nominal potential for 6-series Li-ion arrangement.',
    validRange: [18.0, 25.2],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ELECTRICAL',
  },
  Cap_nom: {
    id: 'Cap_nom',
    name: 'Nominal Pack Capacity',
    symbol: 'C_nom',
    value: 24.0,
    unit: 'Ah',
    source: '6S4P Pack Architecture (~532 Wh)',
    status: 'SIMULATION ASSUMPTION',
    description: 'Gross rated electrical capacity at standard +25°C baseline C/5 discharge.',
    validRange: [5.0, 100.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ELECTRICAL',
  },
  V_cutoff: {
    id: 'V_cutoff',
    name: 'Lower Voltage Cutoff',
    symbol: 'V_cutoff',
    value: 18.0,
    unit: 'V',
    source: 'Defense UAV Avionics Minimum Ingress (3.0V / cell)',
    status: 'HARD SAFETY LIMIT',
    description: 'Critical bus voltage threshold below which motor ESCs reboot or fail-safe triggers.',
    validRange: [16.0, 20.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ELECTRICAL',
  },
  R_ref: {
    id: 'R_ref',
    name: 'Pack Internal Resistance at 25°C',
    symbol: 'R_ref',
    value: 18.5,
    unit: 'mΩ',
    source: 'TBD — REQUIRES HARDWARE SELECTION',
    status: 'SIMULATION ASSUMPTION (REQUIRES CELL CHARACTERIZATION)',
    description: 'Factory reference internal resistance at room temperature. Below 0°C, increases exponentially via Arrhenius kinetics.',
    validRange: [5.0, 60.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ELECTRICAL',
  },
  I_max_cont: {
    id: 'I_max_cont',
    name: 'Max Continuous Discharge Current',
    symbol: 'I_max',
    value: 60.0,
    unit: 'A',
    source: 'TBD — REQUIRES HARDWARE SELECTION',
    status: 'SIMULATION ASSUMPTION',
    description: 'Maximum sustained continuous throttle current for multirotor takeoff and climb.',
    validRange: [10.0, 150.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'ELECTRICAL',
  },

  // 3. Thermal Physics & Enclosure
  C_th: {
    id: 'C_th',
    name: 'Lumped Thermal Capacitance',
    symbol: 'C_th',
    value: 880.0,
    unit: 'J/K',
    source: 'Pack Core + Cell Casing + Busbars Thermal Mass Estimate',
    status: 'SIMULATION ASSUMPTION',
    description: 'Total lumped thermal mass governing temperature rate of change: C_th * dT/dt = Q_gen - Q_loss + Q_heater.',
    validRange: [400, 2500],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'THERMAL',
  },
  R_th_aerogel: {
    id: 'R_th_aerogel',
    name: 'Aerogel Enclosure Thermal Resistance',
    symbol: 'R_th',
    value: 1.85,
    unit: 'K/W',
    source: '2–3 mm Silica Aerogel Blanket (k ≈ 0.015 W/m·K) + Sealed Enclosure',
    status: 'SIMULATION ASSUMPTION',
    description: 'Effective thermal barrier resistance reducing heat leak to sub-zero ambient atmosphere.',
    validRange: [0.3, 4.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'THERMAL',
  },
  P_heater_max: {
    id: 'P_heater_max',
    name: 'Thin-Film Heating Membrane Power',
    symbol: 'P_heater',
    value: 48.0,
    unit: 'W',
    source: 'Etched Foil Dual-Zone Membrane (~9% nominal pack power)',
    status: 'SIMULATION ASSUMPTION',
    description: 'Maximum heating power from self-heating membrane elements sandwiched between cell rows.',
    validRange: [10.0, 120.0],
    provenance: 'ENGINEERING ASSUMPTION',
    category: 'THERMAL',
  },

  // 4. AI & PIDNN Model
  Lambda_thermal: {
    id: 'Lambda_thermal',
    name: 'Thermal Physics Loss Penalty',
    symbol: 'λ_thermal',
    value: 0.35,
    unit: 'scalar',
    source: 'Loss weighting for lumped thermal balance differential equation',
    status: 'HYPERPARAMETER (TUNABLE)',
    description: 'Penalizes predictions violating C_th * dT/dt = Q_gen - Q_loss + Q_heater.',
    validRange: [0.0, 2.0],
    provenance: 'PHYSICS MODEL',
    category: 'AI_MODEL',
  },
  Lambda_degradation: {
    id: 'Lambda_degradation',
    name: 'Degradation Monotonicity Loss Penalty',
    symbol: 'λ_deg',
    value: 0.25,
    unit: 'scalar',
    source: 'Arrhenius SEI Growth & Monotonic Capacity Decay Law',
    status: 'HYPERPARAMETER (TUNABLE)',
    description: 'Enforces non-increasing capacity over cycle aging without physical recovery.',
    validRange: [0.0, 2.0],
    provenance: 'PHYSICS MODEL',
    category: 'AI_MODEL',
  },
  Lambda_physics: {
    id: 'Lambda_physics',
    name: 'Ohmic Voltage Consistency Loss Penalty',
    symbol: 'λ_physics',
    value: 0.30,
    unit: 'scalar',
    source: 'Ohmic Consistency V_term ≈ OCV(SOC) - I * R_int',
    status: 'HYPERPARAMETER (TUNABLE)',
    description: 'Penalizes terminal voltage predictions violating Ohm-equivalent circuit law.',
    validRange: [0.0, 2.0],
    provenance: 'PHYSICS MODEL',
    category: 'AI_MODEL',
  },

  // 5. LAERS V2.0 Design Targets (from Concept Document)
  Target_cold_runtime: {
    id: 'Target_cold_runtime',
    name: 'Sub-Zero Flight Endurance Target',
    symbol: 't_flight',
    value: '40–45 min (vs 20–25 min baseline)',
    unit: 'min',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target operational flight time under extreme cold conditions (-35°C), doubling unheated baseline.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_preheat_time: {
    id: 'Target_preheat_time',
    name: 'Controlled Pre-Heating Target',
    symbol: 't_preheat',
    value: '<2 min controlled pre-heating',
    unit: 'min',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target pre-flight battery warm-up time compared to uncontrolled ambient soak.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_op_temp: {
    id: 'Target_op_temp',
    name: 'Battery High-Load Operating Temp Target',
    symbol: 'T_op_target',
    value: '-5°C to +15°C',
    unit: '°C',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Maintained core temperature range under sustained throttle in sub-zero ambient.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_sag_reduction: {
    id: 'Target_sag_reduction',
    name: 'Cold-Induced Voltage Sag Reduction Target',
    symbol: 'ΔV_sag_red',
    value: '30–50% lower target',
    unit: '%',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target reduction in ohmic drop during takeoff and high-power maneuver at sub-zero temperatures.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_pe_loss: {
    id: 'Target_pe_loss',
    name: 'Power-Electronics Loss Target',
    symbol: 'η_PE_loss',
    value: '9–10% target (vs ~15% baseline)',
    unit: '%',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target conversion efficiency improvement for wide-bandgap SiC/GaN power electronics at extreme cold.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_pe_weight: {
    id: 'Target_pe_weight',
    name: 'Power-Electronics Weight Target',
    symbol: 'm_PE',
    value: '350–400 g target (vs ~500 g baseline)',
    unit: 'g',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target subsystem mass reduction through integrated thermal packaging and GaN architecture.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_cold_boot: {
    id: 'Target_cold_boot',
    name: 'Cold Avionics Boot Time Target',
    symbol: 't_boot',
    value: '<60 s target (vs ~5 min baseline)',
    unit: 's',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target cold-start readiness duration at -35°C ground soak.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_avionics_power: {
    id: 'Target_avionics_power',
    name: 'Avionics Power Consumption Target',
    symbol: 'P_avionics',
    value: '80–90% target (vs 100% baseline)',
    unit: '%',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target avionics baseline power consumption reduction via adaptive power gating.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_thermal_cycle_failure: {
    id: 'Target_thermal_cycle_failure',
    name: 'Thermal-Cycle Failure Reduction Target',
    symbol: 'Fail_cycle_red',
    value: '≥50% reduction target',
    unit: '%',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target reduction in solder-joint fatigue and interconnect delamination under diurnal swings.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_availability: {
    id: 'Target_availability',
    name: 'Cold Operational Availability Target',
    symbol: 'A_cold',
    value: '>95% target',
    unit: '%',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target mission dispatch readiness across sub-zero Ladakh deployment cycles.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_swing: {
    id: 'Target_swing',
    name: 'Enclosure Internal Temperature Swing Target',
    symbol: 'ΔT_swing',
    value: '±8–10°C target (vs ±25°C baseline class)',
    unit: '°C',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target dampening of diurnal ambient swings (-40°C night to +15°C solar noon) via aerogel + PCM.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
  Target_replacement: {
    id: 'Target_replacement',
    name: 'Battery Replacement Interval Target',
    symbol: 'Life_pack',
    value: '4–6 years target (vs ~2–3 years baseline, profile dependent)',
    unit: 'yr',
    source: 'LAERS V2.0 Concept Design Target',
    status: 'TARGET',
    description: 'Target calendar/cycle pack service life by avoiding destructive cryogenic charging and severe plating.',
    provenance: 'TARGET',
    category: 'MISSION_DESIGN',
  },
};

/**
 * Helper to retrieve an engineering parameter with strict metadata.
 */
export function getParameter(id: string): ParameterEntry {
  const param = LAERS_PARAMETER_REGISTER[id];
  if (!param) {
    return {
      id,
      name: id,
      symbol: id,
      value: 'TBD',
      unit: '',
      source: 'TBD — REQUIRES CELL CHARACTERIZATION',
      status: 'TBD — REQUIRES HARDWARE SELECTION',
      description: 'Parameter awaiting hardware qualification or laboratory calibration.',
      provenance: 'TBD',
      category: 'ELECTRICAL',
    };
  }
  return param;
}
