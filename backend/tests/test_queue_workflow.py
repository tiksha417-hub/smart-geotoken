from tests.conftest import auth_header_for_user


def test_full_queue_workflow_call_verify_complete(client, test_seed):
    customer = test_seed["customer"]
    staff = test_seed["staff"]
    admin = test_seed["admin"]
    loc = test_seed["location"]
    srv = test_seed["service"]
    ctr = test_seed["counter"]

    cust_headers = auth_header_for_user(customer)
    staff_headers = auth_header_for_user(staff)

    # 1. Customer creates token
    book_payload = {
        "location_id": loc.id,
        "service_id": srv.id,
        "customer_name": "Sarah Connor",
        "customer_phone": "+15557778899",
        "priority": "appointment"
    }
    tkn_res = client.post("/api/v1/tokens", json=book_payload, headers=cust_headers)
    assert tkn_res.status_code == 201
    tkn = tkn_res.json()
    token_id = tkn["id"]
    token_uuid = tkn["token_uuid"]
    qr_secret = tkn["secure_qr_secret"]

    # 2. Customer activates token inside geofence (50m)
    act_res = client.post(
        f"/api/v1/tokens/{token_uuid}/activate",
        json={"latitude": 40.7502, "longitude": -73.9801}
    )
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "ACTIVE"

    # 3. Staff calls next token
    call_payload = {
        "counter_id": ctr.id,
        "service_id": srv.id
    }
    call_res = client.post("/api/v1/tokens/call-next", json=call_payload, headers=staff_headers)
    assert call_res.status_code == 200
    called_tkn = call_res.json()
    assert called_tkn["id"] == token_id
    assert called_tkn["status"] == "CALLED"
    assert called_tkn["counter_name"] == ctr.name

    # 4. QR verification failure with wrong secret
    bad_verify_res = client.post(
        f"/api/v1/tokens/{token_id}/verify-qr",
        json={"qr_code_secret": "INVALID-SECRET-1234"},
        headers=staff_headers
    )
    assert bad_verify_res.status_code == 400

    # 5. QR verification success with correct opaque secret
    good_verify_res = client.post(
        f"/api/v1/tokens/{token_id}/verify-qr",
        json={"qr_code_secret": qr_secret},
        headers=staff_headers
    )
    assert good_verify_res.status_code == 200
    assert good_verify_res.json()["status"] == "VERIFIED"

    # 6. Staff marks token completed
    comp_res = client.post(
        f"/api/v1/tokens/{token_id}/complete",
        json={"notes": "Permit issued and stamped."},
        headers=staff_headers
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # 7. Completed token cannot be completed again
    re_comp_res = client.post(
        f"/api/v1/tokens/{token_id}/complete",
        json={"notes": "Duplicate completion"},
        headers=staff_headers
    )
    assert re_comp_res.status_code == 400

    # 8. Check Public Display Endpoint (Verify NO PII leaked)
    display_res = client.get(f"/api/v1/analytics/location/{loc.id}/public-display")
    assert display_res.status_code == 200
    display_data = display_res.json()
    assert "location_name" in display_data
    # Ensure customer names and phone numbers are not in the public display payload
    raw_text = str(display_data)
    assert "Sarah Connor" not in raw_text
    assert "+15557778899" not in raw_text


def test_no_show_cancel_and_auto_reallot_workflow(client, test_seed):
    staff = test_seed["staff"]
    loc = test_seed["location"]
    srv = test_seed["service"]
    ctr = test_seed["counter"]
    staff_headers = auth_header_for_user(staff)

    # 1. Person A books token and enters geofence -> ACTIVE
    res_a = client.post("/api/v1/tokens", json={
        "location_id": loc.id,
        "service_id": srv.id,
        "customer_name": "Person A (Absent)",
        "customer_phone": "+19991110001",
        "priority": "standard"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()
    client.post(f"/api/v1/tokens/{token_a['token_uuid']}/activate", json={"latitude": 40.7501, "longitude": -73.9801})

    # 2. Person B books token and enters geofence -> ACTIVE
    res_b = client.post("/api/v1/tokens", json={
        "location_id": loc.id,
        "service_id": srv.id,
        "customer_name": "Person B (Present Next)",
        "customer_phone": "+19991110002",
        "priority": "standard"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()
    client.post(f"/api/v1/tokens/{token_b['token_uuid']}/activate", json={"latitude": 40.7502, "longitude": -73.9802})

    # 3. Staff calls next -> Person A is called
    call_res = client.post("/api/v1/tokens/call-next", json={"counter_id": ctr.id, "service_id": srv.id}, headers=staff_headers)
    assert call_res.status_code == 200
    assert call_res.json()["id"] == token_a["id"]
    assert call_res.json()["status"] == "CALLED"

    # 4. Person A does not show up. Staff triggers no-show-reallot
    no_show_res = client.post(f"/api/v1/tokens/{token_a['id']}/no-show-reallot", headers=staff_headers)
    assert no_show_res.status_code == 200
    ns_data = no_show_res.json()

    # Person A is cancelled
    assert ns_data["cancelled_token"]["id"] == token_a["id"]
    assert ns_data["cancelled_token"]["status"] == "CANCELLED"

    # Person B is automatically alloted and called!
    assert ns_data["realloted_token"] is not None
    assert ns_data["realloted_token"]["id"] == token_b["id"]
    assert ns_data["realloted_token"]["status"] == "CALLED"
    assert ns_data["realloted_token"]["counter_name"] == ctr.name
