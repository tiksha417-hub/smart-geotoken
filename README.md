# GeoToken™: Geofencing Token Generation & Queue Management System

A full-stack, enterprise-grade **Geo-Intelligent Token Generation and Queue Management System** designed for high-throughput public and private facilities (Hospitals & Clinics, Government Bureaus & DMVs, Banks, Telecom Hubs, Retail Stores, and Consulates).

GeoToken eliminates physical crowds, lobby congestion, and phantom reservations by tying virtual token activation and queue dispatching to physical GPS geofence perimeters.

---

## 🌟 Key Architecture Highlights

1. **Remote Token Booking**:
   - Customers can generate an instant queue token from anywhere via their mobile browser or app.
   - Initial state is stamped as `PENDING`.
2. **GPS Geofence Presence Activation**:
   - The system tracks customer proximity using real-time GPS coordinates and the Haversine spherical distance formula.
   - When the customer arrives within the facility's geofenced perimeter (e.g. 500m radius), the token **automatically activates** into `ACTIVE` status in the live waiting queue.
3. **No-Show Cancellation & Immediate Re-Allotment**:
   - When a desk operator summons a token (`CALLED`), a grace arrival countdown is initiated.
   - If the customer is not present or fails to arrive at the counter, the system **automatically cancels** the token with reason `NO_SHOW_ABSENT` and **immediately re-allots the turn to the next person physically present** inside the geofence.
4. **Secure Admin Portal**:
   - Protected by administrative authentication.
   - Configure facilities, adjust geofence radius on the fly (50m to 1500m), set GPS center coordinates, manage services, assign counters, and monitor real-time queue telemetry.
5. **Customer Self-Service Portal**:
   - Interactive live GPS radar & perimeter circle visualization.
   - Active Digital Token Pass with dynamic cryptographic QR code, live ahead-in-line count, estimated call time, and synthesized voice chimes.
6. **Physical IoT Desk Terminal Support**:
   - Built-in REST and WebSocket API support for physical ESP32 hardware buttons, 16x2 LCD screens, and buzzer chimes at counter desks.

---

## 📐 Mathematical Geofencing Engine

Distance between the user's mobile device GPS \((lat_1, lon_1)\) and the facility center \((lat_2, lon_2)\) is evaluated on both frontend and backend using the **Haversine formula**:

$$\Delta lat = lat_2 - lat_1$$
$$\Delta lon = lon_2 - lon_1$$
$$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1) \cdot \cos(lat_2) \cdot \sin^2\left(\frac{\Delta lon}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

*(where \(R = 6,371,000 \text{ meters}\))*

A token transition from `PENDING` $\to$ `ACTIVE` requires:
$$d \le \text{Geofence Radius (meters)}$$

Upon activation, the backend records:
- `activation_distance_meters`
- `activation_lat` & `activation_lng`
- `verification_hash`: Cryptographic proof preventing GPS spoofing.

---

## 🔄 Token Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: User Generates Token (Remote or En Route)
    PENDING --> ACTIVE: User enters GPS Geofence Perimeter
    PENDING --> EXPIRED: Validity Deadline Exceeded
    ACTIVE --> CALLED: Staff / ESP32 Calls Next Present Person
    CALLED --> VERIFIED: Counter Scans Cryptographic QR
    VERIFIED --> COMPLETED: Service Finished
    CALLED --> CANCELLED: Customer Absent / No-Show Timeout
    note right of CANCELLED
      Turn is immediately and automatically
      allotted to the next customer present!
    end note
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+ (Python 3.12/3.13 supported)
- Node.js 18+ & npm
- Docker & Docker Compose (Optional for containerized run)

---

### Running Backend (FastAPI + SQLite / PostgreSQL)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # On Windows
# source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt
pip install email-validator

# Run Seed Data (Creates sample facilities, services, counters & admin user)
python seed.py

# Run Test Suite (All 6 automated tests)
pytest tests -v

# Start FastAPI Uvicorn Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`

---

### Running Frontend (React + Vite + Tailwind CSS)

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start development server
npm run dev
```
- Frontend application URL: `http://localhost:5173`

---

## 🔐 Credentials for Demo & Testing

| Role | Username / Identifier | Password / PIN | Description |
|---|---|---|---|
| **Admin Portal** | `admin@geotoken.com` or Console Gate | `admin123` / `geotoken2026` | Full facility, geofence, and queue override access |
| **Staff Operator** | `staff1@geotoken.com` | `Staff@123` | Counter desk dispatcher terminal |
| **Customer** | `customer@example.com` | `Customer@123` | Registered customer account |
| **Walk-in Guest** | Any Name + Mobile Phone | *No password required* | Instant remote or on-site token issuance |

---

## ☁️ Cloud Architecture & Deployment

The system is container-native and ready for zero-downtime deployment to major cloud providers.

### Option 1: Docker Compose (Local or Virtual Machine)

```bash
# In the project root directory:
docker-compose up --build -d
```
- **Frontend & Nginx Reverse Proxy**: `http://localhost` or `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:8000`

---

### Option 2: Google Cloud Platform (GCP)
1. **Container Registry**: Build and push Docker images to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/geotoken-backend ./backend
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/geotoken-frontend ./frontend
   ```
2. **Compute**: Deploy backend to **Cloud Run**:
   ```bash
   gcloud run deploy geotoken-backend \
     --image gcr.io/[PROJECT_ID]/geotoken-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars ENVIRONMENT=production,SECRET_KEY=[PROD_KEY]
   ```
3. **Database**: Use **Cloud SQL for PostgreSQL** (or Cloud Spanner). Set `DATABASE_URL=postgresql://user:pass@host/geotoken`.
4. **Frontend CDN**: Deploy frontend to **Firebase Hosting** or **Cloud Storage + Cloud CDN**.

---

### Option 3: Amazon Web Services (AWS)
1. **ECS Fargate / App Runner**: Deploy `backend/Dockerfile` to AWS App Runner or Amazon ECS.
2. **Database**: Amazon RDS PostgreSQL for high-availability multi-AZ transactions.
3. **Frontend**: S3 static website bucket fronted by Amazon CloudFront with SSL/TLS termination.

---

### Option 4: Microsoft Azure
1. Deploy containers using **Azure Container Apps** or **Azure App Service (Linux Web App)**.
2. Configure **Azure Database for PostgreSQL Flexible Server**.
3. Point custom domain with automated Let's Encrypt / Azure-managed TLS certificate.

---

## 🛠️ REST API Specification Summary

### Tokens (`/api/v1/tokens`)
- `POST /api/v1/tokens`: Remotely book queue token (stamped as `PENDING` if outside geofence).
- `POST /api/v1/tokens/{uuid}/activate`: Verify user coordinates against facility geofence perimeter and transition token to `ACTIVE`.
- `POST /api/v1/tokens/call-next`: Counter operator summons next priority active token.
- `POST /api/v1/tokens/{id}/no-show-reallot`: Cancel absent customer's token and immediately allot the turn to the next customer physically present.
- `POST /api/v1/tokens/{id}/verify-qr`: Authenticate cryptographic token secret at counter.
- `POST /api/v1/tokens/{id}/complete`: Complete service transaction.
- `POST /api/v1/tokens/{id}/cancel`: Customer or staff voluntary cancellation.

### IoT Hardware (`/api/v1/devices`)
- `POST /api/v1/devices/heartbeat`: ESP32 physical desk unit telemetry check.
- `POST /api/v1/devices/next-token`: Physical desk button push triggering counter call and formatted 16x2 LCD display lines.

### WebSockets (`/ws/location/{id}`)
- Real-time two-way broadcast channel for lounge TV display boards, audio chime triggers, and customer boarding pass sync.
