"""FastAPI application for the local CiteCraft citation engine."""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from fastapi import FastAPI, HTTPException, Request

from citecraft.engine import (
    CitationRenderError,
    available_styles,
    render,
)
from citecraft.formats import FormatError, export_references, import_references
from citecraft.models import ExportRequest, ImportRequest, Reference, RenderRequest

MAX_REQUEST_BYTES = 2_100_000
app = FastAPI(
    title="CiteCraft local API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.middleware("http")
async def enforce_request_size(request: Request, call_next: Any) -> Any:
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_REQUEST_BYTES:
        return _error_response(413, "Request is too large. The maximum request size is 2 MB.")
    return await call_next(request)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "citecraft-local"}


@app.get("/styles")
def styles() -> list[dict[str, str]]:
    return available_styles()


@app.post("/render")
def render_citations(request: RenderRequest) -> dict[str, Any]:
    try:
        return render(request)
    except CitationRenderError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (ValueError, OSError) as error:
        raise HTTPException(
            status_code=500,
            detail="The citation processor could not render this request.",
        ) from error


@app.post("/import")
def import_file(request: ImportRequest) -> dict[str, Any]:
    try:
        imported = import_references(request.format, request.content)
    except FormatError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "references": [reference.model_dump(mode="json") for reference in imported],
        "count": len(imported),
        "warnings": [
            "Imported records were structurally validated. Review them against the original source."
        ],
    }


@app.post("/export")
def export_file(request: ExportRequest) -> dict[str, str]:
    try:
        exported = export_references(request)
    except (FormatError, CitationRenderError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (ValueError, OSError) as error:
        raise HTTPException(
            status_code=500,
            detail="The requested export could not be generated.",
        ) from error
    return {
        "filename": exported.filename,
        "content_type": exported.content_type,
        "encoding": exported.encoding,
        "content": exported.content,
    }


@app.post("/duplicates")
def duplicate_suggestions(references: list[Reference]) -> dict[str, list[dict[str, Any]]]:
    if not references or len(references) > 100:
        raise HTTPException(status_code=422, detail="Supply between 1 and 100 references.")
    suggestions: list[dict[str, Any]] = []
    for index, left in enumerate(references):
        for right in references[index + 1 :]:
            reason = _duplicate_reason(left, right)
            if reason:
                suggestions.append({"first_id": left.id, "second_id": right.id, "reason": reason})
    return {"suggestions": suggestions}


def _duplicate_reason(left: Reference, right: Reference) -> str | None:
    if left.doi and right.doi and left.doi.casefold() == right.doi.casefold():
        return "The DOI matches."
    if left.isbn and right.isbn and left.isbn == right.isbn:
        return "The ISBN matches."

    def normalize(value: str) -> str:
        return re.sub(r"\W+", " ", value.casefold()).strip()

    if left.year is not None and right.year is not None and left.year != right.year:
        return None
    title_similarity = SequenceMatcher(None, normalize(left.title), normalize(right.title)).ratio()
    if title_similarity < 0.92:
        return None
    return "The normalized titles match; check the authors and year before deciding."


def _error_response(status_code: int, message: str) -> Any:
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=status_code, content={"detail": message})
