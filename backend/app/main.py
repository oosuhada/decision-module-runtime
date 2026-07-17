from __future__ import annotations

import asyncio
import json
import os
import secrets
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_session
from .models import ExportRecord, ShareRecord, Workspace
from .schemas import ExportRequest, ShareResponse, WorkspacePayload


MAX_BODY_BYTES = 2 * 1024 * 1024
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:3103")
REQUIRE_AUTH = os.getenv("DECISION_REQUIRE_AUTH", "0") == "1"
API_TOKEN = os.getenv("DECISION_API_TOKEN", "")

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Generative Decision Workspace API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


@app.middleware("http")
async def security_boundary(request: Request, call_next):  # type: ignore[no-untyped-def]
    if request.url.path.startswith("/api"):
        content_length = request.headers.get("content-length")
        try:
            if content_length and int(content_length) > MAX_BODY_BYTES:
                return Response(status_code=413, content="Request body too large")
        except ValueError:
            return Response(status_code=400, content="Invalid content length")
        is_public = (
            request.url.path == "/api/health"
            or request.url.path.startswith("/api/shares/")
            or request.url.path in {"/api/docs", "/api/openapi.json"}
        )
        is_write = request.method not in {"GET", "HEAD", "OPTIONS"}
        if REQUIRE_AUTH and is_write and not is_public:
            expected = f"Bearer {API_TOKEN}" if API_TOKEN else ""
            if not expected or not secrets.compare_digest(request.headers.get("authorization", ""), expected):
                return Response(status_code=401, content="Unauthorized")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "storage": "database"}


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspacePayload)
def get_workspace(workspace_id: str, session: Session = Depends(get_session)) -> WorkspacePayload:
    record = session.get(Workspace, workspace_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspacePayload.model_validate(record.document)


@app.put("/api/workspaces/{workspace_id}", response_model=WorkspacePayload)
def put_workspace(workspace_id: str, payload: WorkspacePayload, session: Session = Depends(get_session)) -> WorkspacePayload:
    if payload.id != workspace_id:
        raise HTTPException(status_code=409, detail="Workspace id mismatch")
    document = payload.model_dump(mode="json")
    record = session.get(Workspace, workspace_id)
    if record is None:
        record = Workspace(id=workspace_id, name=payload.name, schema_version=payload.schemaVersion, document=document)
        session.add(record)
    else:
        record.name = payload.name
        record.schema_version = payload.schemaVersion
        record.document = document
    session.commit()
    return payload


@app.post("/api/workspaces/{workspace_id}/shares", response_model=ShareResponse)
def create_share(workspace_id: str, session: Session = Depends(get_session)) -> ShareResponse:
    workspace = session.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    token = secrets.token_urlsafe(24)
    snapshot = dict(workspace.document)
    snapshot["mode"] = "readonly"
    session.add(ShareRecord(token=token, workspace_id=workspace_id, snapshot=snapshot, permission="readonly"))
    session.commit()
    return ShareResponse(token=token, url=f"{PUBLIC_BASE_URL}/share/{token}")


@app.get("/api/shares/{token}", response_model=WorkspacePayload)
def get_share(token: str, session: Session = Depends(get_session)) -> WorkspacePayload:
    share = session.get(ShareRecord, token)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")
    payload = dict(share.snapshot)
    payload["mode"] = "readonly"
    return WorkspacePayload.model_validate(payload)


@app.post("/api/workspaces/{workspace_id}/exports")
def record_export(workspace_id: str, payload: ExportRequest, session: Session = Depends(get_session)) -> dict[str, str]:
    if session.get(Workspace, workspace_id) is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    export_id = str(uuid.uuid4())
    session.add(ExportRecord(id=export_id, workspace_id=workspace_id, format=payload.format))
    session.commit()
    return {"id": export_id, "format": payload.format}


async def demo_stream(request_text: str) -> AsyncIterator[str]:
    plan = {
        "protocol": "1.0",
        "kind": "plan",
        "request": request_text[:20_000],
        "modules": ["text-evidence", "criteria-weights", "vendor-matrix", "recommendation-logic", "human-decision-gate"],
    }
    yield f"event: plan\ndata: {json.dumps(plan)}\n\n"
    for sequence, action in enumerate(["add_module", "connect", "finish"]):
        await asyncio.sleep(0.03)
        yield f"event: action\ndata: {json.dumps({'protocol': '1.0', 'sequence': sequence, 'type': action})}\n\n"


@app.get("/api/generation/demo-stream")
def generation_demo_stream(request: str = "Decision request") -> StreamingResponse:
    return StreamingResponse(demo_stream(request), media_type="text/event-stream", headers={"X-Accel-Buffering": "no"})
