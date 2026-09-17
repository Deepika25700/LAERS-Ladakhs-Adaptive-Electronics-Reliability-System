import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Layers, 
  Cpu, 
  Flame, 
  Box, 
  Mountain, 
  FileCheck2, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionKey = 
  | 'overview' 
  | 'architecture' 
  | 'pidnn' 
  | 'thermal' 
  | 'twin' 
  | 'scenarios' 
  | 'provenance' 
  | 'validation';

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections: { id: SectionKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'System Overview', icon: BookOpen },
    { id: 'architecture', label: 'Runtime Architecture', icon: Layers },
    { id: 'pidnn', label: 'PIDNN Methodology', icon: Cpu },
    { id: 'thermal', label: 'Thermal Management', icon: Flame },
    { id: 'twin', label: 'Digital Twin (6S4P)', icon: Box },
    { id: 'scenarios', label: 'Mission Scenarios', icon: Mountain },
    { id: 'provenance', label: 'Data Provenance', icon: FileCheck2 },
    { id: 'validation', label: 'Validation Status', icon: ShieldAlert },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs font-mono text-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
    >
      <div 
        className="w-full max-w-5xl h-[88vh] max-h-[850px] rounded bg-[#0e1117] border border-[#1e2432] shadow-2xl flex flex-col overflow-hidden text-[#cbd5e1]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0b0e14] border-b border-[#1e2432] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                  ENGINEERING REFERENCE
                </span>
                <span className="text-[#334155]">•</span>
                <h2 id="doc-modal-title" className="text-sm font-bold text-[#f8fafc] tracking-tight uppercase">
                  LAERS TECHNICAL DOCUMENTATION
                </h2>
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                Ladakh's Adaptive Electronics Reliability System • Subsystem Design & Operating Principles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#151a24] border border-transparent hover:border-[#1e2432] transition cursor-pointer"
            title="Close documentation (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Sidebar Navigation + Right Content Pane */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Section Navigation Drawer */}
          <div className="w-full md:w-60 bg-[#0b0e14] border-b md:border-b-0 md:border-r border-[#1e2432] p-2 space-y-1 shrink-0 overflow-x-auto md:overflow-y-auto">
            <span className="hidden md:block px-2.5 py-1 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
              DOCUMENTATION INDEX
            </span>
            <div className="flex md:flex-col gap-1">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded text-left transition cursor-pointer whitespace-nowrap text-xs ${
                      isActive
                        ? 'bg-amber-500/10 text-[#f8fafc] border border-amber-500/50 font-bold'
                        : 'text-[#94a3b8] hover:bg-[#11141b] hover:text-[#e2e8f0] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-[#64748b]'}`} />
                      <span>{s.label}</span>
                    </div>
                    <ChevronRight className={`hidden md:block w-3 h-3 ${isActive ? 'text-amber-400' : 'text-[#334155]'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* 1. SYSTEM OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 01
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    System Overview
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-[#f8fafc] text-xs uppercase">What is LAERS?</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    <strong>LAERS (Ladakh's Adaptive Electronics Reliability System)</strong> is an autonomous, physics-informed battery intelligence and thermal management system engineered specifically for tactical unmanned aerial systems (UAS) operating in the extreme cold-altitude envelopes of Ladakh (3,000 m to 6,000 m MSL, −40°C to +10°C).
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-amber-300 text-xs uppercase">The Extreme-Altitude Problem</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    In high-altitude borders like Nyoma (4,180 m), Siachen (5,400 m), and Khardung La (5,359 m), drones suffer catastrophic power failure not from lack of total chemical charge, but from cold-induced transport inhibition:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#cbd5e1] pl-1">
                    <li><strong>Internal Resistance Cryo-Expansion:</strong> Arrhenius deceleration causes internal resistance (R_int) to surge 5× to 7× (18.5 mΩ at 25°C to &gt;120 mΩ at −35°C).</li>
                    <li><strong>Premature BMS Voltage Sag Cutoff:</strong> Under takeoff or climb current surges (38A–52A), the severe I · R_int ohmic drop collapses terminal voltage below the 18.0V emergency cutoff threshold while 70%+ chemical capacity remains locked in the pack.</li>
                    <li><strong>Reduced Air Density:</strong> Sub-500 mmHg barometric pressure reduces convective heat dissipation capability while requiring higher motor rotor RPM.</li>
                    <li><strong>Lithium Plating Hazards:</strong> Charging or high-rate regeneration at sub-zero temperatures triggers irreversible metallic dendrite formation.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-emerald-400 text-xs uppercase">Four Protection Layers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-amber-400 font-bold block">1. SENSING & EKF</span>
                      <span className="text-[11px] text-[#94a3b8]">Extended Kalman Filter fusing noisy RTD and Hall telemetry with nonlinear electrochemical models.</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-amber-400 font-bold block">2. PHYSICS CONSTRAINTS</span>
                      <span className="text-[11px] text-[#94a3b8]">First-principles validation checking lumped thermal ODEs, energy conservation, and monotonicity.</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-amber-400 font-bold block">3. PIDNN INFERENCE</span>
                      <span className="text-[11px] text-[#94a3b8]">Physics-Informed Deep Neural Network predicting multi-step core temperature and voltage sag margin.</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-amber-400 font-bold block">4. CLOSED-LOOP THERMAL</span>
                      <span className="text-[11px] text-[#94a3b8]">Predictive pulse-width heating membrane balancing heater energy budget against ohmic savings.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. RUNTIME ARCHITECTURE */}
            {activeSection === 'architecture' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 02
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Runtime Architecture & Data Flow
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
                  <p className="text-[#94a3b8] leading-relaxed">
                    LAERS operates as an authoritative, bidirectional closed-loop pipeline executing at each simulation discrete timestep ($\Delta t$):
                  </p>
                  
                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">1</span>
                      <div>
                        <strong className="text-[#f8fafc]">Mission Profile Ingestion:</strong> Defines tactical flight phases (Pre-flight, Takeoff, Cruise, Surveillance, Recovery), current draw, and duration.
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">2</span>
                      <div>
                        <strong className="text-[#f8fafc]">Physical Ground Truth & Sensors:</strong> Lumped ODE plant physics generates true battery core temperature, SOC, and terminal voltage; sensor layer applies realistic noise, RTD drift, and ADC discretization.
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">3</span>
                      <div>
                        <strong className="text-[#f8fafc]">EKF State Estimation:</strong> Computes filtered core temperature, estimated internal resistance (R_int), and usable capacity (Q_avail) using innovation residuals (ΔV, ΔT).
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">4</span>
                      <div>
                        <strong className="text-[#f8fafc]">Physics Features & Constraints:</strong> Calculates I²R resistive heat, reversible entropic heat (I · T · dE/dT), aerogel heat flux, and lumped dT/dt.
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">5</span>
                      <div>
                        <strong className="text-[#f8fafc]">PIDNN Inference & Degradation:</strong> Neural forward pass outputs predictions for future core temperature, voltage sag, SOH fade, and remaining useful life (RUL).
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">6</span>
                      <div>
                        <strong className="text-[#f8fafc]">Closed-Loop Thermal Decision:</strong> Evaluates net energy balance: only engages the 0–48W thin-film membrane if predicted usable capacity saved exceeds heater energy spent.
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">7</span>
                      <div>
                        <strong className="text-[#f8fafc]">Digital Twin & Feedback Loop:</strong> Updates 24-cell 6S4P thermal and voltage distribution and feeds updated battery temperature and energy depletion into the next physical ground-truth step.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PIDNN METHODOLOGY */}
            {activeSection === 'pidnn' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 03
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    PIDNN Methodology (Physics-Informed Deep Neural Network)
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-[#f8fafc] text-xs uppercase">Core Principle: Physics Governs</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    Pure data-driven neural networks are hazardous in aerospace: they extrapolate unpredictably outside training regimes. LAERS implements a <strong>Physics-Informed Deep Neural Network</strong> where first-principles thermodynamic and electrochemical equations act as hard loss constraints during training and continuous divergence watchdogs at runtime.
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-amber-300 text-xs uppercase">Multi-Objective Loss Formulation</h4>
                  <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] font-mono text-amber-400 text-xs">
                    L_total = L_data + λ₁·L_thermal + λ₂·L_degradation + λ₃·L_physics
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[#cbd5e1] pl-1 text-[11px]">
                    <li><strong>L_data:</strong> Supervised mean squared error against validated flight profiles.</li>
                    <li><strong>L_thermal:</strong> Penalty on violation of lumped ODE energy conservation: C_th · dT/dt - (Q_gen - Q_loss + Q_heater).</li>
                    <li><strong>L_degradation:</strong> Monotonicity constraint preventing unphysical capacity recovery.</li>
                    <li><strong>L_physics:</strong> Arrhenius resistance scaling penalty enforcing non-linear cold growth.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-red-400 text-xs uppercase">Physics Divergence & Fail-Safe Architecture</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    At every inference step, the system compares the neural core temperature prediction (T_PIDNN) against the first-principles lumped thermal differential equation (T_ODE):
                  </p>
                  <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432] text-[11px] text-[#cbd5e1]">
                    If |ΔT| = |T_PIDNN - T_ODE| &gt; 4.5°C or input features fall out-of-distribution, LAERS instantly engages <strong>FAIL-SAFE MODE</strong>. The neural prediction is suppressed, and thermal actuators fall back to a conservative, deterministic rule-based thermal state.
                  </div>
                </div>
              </div>
            )}

            {/* 4. THERMAL MANAGEMENT */}
            {activeSection === 'thermal' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 04
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Thermal Management Architecture
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <span className="font-bold text-amber-400 text-xs uppercase block">Self-Heating Membrane</span>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Etched polyimide/nickel thin-film heating elements integrated directly between cell matrix layers. Operates at 0W, 16W, 32W, or 48W via closed-loop pulse-width modulation (PWM).
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <span className="font-bold text-blue-400 text-xs uppercase block">Silica Aerogel Blanket</span>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Nanoporous silica aerogel (k ≈ 0.014 W/(m·K)) provides ultra-lightweight thermal insulation, minimizing convective heat leakage to −38°C wind chill.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <span className="font-bold text-purple-400 text-xs uppercase block">PCM Buffer Concept</span>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Phase Change Material with a 15°C melting point absorbs transient exothermic heat spikes during high-load loiter, preventing over-temperature without parasitic cooling draw.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <span className="font-bold text-emerald-400 text-xs uppercase block">Net Energy Trade-Off</span>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Heating consumes electrical energy (E_heater), but warming the core slashes internal resistance, which cuts I²R ohmic waste and unlocks &gt;25 Wh of usable electrochemical capacity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DIGITAL TWIN */}
            {activeSection === 'twin' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 05
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Digital Twin (6S4P Pack Architecture)
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-[#f8fafc] text-xs uppercase">24-Cell High-Altitude Propulsion Pack</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    The LAERS Digital Twin simulates a 24-cell lithium-ion battery configured as <strong>6S4P</strong> (6 series blocks of 4 parallel cells each):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-[10px] text-[#64748b] block">NOMINAL VOLTAGE</span>
                      <span className="text-amber-400 font-bold">22.2 V</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-[10px] text-[#64748b] block">PACK CAPACITY</span>
                      <span className="text-amber-400 font-bold">24.0 Ah</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-[10px] text-[#64748b] block">TOTAL ENERGY</span>
                      <span className="text-amber-400 font-bold">532.8 Wh</span>
                    </div>
                    <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2432]">
                      <span className="text-[10px] text-[#64748b] block">BMS CUTOFF</span>
                      <span className="text-red-400 font-bold">18.0 V</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-2">
                  <h4 className="font-bold text-amber-300 text-xs uppercase">Thermal Gradient & Voltage Spread Modeling</h4>
                  <p className="text-[#94a3b8] leading-relaxed">
                    Rather than treating the pack as a single lumped point, the Digital Twin tracks individual temperatures across internal core cells vs exterior boundary cells exposed to the cold housing. It computes real-time inter-series cell voltage divergence (ΔV_spread in mV) to flag localized thermal throttling or cell imbalance.
                  </p>
                </div>
              </div>
            )}

            {/* 6. MISSION SCENARIOS */}
            {activeSection === 'scenarios' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 06
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Ladakh Extreme-Altitude Mission Scenarios
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f8fafc] text-xs uppercase">1. Nyoma Forward Airfield Border Patrol</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        4,180 m • −35°C • 42 min
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Perimeter surveillance sortie over the Changthang plateau. Evaluates prolonged cold soaking at −35°C, high-rate takeoff climb (38A), and cruise loiter (16A) under severe wind chill (42 km/h).
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f8fafc] text-xs uppercase">2. Siachen / CHN Glaciated Reconnaissance</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        5,400 m • −38°C • 28 min
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      Rapid high-altitude glacier surveillance at extreme sub-zero threshold (−38°C). Atmospheric pressure falls to 415 mmHg. Unconditioned baseline suffers immediate 18.0V voltage sag abort at takeoff; LAERS predictive pre-conditioning maintains 19.8V margin.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f8fafc] text-xs uppercase">3. Khardung La Pass Supply Escort</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        5,359 m • −32°C • 35 min
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                      High mountain pass saddle point hover, relay escort, and station-keeping loiter under heavy gusting winds and thin air density.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DATA PROVENANCE */}
            {activeSection === 'provenance' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 07
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Data Provenance & Integrity Policy
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-[#f8fafc] text-xs uppercase">
                      PROTOTYPE DISCLAIMER
                    </span>
                  </div>
                  <p className="text-[#cbd5e1] leading-relaxed">
                    This software system is an aerospace research and engineering prototype. Training data used for neural network weights and degradation models is <strong>SYNTHETIC and MODEL-DERIVED</strong> from validated electrochemical lumped-parameter formulations and high-altitude thermodynamic literature.
                  </p>
                  <p className="text-[#94a3b8] leading-relaxed">
                    <strong>Real physical environmental test chamber and field experimental validation is PENDING.</strong>
                  </p>
                  <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1e2432] text-[11px] text-[#94a3b8]">
                    <strong className="text-amber-400">Strict Scientific Integrity Notice:</strong> LAERS makes no claims of active empirical telemetry from NASA, DRDO, Indian Armed Forces field stations, or live Ladakh flight deployments in this build. All flight traces are synthesized by the deterministic physical simulation engine.
                  </div>
                </div>
              </div>
            )}

            {/* 8. VALIDATION STATUS */}
            {activeSection === 'validation' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    SECTION 08
                  </span>
                  <h3 className="text-base font-bold text-[#f8fafc] uppercase tracking-tight">
                    Authoritative Validation Status Taxonomy
                  </h3>
                </div>

                <div className="p-3.5 rounded bg-[#11141b] border border-[#1e2432] space-y-3">
                  <p className="text-[#94a3b8] leading-relaxed">
                    To prevent any ambiguity during evaluation, all system outputs are classified into four explicit operational tiers:
                  </p>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-cyan-500/30 flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] shrink-0">
                        SIMULATED
                      </span>
                      <div>
                        <strong className="text-[#f8fafc]">Ground-Truth ODE Physics:</strong> Direct numeric integration of lumped-mass thermal differential equations and electrochemical OCV tables.
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b0e14] border border-blue-500/30 flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/50 text-blue-300 font-bold text-[10px] shrink-0">
                        MODEL-DERIVED
                      </span>
                      <div>
                        <strong className="text-[#f8fafc]">Electrochemical & Degradation Formulations:</strong> Arrhenius kinetic temperature derating curves, SEI layer growth approximations, and empirical wind chill heat transfer coefficients.
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b0e14] border border-amber-500/30 flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold text-[10px] shrink-0">
                        PIDNN PREDICTION
                      </span>
                      <div>
                        <strong className="text-[#f8fafc]">Neural Forward Pass Inference:</strong> Dense neural network predictions trained under physics-informed loss penalties. Continuously checked against ODE divergence limits.
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b0e14] border border-emerald-500/30 flex items-start gap-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] shrink-0">
                        ESTIMATED
                      </span>
                      <div>
                        <strong className="text-[#f8fafc]">Filtered State Telemetry:</strong> Extended Kalman Filter state vectors combining noisy physical sensor readings with prior covariance estimates.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#0b0e14] border-t border-[#1e2432] flex items-center justify-between text-[11px] text-[#64748b] shrink-0">
          <span>LAERS v3.4.2 TECHNICAL SPECIFICATION</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#11141b] hover:bg-[#151a24] text-[#cbd5e1] border border-[#1e2432] transition cursor-pointer font-bold"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
