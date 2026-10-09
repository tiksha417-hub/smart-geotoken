from tests.conftest import auth_header_for_user


def test_token_lifecycle_geofence_activation(client, test_seed):
    customer = test_seed["customer"]
    loc = test_seed["location"]
    srv = test_seed["service"]
    headers = auth_header_for_user(customer)

    # 1. Book Token Remotely
    book_payload = {
        "location_id": loc.id,
        "service_id": srv.id,
        "customer_name": customer.full_name,
        "customer_phone": customer.phone,
        "customer_email": customer.email,
        "purpose_notes": "First time permit application",
        "priority": "standard"
    }
    create_res = client.post("/api/v1/tokens", json=book_payload, headers=headers)
    assert create_res.status_code == 201
    token_data = create_res.json()

    assert token_data["status"] == "PENDING"
    assert token_data["token_number"].startswith("P-")
    assert "token_uuid" in token_data
    token_uuid = token_data["token_uuid"]

    # 2. Duplicate Booking Check: Booking again with the same phone in the same service is blocked
    dup_res = client.post("/api/v1/tokens", json=book_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "already hold an active/pending token" in dup_res.json()["detail"]

    # 3. Test Geofence Rejection: User is outside perimeter (~2.5km away)
    # Facility is at (40.7500, -73.9800) with 500m radius
    outside_lat = 40.7725
    outside_lng = -73.9800
    outside_res = client.post(
        f"/api/v1/tokens/{token_uuid}/activate",
        json={"latitude": outside_lat, "longitude": outside_lng}
    )
    assert outside_res.status_code == 403
    detail = outside_res.json()["detail"]
    assert detail["status"] == "OUTSIDE"
    assert detail["distance_meters"] > loc.geofence_radius_meters

    # Token must STILL be PENDING
    check_res = client.get(f"/api/v1/tokens/{token_uuid}")
    assert check_res.json()["status"] == "PENDING"

    # 4. Test Geofence Success: User enters perimeter (approx 45m away)
    inside_lat = 40.7503
    inside_lng = -73.9802
    activate_res = client.post(
        f"/api/v1/tokens/{token_uuid}/activate",
        json={"latitude": inside_lat, "longitude": inside_lng}
    )
    assert activate_res.status_code == 200
    active_data = activate_res.json()
    assert active_data["status"] == "ACTIVE"
    assert active_data["activated_at"] is not None
    assert active_data["activation_distance_meters"] < loc.geofence_radius_meters
    assert active_data["verification_hash"] is not None
