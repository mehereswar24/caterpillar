# CAT SmartOperator — Driver-Side Cockpit

A dedicated, standalone driver application designed for CAT 320 excavators. This application isolates the operator/driver experience from the central fleet supervisor console.

## Architecture & Features

1. **Operator Assignment Intake & Face Authentication**:
   - The driver is assigned by the fleet operator.
   - The driver authenticates with a biometric face scan (live webcam feed with HUD or instant demo simulation).
   - Machine hydraulics & ignition unlock upon verification.

2. **Top of Screen: Task & Expected Time**:
   - Live banner showing assigned task (`Trenching Pipeline B`).
   - Expected completion time (minutes) and real-time elapsed/remaining countdown with progress indicator.
   - Driver badge and machine telemetry identifier.

3. **Center Hero: Excavator Animation**:
   - High-fidelity vector animated CAT 320 Excavator (JCB).
   - Articulated hydraulic boom arm and digging bucket driven by smooth physics oscillations.
   - Dynamic track pads translation and spinning guide wheels.
   - Slope pitch tilt and ground dust particle clouds.
   - Real-time RPM, hydraulic pressure, and seatbelt indicators.

4. **Directly Below Animation: Environmental Telemetry**:
   - **Atmospheric Weather**: Temperature (°C), weather conditions (Sunny, Dust storm, Monsoonal rain), humidity, visibility, and wind.
   - **Ground Soil Profile**: Soil type (Rocky Basalt & Heavy Clay, Loose Sandy Loam, Wet Mud), hardness index, traction grip %, and digging resistance load factor.

5. **360-Degree Spatial Proximity Radar**:
   - Live spatial tracking from central machine hub.
   - **Warehouse / Designated Parking Bay**: Real-time distance in meters and travel ETA.
   - **Nearest Fuel Refill Bunk**: Distance in km and travel ETA.
   - **Nearest Objects**: Ground workers (👷) and heavy equipment (🚚) with proximity limits.
   - **Dual Critical Alerts**:
     - 🚨 **Proximity Breach Alert**: Triggers when any human or vehicle is too close (< 3.0m). Includes visual strobe and audible buzzer alarm.
     - 🚨 **Fuel Reachability Deficit Alert**: Evaluates:
       $$\text{Fuel Run-out Time (mins)} < \text{Travel Time to Fuel Station (mins)}$$
       Warns the driver if current fuel consumption will exhaust the tank before reaching the nearest refill bunk!
   - Built-in simulation sliders to dynamically test both alerts on the fly.

6. **Bottom of Screen: Voice Command System**:
   - Large tactile Push-to-Talk microphone button.
   - Web Speech API integration with voice transcription and audio speech synthesis response (cab speaker output).
   - Quick questions for machine tilt limits, fuel capacity, safety exclusion zones, and task status.

## Getting Started

To launch the Driver-Side Cockpit independently:

```bash
cd driver-side
npm install
npm run dev
```

The application will launch at **`http://localhost:5174`**.
