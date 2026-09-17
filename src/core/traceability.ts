/**
 * LAERS — Battery Intelligence Engine
 * Subsystem: Traceability Engine
 * 
 * Provides rigorous mathematical and operational provenance for any critical metric:
 * Explains step-by-step "Where did this number come from?"
 */

import { MetricTrace } from './types';
import { CompleteEngineSnapshot } from './simulationEngine';

export function getMetricTrace(metricKey: string, snap: CompleteEngineSnapshot): MetricTrace {
  switch (metricKey) {
    case 'mission_risk':
      return {
        metricName: 'Mission Risk Index',
        finalValue: `${snap.missionRisk.missionRiskPct}% (${snap.missionRisk.voltageSagRiskLevel})`,
        interpretation: 'Probability that battery voltage will violate the 18.0V emergency cutoff or exhaust energy reserve before mission completion.',
        chain: [
          {
            label: '1. Temperature Sensing & Estimation',
            subValue: `T_core = ${snap.stateEstimation.estimated.tempC.toFixed(1)}°C (T_amb = ${snap.environment.ambientTempC.toFixed(1)}°C)`,
            equation: 'RTD sensor array + Extended Kalman Filter state estimate',
            provenance: 'ESTIMATED',
          },
          {
            label: '2. Low-Temperature Impedance Surge',
            subValue: `R_int = ${snap.stateEstimation.estimated.internalResistanceMOhm.toFixed(1)} mΩ`,
            equation: 'Arrhenius activation barrier: R(T) = R_ref * exp(E_a/R_g * (1/T - 1/T_ref))',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '3. Ohmic Voltage Sag Under Load',
            subValue: `V_sag = ${snap.pidnnInference.predictions.voltageSagV.toFixed(2)} V at ${snap.rawTelemetry.currentA.value.toFixed(1)} A`,
            equation: 'Ohmic law: V_sag = I_load * (R_int / 1000)',
            provenance: 'MODEL OUTPUT',
          },
          {
            label: '4. Dynamic Terminal Cutoff Margin',
            subValue: `V_terminal = ${snap.digitalTwin.voltageV.toFixed(2)} V (Cutoff = ${snap.specs.lowerVoltageCutoffV.toFixed(1)} V)`,
            equation: 'V_term = OCV(SOC) - V_sag',
            provenance: 'MEASURED',
          },
          {
            label: '5. Mission Energy Reserve & Heater Deduction',
            subValue: `Net Margin = ${snap.missionRisk.estimatedEnergyMarginWh.toFixed(1)} Wh (Heater spent: ${snap.missionRisk.heaterEnergySpentWh.toFixed(1)} Wh)`,
            equation: 'E_avail = (SOC * Cap_avail * V_nom) - E_heater - E_mission_demand',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '6. Synthesized Tactical Mission Risk',
            subValue: `${snap.missionRisk.missionRiskPct}% risk level`,
            equation: 'Risk = f(V_sag_margin, Thermal_risk, Energy_deficit, OOD_penalty)',
            provenance: 'MODEL OUTPUT',
          },
        ],
      };

    case 'internal_resistance':
      return {
        metricName: 'Internal Resistance R_int',
        finalValue: `${snap.stateEstimation.estimated.internalResistanceMOhm.toFixed(1)} mΩ`,
        interpretation: 'Effective pack impedance including bulk electrolyte resistance, charge transfer overpotential, and SEI layer barrier.',
        chain: [
          {
            label: '1. Reference Pack Impedance at +25°C',
            subValue: '18.5 mΩ (6S4P Low-Temp NMC811/Si-C)',
            equation: 'R_ref = 18.5 mΩ nominal factory baseline',
            provenance: 'SIMULATED',
          },
          {
            label: '2. Cryogenic Arrhenius Temperature Scaling',
            subValue: `Temp Factor = ${(snap.stateEstimation.estimated.internalResistanceMOhm / 18.5).toFixed(2)}x at ${snap.stateEstimation.estimated.tempC.toFixed(1)}°C`,
            equation: 'exp(2850 * (1/T_kelvin - 1/298.15)) + Cryo_inflection',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '3. Aging & Cycle Degradation Multiplication',
            subValue: `${snap.degradation.currentSohPct.toFixed(1)}% SOH (${snap.rawTelemetry.cycleCount.value} cycles)`,
            equation: 'Degradation factor: 1.0 + (100 - SOH%) * 0.019',
            provenance: 'MODEL OUTPUT',
          },
          {
            label: '4. Kalman State Filter Smoothing',
            subValue: `${snap.stateEstimation.estimated.internalResistanceMOhm.toFixed(1)} mΩ`,
            equation: 'Recursive innovation update using measured voltage sag and shunt current',
            provenance: 'ESTIMATED',
          },
        ],
      };

    case 'thermal_control':
      return {
        metricName: 'Thermal Control Power & Allocation',
        finalValue: `${snap.thermalControl.heaterPowerW} W (${snap.thermalControl.mode})`,
        interpretation: 'Closed-loop power delivered by thin-film etched foil heater to restore cell kinetics while managing energy budget.',
        chain: [
          {
            label: '1. Thermal Loss Rate vs Joule Self-Heating',
            subValue: `Q_loss = ${snap.physicsFeatures.thermalLossW.toFixed(1)} W, Q_joule = ${snap.physicsFeatures.resistiveHeatGenW.toFixed(1)} W`,
            equation: 'Q_loss = (T_batt - T_amb) / R_th; Q_gen = I² * R',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '2. Aerogel Thermal Insulation Barrier',
            subValue: `R_th = ${snap.specs.thermalResistanceK_W.toFixed(2)} K/W (Silica Aerogel Blanket)`,
            equation: 'Insulation blanket traps 78% of generated heat vs uninsulated enclosure',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '3. Energy Budget Lockout Verification',
            subValue: `SOC = ${snap.digitalTwin.socPct.toFixed(1)}% (Threshold: 15.0%)`,
            equation: 'Auxiliary heating permitted only if battery reserve > 15%',
            provenance: 'MEASURED',
          },
          {
            label: '4. Controller Policy Decision',
            subValue: `${snap.thermalControl.dutyCyclePct}% duty cycle (${snap.thermalControl.mode})`,
            equation: snap.thermalControl.decisionRationale,
            provenance: 'MODEL OUTPUT',
          },
          {
            label: '5. Net Mission Trade-Off Balance',
            subValue: `Cost: ${snap.thermalControl.energySubtractedWh.toFixed(1)} Wh consumed | Gain: +${snap.thermalControl.netMissionEnergyGainWh.toFixed(1)} Wh usable unlocked`,
            equation: 'Energy_gain = Unlocked_capacity_Wh - Heater_consumption_Wh',
            provenance: 'PHYSICS MODEL',
          },
        ],
      };

    case 'rul':
    default:
      return {
        metricName: 'Remaining Useful Life (RUL)',
        finalValue: `${snap.degradation.projectedRulCycles} cycles [${snap.degradation.rulUncertainty.lowerBoundCycles} - ${snap.degradation.rulUncertainty.upperBoundCycles}]`,
        interpretation: 'Estimated operational cycles before battery capacity degrades below 80% SOH under sub-zero duty cycles.',
        chain: [
          {
            label: '1. Cumulative Cycle Exposure & Thermal History',
            subValue: `${snap.rawTelemetry.cycleCount.value} cycles logged at avg temp ${snap.stateEstimation.estimated.tempC.toFixed(1)}°C`,
            equation: 'Non-volatile EEPROM flight cycle counter',
            provenance: 'MEASURED',
          },
          {
            label: '2. Low-Temperature SEI Damage Acceleration',
            subValue: `${snap.degradation.thermalStressScore}/100 stress score`,
            equation: 'Damage rate multiplier: 1.0 + |T_amb| * 0.024 for sub-zero missions',
            provenance: 'PHYSICS MODEL',
          },
          {
            label: '3. Current State of Health (SOH)',
            subValue: `${snap.degradation.currentSohPct.toFixed(1)}% SOH (Capacity loss: ${snap.degradation.capacityLossPct.toFixed(2)}%)`,
            equation: 'SOH = 100% - Total_Capacity_Loss%',
            provenance: 'ESTIMATED',
          },
          {
            label: '4. Projection to 80% SOH Standard EOL Cutoff',
            subValue: `${snap.degradation.projectedRulCycles} remaining cycles`,
            equation: 'RUL = (SOH - 80%) / (Base_cycle_loss * Cold_multiplier)',
            provenance: 'MODEL OUTPUT',
          },
          {
            label: '5. Uncertainty Bounds Evaluation',
            subValue: `±16% confidence spread: [${snap.degradation.rulUncertainty.lowerBoundCycles} - ${snap.degradation.rulUncertainty.upperBoundCycles}]`,
            equation: snap.degradation.rulUncertainty.disclaimer,
            provenance: 'MODEL OUTPUT',
          },
        ],
      };
  }
}
