# LAERS — Battery Intelligence Engine
### Physics-Informed Predictive BMS for Extreme-Altitude Reliability
**Software Intelligence Layer for Ladakh’s Adaptive Electronics Reliability System (LAERS)**

---

## 1. Executive Summary

Operating unmanned aerial vehicles (UAVs), surveillance drones, and stationary sensor nodes in extreme high-altitude mountain warfare theatres (such as Ladakh, Siachen, Nyoma, and Daulat Beg Oldi at 3,000m to 5,500m MSL) presents lethal challenges to standard lithium-ion energy storage systems.

At ambient temperatures plummeting to **-35°C** and hypobaric pressure (~510 mmHg), commercial battery management systems (BMS) encounter sudden, premature voltage collapses, rapid capacity lockup, and inaccurate State of Charge (SOC) estimations.

**LAERS** solves this through a dual-defense architecture:
1. **Physical Defense:** Low-temperature NMC811 / Silicon-Carbon cells, etched-foil thin-film self-heating membranes, and hydrophobic silica aerogel insulation blankets.
2. **Software Intelligence Layer:** A Physics-Informed Deep Neural Network (**PIDNN**) predictive BMS that models Arrhenius electrochemical kinetics, Joule dissipation, and thermal energy balances to anticipate voltage sag before it triggers in-flight cutoffs.

---

## 2. Why Conventional BMS Algorithms Fail in Extreme Cold

Standard automotive and drone BMS rely on simple look-up tables or standard Coulomb counting algorithms calibrated at +25°C:
- **Arrhenius Resistance Spikes:** Electrolyte viscosity increases and lithium-ion desolvation kinetics slow down exponentially at sub-zero temperatures. Internal resistance ($R_{int}$) surges by 400% to 700%.
- **Catastrophic Ohmic Voltage Sag:** Under high motor throttle or surveillance camera gimbal loads, ohmic voltage drop ($V_{sag} = I \cdot R_{int}$) exceeds 3.5V, driving terminal voltage below the 18.0V hardware cutoff despite 80%+ SOC remaining in the cells.
- **Lithium Plating Hazard:** Forcing high charging currents into cold graphite anodes causes metallic lithium plating, leading to irreversible capacity loss and internal micro-short risk.
- **Sparse Cold Data for Standard AI:** Purely data-driven machine learning models (standard DNNs/LSTMs) lack extreme-cold training samples, resulting in non-physical voltage predictions and hallucinated safety margins.

---

## 3. Physics-Informed Deep Neural Network (PIDNN) Formulation

The LAERS intelligence engine couples deep neural network layers with physical conservation equations directly inside the objective loss function:

$$L_{total} = L_{data} + \lambda_1 L_{thermal} + \lambda_2 L_{degradation} + \lambda_3 L_{physics}$$

Where:
- **$L_{data}$ (Empirical Loss):** Mean squared error (MSE) between sensor telemetry and predicted states:
  $$L_{data} = \frac{1}{N} \sum (V_{meas} - V_{pred})^2 + (T_{meas} - T_{pred})^2$$
- **$L_{thermal}$ (Heat Conservation Loss):** Penalizes violation of the 1st Law of Thermodynamics across the lumped thermal capacitance model:
  $$C_{th} \frac{dT}{dt} - \left( I^2 R_{int} + P_{heater} - \frac{T_{batt} - T_{amb}}{R_{th}} \right) = 0$$
- **$L_{degradation}$ (Kinetic Boundary Loss):** Enforces electrochemical degradation boundaries and Arrhenius resistance growth constraints:
  $$R_{int}(T) = R_{ref} \cdot \exp\left( \frac{E_a}{R_{gas}} \left(\frac{1}{T} - \frac{1}{T_0}\right) \right)$$
- **$L_{physics}$ (Ohmic & OCV Consistency Loss):** Restricts terminal voltage predictions to obey open-circuit voltage curves and Ohm’s law:
  $$V_{term} = V_{OCV}(SOC) - I \cdot R_{int}$$

---

## 4. Key Subsystems & Architecture

```
ENVIRONMENTAL BOUNDARY (-35°C, 510 mmHg Ladakh Airfield)
       │
       ▼
SENSORS (Multi-Point PT1000 RTDs, Hall Current Sensor, Bus Voltage)
       │
       ▼
BATTERY STATE ESTIMATION (Kalman Filter + Coulomb Integration)
       │
       ▼
PHYSICS FEATURE ENGINE (Joule Dissipation + Arrhenius Kinetics)
       │
       ▼
PIDNN INFERENCE MODEL (Multi-Objective Regularized Neural Network)
       │
       ▼
DEGRADATION & RUL (SEI Film Growth + Lithium Plating Analysis)
       │
       ▼
MISSION RISK ENGINE (Ohmic Sag Cutoff Margin & Completion %)
       │
       ▼
ADAPTIVE THERMAL CONTROL (48W Etched-Foil Polyimide Membrane Pulse)
       │
       ▼
PHYSICAL 6S4P BATTERY PACK (NMC811 + Aerogel Blanket + PCM Matrix)
```

---

## 5. Application Feature Modules

- **Overview Dashboard:** Situational awareness indicators, health metrics, battery CAD twin, and quick scenario selectors.
- **Tactical Mission Simulator:** Time-series forward simulation across UAV mission profiles (High-Altitude Surveillance, Sub-Zero Recon, Border Patrol, Emergency Cold Start). Features interactive scrubbing and CSV export.
- **Battery Digital Twin:** High-precision CAD cross-section showing 24 cells in 6S4P topology, thin-film heater traces, aerogel insulation, and individual cell telemetry.
- **PIDNN Engine Inspector:** Live mathematical loss breakdown with adjustable $\lambda$ regularization sliders and transparent feature attribution.
- **What-If Laboratory:** Three-way synchronized comparison benchmarking Scenario A (-15°C), Scenario B (-35°C Baseline), and Scenario C (-35°C + LAERS).
- **Data & Model Workspace:** Telemetry CSV ingestion, schema validation, statistical profiling, and prototype training convergence.
- **Avionics Telemetry Console:** Real-time sensor stream simulation with CAN 2.0B hex payloads and severity filters.
- **System Architecture:** Interactive defense engineering subsystem block diagram with MIL-STD-810H specifications.
- **Settings & Hardware Calibration:** Customization of chemistry, heater wattage, aerogel thermal resistance, and defense locations.
- **SIH Demo Mode:** Automated 8-stage presentation walkthrough designed for engineering juries and defense reviewers.

---

## 6. Scientific Honesty & Technical Integrity

The user interface and codebase strictly maintain scientific transparency:
- All values produced in this prototype are based on physical numerical models and synthetic datasets.
- Predictions are clearly tagged with: `[Prototype Estimate]`, `[Simulated]`, `[Model Output]`, and `[Awaiting Environmental Chamber HIL Validation]`.
- No claim is made that this software has undergone physical battery qualification testing.

---

## 7. Connecting Real Hardware & Trained Models (Future Integration)

The software architecture is decoupled into distinct layers:
1. **Telemetry Stream Interface:** Can be replaced with a WebSocket or serial stream reading real CAN bus messages from an STM32 / TI TMS570 automotive safety microcontroller.
2. **Inference Engine (`pidnnEngine.ts`):** Exposes clean input/output interfaces ready to connect via REST or gRPC to an edge-deployed Python/PyTorch ONNX runtime or TorchScript model running on an NVIDIA Jetson Orin / Raspberry Pi CM4.
3. **Thermal Actuation Driver:** Can issue real PWM commands to solid-state SiC MOSFET switches driving physical heating membranes.

---

*Developed for the Smart India Hackathon (SIH) & Defense Electronics Research.*
