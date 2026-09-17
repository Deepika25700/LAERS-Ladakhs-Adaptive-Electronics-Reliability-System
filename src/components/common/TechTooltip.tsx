import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export const TECH_DEFINITIONS: Record<string, { term: string; definition: string; context?: string }> = {
  PIDNN: {
    term: 'PIDNN',
    definition: 'Physics-Informed Deep Neural Network. Combines learned inference with physics-based conservation laws to predict battery state.',
    context: 'Neural model with embedded lumped thermal ODE loss constraints.'
  },
  'Physics Divergence': {
    term: 'Physics Divergence',
    definition: 'Real-time disparity between neural prediction and lumped ODE thermal physics. Triggers rule-based fail-safe if ΔT > 4.5°C.',
    context: 'Monitors prediction integrity against first-principles energy balance.'
  },
  RUL: {
    term: 'RUL (Remaining Useful Life)',
    definition: 'Remaining Useful Life estimate in flight/charge cycles based on active SEI layer growth and thermal stress degradation models.',
    context: 'Evaluated dynamically under sub-zero thermal cycling history.'
  },
  SOC: {
    term: 'SOC (State of Charge)',
    definition: 'State of Charge (%). Normalized available charge capacity remaining relative to current temperature-derated capacity.',
    context: 'Estimated via EKF fusing coulomb counting with OCV curves.'
  },
  SOH: {
    term: 'SOH (State of Health)',
    definition: 'State of Health (%). Current maximum usable battery capacity expressed as a percentage of original factory nominal capacity.',
    context: 'Reflects irreversible capacity loss and internal resistance growth.'
  },
  'Internal Resistance': {
    term: 'Internal Resistance (R_int)',
    definition: 'Equivalent series resistance (ESR). Expands exponentially at sub-zero temperatures via Arrhenius kinetics, inducing severe voltage sag.',
    context: 'Typically 18.5 mΩ at 25°C, expanding to >120 mΩ at -35°C.'
  },
  'Voltage Sag': {
    term: 'Voltage Sag (ΔV = I · R_int)',
    definition: 'Instantaneous terminal voltage drop under high discharge current, threatening premature 18.0V BMS emergency cutoff.',
    context: 'Primary cause of high-altitude drone power failure in Ladakh.'
  },
  'Arrhenius Scaling': {
    term: 'Arrhenius Kinetics',
    definition: 'Exponential rate law governing deceleration of electrochemical ion mobility and charge-transfer resistance in extreme cold.',
    context: 'R_int(T) = R_ref · exp[(E_a / R_gas) · (1/T - 1/T_ref)]'
  },
  EKF: {
    term: 'EKF (Extended Kalman Filter)',
    definition: 'Fuses noisy physical sensor telemetry (RTD, Hall current, voltage) with nonlinear electrochemical state models.',
    context: 'Continuously corrects state estimates using innovation residuals.'
  },
  PCM: {
    term: 'PCM (Phase Change Material)',
    definition: 'High-latent-heat paraffin composite integrated for passive thermal buffering during high-load loiter phases.',
    context: 'Buffers peak exothermic heat dissipation without active cooling power.'
  },
  Aerogel: {
    term: 'Silica Aerogel Insulation',
    definition: 'Nanoporous silica aerogel blanket (k ≈ 0.014 W/m·K) providing extreme thermal insulation against -38°C ambient convective sinks.',
    context: 'Encloses the 6S4P battery casing to retain generated heat.'
  },
  '6S4P': {
    term: '6S4P Architecture',
    definition: '6 Series, 4 Parallel cell pack configuration (24 cells total, 22.2V nominal, 24.0 Ah capacity, 532.8 Wh total pack energy).',
    context: 'Standard high-altitude aerospace drone propulsion battery module.'
  },
  'Mission Risk': {
    term: 'Mission Risk Index (0–100%)',
    definition: 'Composite tactical risk score evaluating voltage sag cutoff margin, thermal derating severity, and net energy balance.',
    context: 'Derived by the Mission Risk Engine to advise abort/continue actions.'
  },
  'Energy Margin': {
    term: 'Energy Margin (Wh)',
    definition: 'Net usable electrochemical energy remaining minus total projected mission profile energy expenditure.',
    context: 'Accounts for heating membrane expenditure vs ohmic savings.'
  },
  'Thermal Setpoint': {
    term: 'Thermal Setpoint (T_set)',
    definition: 'Target battery core temperature (typically 0°C to +10°C) maintained by predictive closed-loop heating.',
    context: 'Prevents cryo-induced internal resistance expansion.'
  }
};

interface TechTooltipProps {
  term: keyof typeof TECH_DEFINITIONS | string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export const TechTooltip: React.FC<TechTooltipProps> = ({
  term,
  children,
  showIcon = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement>(null);

  const entry = TECH_DEFINITIONS[term] || {
    term,
    definition: 'Technical aerospace engineering specification.'
  };

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.top < 140) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isOpen]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex items-center gap-1 group cursor-help ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={`${entry.term}: ${entry.definition}`}
    >
      <span className="border-b border-dotted border-amber-400/50 hover:border-amber-400 transition-colors">
        {children || term}
      </span>
      {showIcon && (
        <HelpCircle className="w-3 h-3 text-amber-400/70 inline-block shrink-0" />
      )}

      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 sm:w-72 p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] shadow-2xl text-left font-mono pointer-events-none animate-in fade-in zoom-in-95 duration-100 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#1e2432] pb-1.5 mb-1.5">
            <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase">
              {entry.term}
            </span>
            <span className="text-[9px] px-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              SPEC
            </span>
          </div>
          <p className="text-[11px] text-[#e2e8f0] leading-relaxed">
            {entry.definition}
          </p>
          {entry.context && (
            <p className="text-[10px] text-[#94a3b8] mt-1.5 pt-1.5 border-t border-[#1e2432]/60 italic">
              {entry.context}
            </p>
          )}
        </div>
      )}
    </span>
  );
};
