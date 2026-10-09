from app.models.user import UserRole
from tests.conftest import auth_header_for_user


def test_register_and_login(client):
    # 1. Register new customer
    payload = {
        "email": "newuser@example.com",
        "password": "Password@123",
        "full_name": "New User",
        "phone": "+15559998877"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["role"] == UserRole.CUSTOMER.value

    # 2. Login with credentials
    login_payload = {
        "email": "newuser@example.com",
        "password": "Password@123"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 3. Test /me profile endpoint
    headers = {"Authorization": f"Bearer {login_data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "newuser@example.com"


def test_invalid_login(client):
    res = client.post("/api/v1/auth/login", json={"email": "nonexistent@example.com", "password": "wrong"})
    assert res.status_code == 401
