# GeoToken™ - Universal Geofencing Smart Token & Queue Management System

**GeoToken** is an intelligent, location-verified queue and token dispatch frontend application engineered for **any general service industry where physical or digital queue management is required**.

Instead of being confined to a single sector, GeoToken natively accommodates:
- 🏛️ **Government & Municipal Services** (DMV Driver Licenses, Passports, Vital Records, Notary Attestations, Property Tax)
- 🏥 **Healthcare & Outpatient Clinics** (General Triage, Pathology / Specimen Labs, Imaging & X-Ray, Pharmacy Dispensary)
- 📱 **Telecom & Electronics Service Centers** (Device Diagnostics & Hardware Repair, 5G eSIM / SIM Activation, Warranty Claims)
- 🎓 **Education & University Campuses** (Admissions & Enrollment, Financial Aid & Scholarships, Degree & Transcript Attestation)
- 🛒 **Retail & Logistics Hubs** (Click & Collect Online Order Pickup, Returns & Refunds, Tech Support & Assembly)
- 🏢 **Multi-Service Public Pavilions & Custom Facilities** (Create any custom facility or service on the fly!)

---

## 🌟 Universal Capabilities

### 1. 📡 Precision Geofencing Engine
- **Physical Presence Verification**: Uses the Haversine formula to compute exact distance in meters between user GPS coordinates and the facility center.
- **Three-Tier Perimeter States**:
  - `INSIDE_GEOFENCE` (Green): Full clearance granted; token generation unlocked.
  - `GRACE_ZONE` (Amber): Boundary warning; prompts the user to step into the facility grounds.
  - `OUTSIDE_GEOFENCE` (Red): Geofence lock active; prevents remote ticket hoarding and phantom queues.
- **Proximity Guard Alert**: If a customer with an active token drifts outside the branch radius while waiting, the system triggers audio buzzers and visual warning banners advising them to return.
- **Anti-Spoofing Cryptographic Hash**: Every issued token is digitally stamped with timestamp, latitude, longitude, and physical distance at issuance.

### 2. 🗺️ Interactive Live Map & GPS Simulator
- **Interactive Leaflet & CartoDB Maps**: Visualizes the facility marker, geofence radius circle, customer pin with animated radar pulse, and connecting distance line.
- **Interactive Drag & Click**: Drag the customer pin anywhere on the map or click to simulate real-time movement across boundaries.
- **Quick GPS Testing Presets**:
  - 🎯 **Inside Facility** (~75 m)
  - 🚗 **Grace Perimeter / Parking Lot** (~550 m)
  - 🏙️ **Outside Area** (~1.8 km)
  - 📡 **Real Device GPS** (`navigator.geolocation` API with high-accuracy mode)

### 3. 🏢 Multi-Industry Facility & Service Customizer
- **Industry Sector Filters**: Filter facilities by Government, Healthcare, Telecom, Education, Retail, or General Public Pavilions.
- **➕ Add Custom Facility**: Define any custom location with custom coordinates, sector, name, and geofence perimeter radius.
- **➕ Add Custom Service Department**: Supervisors and operators can create custom service desks on the fly (specifying prefix code, average service minutes, desk names, and required checklist items).

### 4. 🎫 Universal 4-Step Token Generation Wizard
- **Step 1: Geofence Verification**: Automated GPS check against the facility perimeter.
- **Step 2: Service Selection**: Interactive cards with service prefixes, live waiting count, estimated wait duration, document checklists, and assigned desks.
- **Step 3: Customer Details & Priority Tiers**:
  - Full Name, Mobile Phone (for SMS notifications), Email, and Case / Reference #.
  - Priority Tiers: **Standard Walk-In**, **Senior / Differently-Abled** (accessible desk), **Confirmed Appointment**, or **Express / Member Pass**.
- **Step 4: Review & Issuance**: Instant generation with confetti burst and sound chimes.

### 5. 📱 Active Digital Token Pass
- Boarding-pass style layout with bold token code (e.g., `D-102`, `C-104`, `R-201`).
- Live position ahead in line ("2 ahead of you", countdown timer to estimated service time).
- Dynamic, scannable **QR Code** for physical kiosk or desk scanner check-in.
- Turn-call alerts ("📢 PLEASE PROCEED TO WINDOW 2").
- Actions: **Snooze / Delay 5 Mins**, **Print Ticket**, **Cancel Ticket**, or **Issue Another**.

### 6. 🛡️ Staff Desk Dispatcher Console
- Select desk / window (dynamically derived from the selected facility's departments).
- **"Call Next Customer"** button that automatically respects priority tiers.
- Native Web Audio API chime synthesizer + Web Speech API vocal announcer (*"Token D-102, please proceed to Window 2"*).
- Desk operator workflow: Mark in-service, Complete, Recall buzzer, Mark No-Show.
- Dynamic **Geofence Radius Slider** (adjust the facility perimeter from 100m to 2,500m on the fly).

### 7. 📺 Public Waiting Lounge Display Board (TV Screen Mode)
- Fullscreen TV layout for waiting halls.
- "NOW SERVING" tiles with flashing animations on newly called tickets.
- "NEXT IN LINE" list with live wait estimates.
- On-screen QR code allowing walk-in customers to scan the TV and generate a pass on their smartphones.

---

## 🛠️ Tech Stack

- **Framework**: Vite 6 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Mapping**: Leaflet + OpenStreetMap CartoDB Tiles
- **Audio & Speech**: Native Web Audio API Synthesizer (harmonic chimes) + Web Speech API (`SpeechSynthesis`)
- **QR Codes**: Canvas `qrcode` generator
- **State & Storage**: React Context with automatic `localStorage` persistence and cross-session reactivity

---

## 🚀 Running the Project

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
