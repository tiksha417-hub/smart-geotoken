"""
Database Seeding Script for Geo-Intelligent Smart Token System.
Populates sample organizations, locations, services, counters, demo users, and an ESP32 device.
ALL PASSWORDS AND CREDENTIALS BELOW ARE STRICTLY DEVELOPMENT-ONLY.
"""
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User, UserRole
from app.models.organization import Organization, ServiceLocation, OperatingHours
from app.models.service import Service, Counter
from app.models.token import Token, TokenStatus, PriorityTier, TokenEvent
from app.models.device import Device
from app.core.security import hash_password, generate_secure_qr_code_secret


def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@geotoken.com").first():
            print("Database already contains seed users. Skipping.")
            return

        print("Seeding demo users...")
        # 1. Users
        admin_user = User(
            email="admin@geotoken.com",
            hashed_password=hash_password("Admin@123"),
            full_name="System Administrator",
            phone="+1 (800) 555-0001",
            role=UserRole.ADMIN,
            is_active=True
        )
        staff1 = User(
            email="staff1@geotoken.com",
            hashed_password=hash_password("Staff@123"),
            full_name="Officer Eleanor Vance",
            phone="+1 (800) 555-0002",
            role=UserRole.STAFF,
            is_active=True
        )
        staff2 = User(
            email="staff2@geotoken.com",
            hashed_password=hash_password("Staff@123"),
            full_name="Officer Marcus Brody",
            phone="+1 (800) 555-0003",
            role=UserRole.STAFF,
            is_active=True
        )
        customer1 = User(
            email="customer@example.com",
            hashed_password=hash_password("Customer@123"),
            full_name="Alex Mercer",
            phone="+1 (555) 234-5678",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        customer2 = User(
            email="maria@example.com",
            hashed_password=hash_password("Customer@123"),
            full_name="Maria Santos",
            phone="+1 (555) 876-5432",
            role=UserRole.CUSTOMER,
            is_active=True
        )

        db.add_all([admin_user, staff1, staff2, customer1, customer2])
        db.flush()

        print("Seeding organizations & facilities...")
        # 2. Organizations & Locations
        # Civic Bureau (Government)
        org_civic = Organization(
            name="Metropolitan Civic & Public Services Bureau",
            slug="metro-civic",
            sector="government",
            description="Driver licensing, passport processing, identity credentials, and notary attestations."
        )
        db.add(org_civic)
        db.flush()

        loc_civic = ServiceLocation(
            organization_id=org_civic.id,
            name="Westside Civic & Public Records Center",
            code="CVC-01",
            address="125 W 55th St, New York, NY 10019",
            latitude=40.7638,
            longitude=-73.9814,
            geofence_radius_meters=500.0,
            token_validity_minutes=45,
            operating_hours="Mon - Fri: 08:30 AM - 05:00 PM",
            contact_phone="+1 (800) 555-0142"
        )
        db.add(loc_civic)
        db.flush()

        # Healthcare Pavilion
        org_health = Organization(
            name="CarePoint Health & Diagnostic Pavilion",
            slug="carepoint-health",
            sector="healthcare",
            description="Outpatient physician consultations, diagnostics lab, imaging, and prescription dispensary."
        )
        db.add(org_health)
        db.flush()

        loc_health = ServiceLocation(
            organization_id=org_health.id,
            name="Downtown Diagnostic & Medical Center",
            code="MED-01",
            address="345 Hudson St, New York, NY 10014",
            latitude=40.7289,
            longitude=-74.0076,
            geofence_radius_meters=450.0,
            token_validity_minutes=60,
            operating_hours="Daily: 08:00 AM - 08:00 PM",
            contact_phone="+1 (800) 555-0188"
        )
        db.add(loc_health)
        db.flush()

        # Telecom Hub
        org_telecom = Organization(
            name="Apex Telecom & Smart Devices Hub",
            slug="apex-telecom",
            sector="telecom",
            description="Mobile service activation, warranty claims, 5G eSIM support, and device repairs."
        )
        db.add(org_telecom)
        db.flush()

        loc_telecom = ServiceLocation(
            organization_id=org_telecom.id,
            name="Broadway Tech Service Pavilion",
            code="TEL-01",
            address="560 Broadway, New York, NY 10012",
            latitude=40.7242,
            longitude=-73.9973,
            geofence_radius_meters=400.0,
            token_validity_minutes=45,
            operating_hours="Mon - Sat: 09:30 AM - 07:30 PM",
            contact_phone="+1 (800) 555-0164"
        )
        db.add(loc_telecom)
        db.flush()

        print("Seeding services & counters...")
        # 3. Services for Civic Location
        srv_license = Service(
            location_id=loc_civic.id,
            name="Driver License & Real ID Renewal",
            prefix_code="D",
            description="License renewal, address change, photo endorsement, and duplicate badge dispatch.",
            avg_duration_minutes=8,
            required_documents="Current License or Passport, Two Proofs of State Residency, Social Security Card"
        )
        srv_passport = Service(
            location_id=loc_civic.id,
            name="Passport & Travel Endorsements",
            prefix_code="P",
            description="Passport book applications, renewals, travel permits, and emergency expedites.",
            avg_duration_minutes=12,
            required_documents="Original Birth Certificate / Old Passport, DS-11/DS-82 Form, 2x2 Passport Photo"
        )
        srv_notary = Service(
            location_id=loc_civic.id,
            name="Notary & Statutory Attestation",
            prefix_code="N",
            description="Legal document attestation, statutory declarations, apostille seals, and affidavits.",
            avg_duration_minutes=6,
            required_documents="Original Unsigned Document, Government Photo ID"
        )
        srv_express = Service(
            location_id=loc_civic.id,
            name="Express Document Drop-off & Pickup",
            prefix_code="E",
            description="Quick collection of prepared certificates, verified vehicle tags, and application drop-offs.",
            avg_duration_minutes=3,
            required_documents="Application Acknowledgment Slip, Government Photo ID"
        )
        db.add_all([srv_license, srv_passport, srv_notary, srv_express])
        db.flush()

        # Services for Health Location
        srv_triage = Service(
            location_id=loc_health.id,
            name="General Physician & Triage",
            prefix_code="C",
            description="Doctor consultations, vitals assessment, physical checkups, and triage.",
            avg_duration_minutes=12,
            required_documents="Health Insurance Card, Government Photo ID"
        )
        srv_lab = Service(
            location_id=loc_health.id,
            name="Pathology & Diagnostic Specimen Lab",
            prefix_code="L",
            description="Fasting blood draws, antibody screens, PCR tests, and specimen intake.",
            avg_duration_minutes=6,
            required_documents="Doctor Requisition Slip, Patient ID Card"
        )
        db.add_all([srv_triage, srv_lab])
        db.flush()

        # 4. Counters
        ctr1 = Counter(
            location_id=loc_civic.id,
            name="Window 1",
            counter_number=1,
            staff_user_id=staff1.id,
            is_active=True
        )
        ctr2 = Counter(
            location_id=loc_civic.id,
            name="Window 2",
            counter_number=2,
            staff_user_id=staff2.id,
            is_active=True
        )
        ctr3 = Counter(
            location_id=loc_civic.id,
            name="Window 3",
            counter_number=3,
            is_active=True
        )
        ctr4 = Counter(
            location_id=loc_civic.id,
            name="Desk A (Notary)",
            counter_number=4,
            is_active=True
        )
        db.add_all([ctr1, ctr2, ctr3, ctr4])
        db.flush()

        # 5. Hardware Device (ESP32)
        esp32_device = Device(
            device_id="ESP32-CTR-01",
            api_key="esp32_demo_secret_key_8899",
            name="Window 1 Physical Counter Unit",
            location_id=loc_civic.id,
            counter_id=ctr1.id,
            firmware_version="1.0.0",
            is_active=True,
            is_online=True,
            last_heartbeat_at=datetime.now(timezone.utc),
            ip_address="192.168.1.150"
        )
        db.add(esp32_device)

        # 6. Sample Initial Tokens
        now = datetime.now(timezone.utc)
        token_active = Token(
            token_number="D-101",
            token_uuid="seed-uuid-active-101",
            secure_qr_secret="GEO-QR-DEMO-D101-SECRET",
            organization_id=org_civic.id,
            location_id=loc_civic.id,
            service_id=srv_license.id,
            customer_user_id=customer1.id,
            customer_name="Alex Mercer",
            customer_phone="+1 (555) 234-5678",
            customer_email="customer@example.com",
            purpose_notes="Driver license renewal with updated residential address.",
            priority=PriorityTier.STANDARD,
            status=TokenStatus.ACTIVE,
            queue_position=1,
            estimated_wait_minutes=8,
            created_at=now - timedelta(minutes=15),
            activated_at=now - timedelta(minutes=10),
            expires_at_deadline=now + timedelta(minutes=30),
            activation_distance_meters=42.5,
            activation_lat=40.7639,
            activation_lng=-73.9815,
            verification_hash="GEO-STAMP-D101"
        )

        token_called = Token(
            token_number="D-100",
            token_uuid="seed-uuid-called-100",
            secure_qr_secret="GEO-QR-DEMO-D100-SECRET",
            organization_id=org_civic.id,
            location_id=loc_civic.id,
            service_id=srv_license.id,
            counter_id=ctr1.id,
            customer_user_id=customer2.id,
            customer_name="Maria Santos",
            customer_phone="+1 (555) 876-5432",
            customer_email="maria@example.com",
            purpose_notes="Real ID endorsement application.",
            priority=PriorityTier.SENIOR_DISABLED,
            status=TokenStatus.CALLED,
            queue_position=0,
            estimated_wait_minutes=0,
            created_at=now - timedelta(minutes=25),
            activated_at=now - timedelta(minutes=20),
            called_at=now - timedelta(minutes=2),
            expires_at_deadline=now + timedelta(minutes=20),
            activation_distance_meters=18.0,
            activation_lat=40.7638,
            activation_lng=-73.9814,
            verification_hash="GEO-STAMP-D100"
        )
        ctr1.current_token_id = None # will update after flush

        db.add_all([token_active, token_called])
        db.flush()

        ctr1.current_token_id = token_called.id

        db.commit()
        print("Database successfully seeded with realistic multi-industry test data!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
