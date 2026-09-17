/**
 * LAERS — Scientific Provenance & Status Badge Component
 * 
 * Renders an unobtrusive, high-contrast engineering tag indicating
 * whether a displayed value is MEASURED, SIMULATED, ESTIMATED, TARGET, etc.
 */

import React from 'react';
import { DataProvenance } from '../../core/types';

interface ProvenanceBadgeProps {
  provenance: DataProvenance;
  customLabel?: string;
  className?: string;
  tooltip?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  customLabel,
  className = '',
  tooltip,
}) => {
  const label = customLabel || provenance;

  // Scientific styling definitions
  let badgeStyle = 'bg-[#1b2230] text-[#94a3b8] border-[#2d3748]';
  let defaultTooltip = '';

  switch (provenance) {
    case 'MEASURED':
      badgeStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      defaultTooltip = 'Direct physical hardware/bench sensor reading';
      break;
    case 'USER DATA':
      badgeStyle = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
      defaultTooltip = 'User-supplied CSV flight or environmental telemetry';
      break;
    case 'SIMULATED':
      badgeStyle = 'bg-blue-950/60 text-blue-300 border-blue-500/40';
      defaultTooltip = 'Numerical closed-loop simulation state';
      break;
    case 'ESTIMATED':
      badgeStyle = 'bg-purple-950/60 text-purple-300 border-purple-500/40';
      defaultTooltip = 'Extended Kalman Filter / observer state estimation';
      break;
    case 'PHYSICS MODEL':
      badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      defaultTooltip = 'Derived from governing physical equation (e.g. Arrhenius, Lumped Thermal)';
      break;
    case 'PIDNN PREDICTION':
    case 'MODEL OUTPUT':
      badgeStyle = 'bg-amber-900/40 text-amber-300 border-amber-500/50';
      defaultTooltip = 'Physics-Informed Deep Neural Network forward inference (Prototype)';
      break;
    case 'ENGINEERING ASSUMPTION':
      badgeStyle = 'bg-orange-950/60 text-orange-300 border-orange-500/40';
      defaultTooltip = 'Configured engineering assumption pending exact hardware selection';
      break;
    case 'TARGET':
      badgeStyle = 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40';
      defaultTooltip = 'LAERS V2.0 Design Target from Concept Specification';
      break;
    case 'REFERENCE':
      badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-600/50';
      defaultTooltip = 'Standard aerospace/atmospheric reference constant';
      break;
    case 'TBD':
      badgeStyle = 'bg-red-950/60 text-red-300 border-red-500/40';
      defaultTooltip = 'Requires cell characterization or hardware selection';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide border uppercase select-none ${badgeStyle} ${className}`}
      title={tooltip || defaultTooltip}
    >
      {label}
    </span>
  );
};
