/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 02: State Estimation Layer
 * 
 * Implements an Extended Kalman Filter-inspired recursive estimator for noisy telemetry.
 * Strictly separates raw noisy sensor measurements from filtered state estimates:
 * 
 * - State Vector x = [T_batt, SOC, R_int, Cap_avail]
 * - Predict step uses lumped thermal dynamics and Coulomb integration
 * - Update step computes Kalman gain and incorporates voltage & RTD measurements
 * - Tracks innovation residual and error covariance trace
 */

import { RawTelemetryFrame, StateEstimationResult, BatterySpecs } from './types';
import { calculateInternalResistance, calculateAvailableCapacity, calculateOCV } from '../physics/thermalModel';

export class BatteryStateEstimator {
  // State estimates
  private x_tempC: number = -35.0;
  private x_socPct: number = 85.0;
  private x_rIntMOhm: number = 75.0;
  private x_capAvailAh: number = 14.5;

  // Error covariance matrix diagonal terms
  private p_temp: number = 0.5;
  private p_soc: number = 0.2;
  private p_rInt: number = 2.0;

  // Process noise variance Q
  private readonly q_temp: number = 0.04;
  private readonly q_soc: number = 0.01;
  private readonly q_rInt: number = 0.15;

  // Measurement noise variance R
  private readonly r_temp: number = 0.15;
  private readonly r_volt: number = 0.05;

  public reset(initialTempC: number, initialSocPct: number, specs: BatterySpecs) {
    this.x_tempC = initialTempC;
    this.x_socPct = initialSocPct;
    this.x_rIntMOhm = calculateInternalResistance(initialTempC, 50, 96.0);
    this.x_capAvailAh = calculateAvailableCapacity(specs.nominalCapacityAh, initialTempC, 1.0, 96.0);
    this.p_temp = 0.5;
    this.p_soc = 0.2;
    this.p_rInt = 2.0;
  }

  public estimateState(
    frame: RawTelemetryFrame,
    dtSec: number,
    specs: BatterySpecs,
    heaterActive: boolean
  ): StateEstimationResult {
    // 1. Time Update (Predict step via physics model prior)
    // Thermal physics prior: C_th * dT/dt = I²R - (T - T_amb)/R_th + Q_heater
    const Q_gen = Math.pow(frame.currentA.value, 2) * (this.x_rIntMOhm / 1000.0);
    const Q_loss = (this.x_tempC - frame.ambientTempC.value) / specs.thermalResistanceK_W;
    const Q_heater = heaterActive ? specs.membraneHeaterPowerW : 0.0;
    const dT_dt = (Q_gen - Q_loss + Q_heater) / specs.thermalMassJ_K;

    const x_temp_prior = this.x_tempC + dT_dt * dtSec;
    // Coulomb count prior: dSOC/dt = -I / (3600 * Cap) * 100
    const dSoc_dt = -(frame.currentA.value / (specs.nominalCapacityAh * 3600)) * 100;
    const x_soc_prior = Math.max(0, Math.min(100, this.x_socPct + dSoc_dt * dtSec));

    // Propagate covariance
    const p_temp_prior = this.p_temp + this.q_temp * dtSec;
    const p_soc_prior = this.p_soc + this.q_soc * dtSec;

    // 2. Measurement Update (Correct step)
    let tempResidual = 0.0;
    let voltResidual = 0.0;

    // A. Temperature Measurement update
    if (frame.batteryTempC.quality !== 'MISSING' && !isNaN(frame.batteryTempC.value)) {
      tempResidual = frame.batteryTempC.value - x_temp_prior;
      const K_temp = p_temp_prior / (p_temp_prior + this.r_temp);
      this.x_tempC = x_temp_prior + K_temp * tempResidual;
      this.p_temp = (1.0 - K_temp) * p_temp_prior;
    } else {
      this.x_tempC = x_temp_prior;
      this.p_temp = p_temp_prior;
    }

    // B. SOC & Voltage Innovation update
    if (frame.voltageV.quality !== 'MISSING' && !isNaN(frame.voltageV.value)) {
      const ocvPrior = calculateOCV(x_soc_prior);
      const voltPredicted = ocvPrior - (frame.currentA.value * (this.x_rIntMOhm / 1000.0));
      voltResidual = frame.voltageV.value - voltPredicted;

      // Small correction to SOC based on voltage residual
      const K_soc = p_soc_prior / (p_soc_prior + this.r_volt * 10.0);
      this.x_socPct = Math.max(0, Math.min(100, x_soc_prior + K_soc * voltResidual * 2.0));
      this.p_soc = (1.0 - K_soc) * p_soc_prior;
    } else {
      this.x_socPct = x_soc_prior;
      this.p_soc = p_soc_prior;
    }

    // C. Physical lookup for R_int and Available Capacity based on filtered temperature
    const theoreticalR = calculateInternalResistance(this.x_tempC, frame.cycleCount.value, 96.0);
    // Smooth resistance estimation
    this.x_rIntMOhm = 0.85 * this.x_rIntMOhm + 0.15 * theoreticalR;
    this.x_capAvailAh = calculateAvailableCapacity(
      specs.nominalCapacityAh,
      this.x_tempC,
      frame.currentA.value / specs.nominalCapacityAh,
      96.0
    );

    const covTrace = this.p_temp + this.p_soc + this.p_rInt;
    const status = Math.abs(tempResidual) > 3.0 || Math.abs(voltResidual) > 0.8
      ? 'INNOVATION_SPIKE'
      : covTrace > 4.0
      ? 'COVARIANCE_HIGH'
      : 'FILTER_CONVERGED';

    return {
      measured: {
        tempC: frame.batteryTempC.value,
        voltageV: frame.voltageV.value,
        currentA: frame.currentA.value,
        socPct: frame.socPct.value,
      },
      estimated: {
        tempC: Number(this.x_tempC.toFixed(2)),
        socPct: Number(this.x_socPct.toFixed(2)),
        internalResistanceMOhm: Number(this.x_rIntMOhm.toFixed(2)),
        availableCapacityAh: Number(this.x_capAvailAh.toFixed(2)),
      },
      filterInnovation: {
        tempResidualC: Number(tempResidual.toFixed(3)),
        voltageResidualV: Number(voltResidual.toFixed(3)),
        covarianceTrace: Number(covTrace.toFixed(3)),
      },
      status,
    };
  }
}

export const stateEstimator = new BatteryStateEstimator();
