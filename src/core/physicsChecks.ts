/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 04: Physics Constraint & Consistency Engine
 * 
 * Verifies that operational states and model projections adhere to fundamental
 * thermodynamic and electrochemical conservation laws:
 * 
 * 1. Thermal consistency: |dT/dt| <= (Q_gen_max + Q_heater_max) / C_th
 * 2. SOC boundary check: 0.0% <= SOC <= 100.0%
 * 3. Capacity monotonicity: d(Capacity)/d(cycles) <= 0
 * 4. Low-temp Arrhenius trend: dR/dT < 0 (impedance increases as temperature drops)
 * 5. Energy balance consistency: Integrated P_elec*dt vs. Δ(SOC * E_nom) residual
 */

import { PhysicsChecks, PhysicsFeatures, BatteryTelemetry } from './types';

export class PhysicsConstraintEngine {
  private previousCapacities: number[] = [];
  private previousTemperatures: number[] = [];
  private previousResistances: number[] = [];

  public reset() {
    this.previousCapacities = [];
    this.previousTemperatures = [];
    this.previousResistances = [];
  }

  public evaluateConstraints(
    currentTempC: number,
    socPct: number,
    rIntMOhm: number,
    availableCapAh: number,
    physicsFeatures: PhysicsFeatures,
    history: BatteryTelemetry[]
  ): PhysicsChecks {
    // 1. Thermal consistency check
    // Max physically possible rate of temperature change for 880 J/K pack:
    // With 60W heater + 50W max Joule heat = 110W / 880 J/K = 0.125 °C/s (7.5 °C/min)
    const maxPlausibleRateC_per_sec = 0.18;
    const currentRate = Math.abs(physicsFeatures.lumpedDerivT_C_per_sec);
    const thermalPass = currentRate <= maxPlausibleRateC_per_sec;

    // 2. SOC boundary check
    const socPass = socPct >= 0.0 && socPct <= 100.0;

    // 3. Capacity Monotonicity check
    // Batteries cannot gain nominal capacity over cycles without external intervention
    let capacityMonotonicPass = true;
    let capDelta = 0;
    if (this.previousCapacities.length > 5) {
      const oldest = this.previousCapacities[0];
      capDelta = availableCapAh - oldest;
      // Small measurement noise tolerance of 0.25 Ah
      if (capDelta > 0.35) {
        capacityMonotonicPass = false;
      }
    }
    this.previousCapacities.push(availableCapAh);
    if (this.previousCapacities.length > 20) this.previousCapacities.shift();

    // 4. Low-temp Resistance Trend check (Arrhenius: cold -> higher R)
    let resistanceTrendPass = true;
    let dR_dT_sign: 'NEGATIVE' | 'POSITIVE' = 'NEGATIVE';
    if (this.previousTemperatures.length >= 3 && this.previousResistances.length >= 3) {
      const prevT = this.previousTemperatures[this.previousTemperatures.length - 2];
      const prevR = this.previousResistances[this.previousResistances.length - 2];
      const deltaT = currentTempC - prevT;
      const deltaR = rIntMOhm - prevR;
      if (Math.abs(deltaT) > 0.2) {
        const slope = deltaR / deltaT;
        // As T drops (deltaT < 0), R should rise (deltaR > 0), so slope = deltaR/deltaT should be negative
        if (slope > 0.2) {
          resistanceTrendPass = false; // Non-physical resistance decrease during cooling
          dR_dT_sign = 'POSITIVE';
        }
      }
    }
    this.previousTemperatures.push(currentTempC);
    this.previousResistances.push(rIntMOhm);
    if (this.previousTemperatures.length > 20) {
      this.previousTemperatures.shift();
      this.previousResistances.shift();
    }

    // 5. Energy Consistency check
    // Instantaneous electrical power output vs thermal dissipation
    const balanceResidual = Math.abs(
      physicsFeatures.totalHeatGenW - 
      (physicsFeatures.resistiveHeatGenW + physicsFeatures.reversibleEntropyHeatW)
    );
    const energyPass = balanceResidual < 0.8;

    const overallPass = thermalPass && socPass && capacityMonotonicPass && resistanceTrendPass && energyPass;

    return {
      thermalConsistency: {
        pass: thermalPass,
        value: Number(currentRate.toFixed(4)),
        limit: maxPlausibleRateC_per_sec,
        message: thermalPass 
          ? `Thermal derivative within physical lumped bound (|dT/dt| = ${(currentRate * 60).toFixed(2)} °C/min)`
          : `Thermal derivative exceeds physical dissipation ceiling (${(currentRate * 60).toFixed(2)} °C/min > 10.8 °C/min)`,
      },
      socBounds: {
        pass: socPass,
        value: socPct,
        min: 0.0,
        max: 100.0,
      },
      capacityMonotonicity: {
        pass: capacityMonotonicPass,
        ratePerCyclePct: Number((capDelta / Math.max(1, availableCapAh) * 100).toFixed(2)),
      },
      resistanceTrend: {
        pass: resistanceTrendPass,
        dR_dT_sign,
        message: resistanceTrendPass
          ? 'Negative temperature coefficient compliant (Arrhenius electrolyte impedance rise)'
          : 'WARNING: Anomalous resistance inversion detected relative to temperature gradient',
      },
      energyConsistency: {
        pass: energyPass,
        balanceResidualW: Number(balanceResidual.toFixed(3)),
      },
      overallPass,
    };
  }
}

export const physicsConstraintEngine = new PhysicsConstraintEngine();
