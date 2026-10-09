import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole
from app.models.organization import Organization, ServiceLocation
from app.models.service import Service, Counter
from app.core.security import hash_password, create_access_token

TEST_DATABASE_URL = "sqlite:///./test_geotoken.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_seed(db):
    """Provides standard organization, location, service, counter and users for test cases."""
    admin = User(
        email="test_admin@example.com",
        hashed_password=hash_password("Admin@123"),
        full_name="Test Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    staff = User(
        email="test_staff@example.com",
        hashed_password=hash_password("Staff@123"),
        full_name="Test Staff Member",
        role=UserRole.STAFF,
        is_active=True
    )
    customer = User(
        email="test_customer@example.com",
        hashed_password=hash_password("Customer@123"),
        full_name="Test Customer",
        phone="+15551234567",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add_all([admin, staff, customer])
    db.flush()

    org = Organization(
        name="Test Public Center",
        slug="test-public",
        sector="government",
        description="Test Organization"
    )
    db.add(org)
    db.flush()

    loc = ServiceLocation(
        organization_id=org.id,
        name="Main Civic Branch",
        code="MCB-01",
        address="100 Main St, City",
        latitude=40.7500,
        longitude=-73.9800,
        geofence_radius_meters=500.0,
        token_validity_minutes=45
    )
    db.add(loc)
    db.flush()

    srv = Service(
        location_id=loc.id,
        name="Permit Issuance",
        prefix_code="P",
        avg_duration_minutes=10,
        required_documents="Govt ID"
    )
    db.add(srv)
    db.flush()

    counter = Counter(
        location_id=loc.id,
        name="Desk 1",
        counter_number=1,
        staff_user_id=staff.id,
        is_active=True
    )
    db.add(counter)
    db.commit()

    return {
        "admin": admin,
        "staff": staff,
        "customer": customer,
        "organization": org,
        "location": loc,
        "service": srv,
        "counter": counter
    }


def auth_header_for_user(user: User) -> dict:
    token = create_access_token(subject=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}
