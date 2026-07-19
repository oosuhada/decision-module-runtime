from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class WorkspacePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schemaVersion: Literal["1.0"]
    id: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    request: str = Field(max_length=20_000)
    createdAt: str
    updatedAt: str
    modules: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    plan: dict[str, Any] | None
    run: dict[str, Any]
    snapshots: list[dict[str, Any]]
    audit: list[dict[str, Any]]
    decision: dict[str, Any]
    mode: Literal["edit", "readonly"] = "edit"


class ShareResponse(BaseModel):
    token: str
    url: str
    permission: Literal["readonly"] = "readonly"


class ExportRequest(BaseModel):
    format: Literal["json"] = "json"
