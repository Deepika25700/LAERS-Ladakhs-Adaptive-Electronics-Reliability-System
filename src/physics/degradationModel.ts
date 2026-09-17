/**
 * LAERS — Battery Intelligence Engine
 * Physics Module: Capacity Degradation & Remaining Useful Life (RUL) Model
 * 
 * Equations & Relationships:
 * 1. SEI Growth & Cyclic Capacity Fade: C_loss = alpha * sqrt(t_exposure) + beta * (cycles)^z
 * 2. Low-Temperature Lithium Plating Risk Coefficient: Psi_plating = f(T < 0°C, I_charge, SOC)
 * 3. Thermal Cycling Stress Acceleration: Arrhenius damage accumulation
 * 4. Remaining Useful Life (RUL) Projection to 80% State of Health (SOH) Cutoff
 * 5. Prediction Uncertainty Intervals (Illustrative Uncertainty Bounds)
 */

export interface DegradationState {
  currentSohPct: number;
  nominalCapacityAh: number;
  currentActualCapacityAh: number;
  capacityLossPct: number;
  resistanceIncreasePct: number;
  projectedRulCycles: number;
  rulLowerBoundCycles: number;
  rulUpperBoundCycles: number;
  thermalStressScore: number;
  lithiumPlatingRiskPct: number;
  degradationRatePer100Cycles: number;
}

/**
 * Calculates current battery State of Health and projections based on cycle count and thermal history
 */
export function estimateDegradation(
  cycleCount: number,
  avgOperatingTempC: number,
  coldCyclesCount: number = 0,
  nominalCapacityAh: number = 24.0
): DegradationState {
  // Baseline cyclic loss at room temp: ~0.015% per cycle
  const baseLossPerCycle = 0.016;
  
  // Accelerated degradation from severe cold exposure:
  // Operating or cycling below -10°C increases SEI mechanical cracking and micro-delamination
  let coldPenalty = 1.0;
  if (avgOperatingTempC < 0) {
    coldPenalty += Math.abs(avgOperatingTempC) * 0.022; // up to ~1.77x at -35°C
  }
  
  const totalCapacityLossPct = Math.min(
    45.0,
    (cycleCount * baseLossPerCycle * coldPenalty) + (coldCyclesCount * 0.08)
  );
  
  const currentSohPct = Number(Math.max(55.0, 100.0 - totalCapacityLossPct).toFixed(1));
  const currentActualCapacityAh = Number(((nominalCapacityAh * currentSohPct) / 100.0).toFixed(2));
  
  // Resistance growth typically tracks 1.8x - 2.2x the capacity loss percentage
  const resistanceIncreasePct = Number((totalCapacityLossPct * 1.95).toFixed(1));

  // End of Life (EOL) standard defined as 80% SOH (20% capacity loss)
  const remainingSohToEol = Math.max(0, currentSohPct - 80.0);
  const effectiveLossPerCycle = Math.max(0.012, baseLossPerCycle * coldPenalty);
  
  const rawRulCycles = Math.round(remainingSohToEol / effectiveLossPerCycle);
  
  // Model uncertainty envelope:
  // Scientific honesty: Real batteries have cycle-to-cycle variance of ±10-18%
  const uncertaintySpread = Math.max(25, Math.round(rawRulCycles * 0.14));
  const rulLower = Math.max(0, rawRulCycles - uncertaintySpread);
  const rulUpper = rawRulCycles + uncertaintySpread;

  // Thermal stress score (0 to 100)
  // Optimal temperature range: 15°C to 28°C
  let thermalStress = 0;
  if (avgOperatingTempC < 15) {
    thermalStress = Math.min(100, Math.pow((15 - avgOperatingTempC) / 50, 1.4) * 100);
  } else if (avgOperatingTempC > 35) {
    thermalStress = Math.min(100, ((avgOperatingTempC - 35) / 25) * 100);
  }

  // Sub-zero charging / regeneration plating risk
  const platingRiskPct = avgOperatingTempC < 0 
    ? Math.min(100, Math.round(Math.abs(avgOperatingTempC) * 2.6)) 
    : 0;

  return {
    currentSohPct,
    nominalCapacityAh,
    currentActualCapacityAh,
    capacityLossPct: Number(totalCapacityLossPct.toFixed(1)),
    resistanceIncreasePct,
    projectedRulCycles: rawRulCycles,
    rulLowerBoundCycles: rulLower,
    rulUpperBoundCycles: rulUpper,
    thermalStressScore: Math.round(thermalStress),
    lithiumPlatingRiskPct: platingRiskPct,
    degradationRatePer100Cycles: Number((effectiveLossPerCycle * 100).toFixed(2)),
  };
}

/**
 * Generate historical & projected capacity trajectory curves for scientific visualization
 */
export function generateDegradationTrajectory(
  currentCycle: number,
  sohPct: number,
  avgTempC: number
): Array<{
  cycle: number;
  actualSoh: number | null;
  predictedSoh: number;
  uncertaintyUpper: number;
  uncertaintyLower: number;
  eolThreshold: number;
}> {
  const points: Array<{
    cycle: number;
    actualSoh: number | null;
    predictedSoh: number;
    uncertaintyUpper: number;
    uncertaintyLower: number;
    eolThreshold: number;
  }> = [];

  const totalHorizon = Math.max(1200, currentCycle + 600);
  const step = 40;

  for (let c = 0; c <= totalHorizon; c += step) {
    const isHistorical = c <= currentCycle;
    
    // Non-linear trajectory with knee point around 80% SOH
    const baseSlope = 0.016 * (avgTempC < 0 ? 1.0 + Math.abs(avgTempC) * 0.018 : 1.0);
    const estimatedLoss = c * baseSlope + (c > 700 ? Math.pow((c - 700) / 300, 2) * 2.5 : 0);
    const predictedSoh = Math.max(50, 100 - estimatedLoss);
    
    // Spread increases as we project further into the future (fan of uncertainty)
    const futureDelta = Math.max(0, c - currentCycle);
    const spread = (futureDelta / 100) * 1.35;

    points.push({
      cycle: c,
      actualSoh: isHistorical ? Math.max(50, 100 - (c * baseSlope * 0.98)) : null,
      predictedSoh: Number(predictedSoh.toFixed(1)),
      uncertaintyUpper: Number(Math.min(100, predictedSoh + spread).toFixed(1)),
      uncertaintyLower: Number(Math.max(45, predictedSoh - spread).toFixed(1)),
      eolThreshold: 80.0,
    });
  }

  return points;
}
