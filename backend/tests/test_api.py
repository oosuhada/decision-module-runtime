from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def workspace_payload(workspace_id: str) -> dict:
    return {
        "schemaVersion": "1.0",
        "id": workspace_id,
        "name": "API integration workspace",
        "request": "Choose a vendor",
        "createdAt": "2026-08-24T00:00:00.000Z",
        "updatedAt": "2026-08-24T00:00:00.000Z",
        "modules": [],
        "edges": [],
        "plan": None,
        "run": {"id": str(uuid.uuid4()), "status": "idle"},
        "snapshots": [],
        "audit": [],
        "decision": {},
        "mode": "edit",
    }


def test_health_and_persistence_round_trip(client: TestClient) -> None:
    workspace_id = f"api-{uuid.uuid4()}"
    payload = workspace_payload(workspace_id)
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.headers["x-content-type-options"] == "nosniff"
    assert health.headers["referrer-policy"] == "no-referrer"
    assert health.headers["cache-control"] == "no-store"
    saved = client.put(f"/api/workspaces/{workspace_id}", json=payload)
    assert saved.status_code == 200
    restored = client.get(f"/api/workspaces/{workspace_id}")
    assert restored.status_code == 200
    assert restored.json() == payload


def test_readonly_share_is_frozen_snapshot(client: TestClient) -> None:
    workspace_id = f"share-{uuid.uuid4()}"
    payload = workspace_payload(workspace_id)
    client.put(f"/api/workspaces/{workspace_id}", json=payload)
    share = client.post(f"/api/workspaces/{workspace_id}/shares")
    assert share.status_code == 200
    token = share.json()["token"]
    shared = client.get(f"/api/shares/{token}")
    assert shared.status_code == 200
    assert shared.json()["mode"] == "readonly"


def test_workspace_id_mismatch_is_rejected(client: TestClient) -> None:
    payload = workspace_payload("payload-id")
    response = client.put("/api/workspaces/path-id", json=payload)
    assert response.status_code == 409


def test_sse_demo_stream_is_versioned(client: TestClient) -> None:
    response = client.get("/api/generation/demo-stream?request=hello")
    assert response.status_code == 200
    assert "event: plan" in response.text
    assert '"protocol": "1.0"' in response.text
