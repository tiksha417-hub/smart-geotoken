from tests.conftest import auth_header_for_user


def test_esp32_device_integration(client, test_seed):
    admin = test_seed["admin"]
    customer = test_seed["customer"]
    loc = test_seed["location"]
    srv = test_seed["service"]
    ctr = test_seed["counter"]

    admin_headers = auth_header_for_user(admin)

    # 1. Admin registers a new ESP32 device
    reg_payload = {
        "device_id": "ESP32-TEST-UNIT",
        "name": "Desk 1 Physical Unit",
        "location_id": loc.id,
        "counter_id": ctr.id,
        "firmware_version": "1.0.0"
    }
    reg_res = client.post("/api/v1/devices/register", json=reg_payload, headers=admin_headers)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "api_key" in reg_data
    api_key = reg_data["api_key"]
    device_id = reg_data["device_id"]

    device_headers = {
        "X-Device-Id": device_id,
        "X-Device-Key": api_key
    }

    # 2. Test Device Heartbeat
    hb_res = client.post(
        "/api/v1/devices/heartbeat",
        json={"device_id": device_id, "ip_address": "192.168.1.188"},
        headers=device_headers
    )
    assert hb_res.status_code == 200
    assert hb_res.json()["status"] == "OK"

    # 3. Unauthorized Device Request check
    bad_headers = {
        "X-Device-Id": device_id,
        "X-Device-Key": "wrong-key"
    }
    bad_res = client.post("/api/v1/devices/next-token", headers=bad_headers)
    assert bad_res.status_code == 401

    # 4. Generate an active token to be called by the ESP32
    cust_res = client.post(
        "/api/v1/tokens",
        json={
            "location_id": loc.id,
            "service_id": srv.id,
            "customer_name": "Hardware Test Customer",
            "customer_phone": "+15554443322",
            "priority": "standard"
        }
    )
    tkn_uuid = cust_res.json()["token_uuid"]
    # Activate inside geofence
    client.post(
        f"/api/v1/tokens/{tkn_uuid}/activate",
        json={"latitude": 40.7501, "longitude": -73.9801}
    )

    # 5. Physical NEXT Button pressed on ESP32
    next_btn_res = client.post("/api/v1/devices/next-token", headers=device_headers)
    assert next_btn_res.status_code == 200
    btn_data = next_btn_res.json()
    assert btn_data["success"] is True
    assert "lcd_line1" in btn_data
    assert len(btn_data["lcd_line1"]) == 16
    assert "lcd_line2" in btn_data
    assert len(btn_data["lcd_line2"]) == 16
    assert btn_data["beep_count"] == 2
