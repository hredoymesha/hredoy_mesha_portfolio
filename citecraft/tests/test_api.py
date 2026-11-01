from __future__ import annotations

from citecraft.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_and_styles() -> None:
    assert client.get("/health").json()["status"] == "ok"
    styles = client.get("/styles").json()
    assert {style["id"] for style in styles} == {
        "apa",
        "mla",
        "chicago-author-date",
        "chicago-notes",
        "ieee",
        "vancouver",
    }


def test_render_endpoint_uses_submitted_reference() -> None:
    response = client.post(
        "/render",
        json={
            "style": "apa",
            "references": [
                {
                    "id": "live-ref",
                    "source_type": "book",
                    "title": "User entered title",
                    "authors": [{"family": "Writer", "given": "Alex"}],
                    "year": 2024,
                    "publisher": "Local Press",
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["citations"] == ["(Writer, 2024)"]
    assert "User entered title" in response.json()["bibliography"][0]


def test_render_rejects_unsupported_narrative_mode() -> None:
    response = client.post(
        "/render",
        json={
            "style": "ieee",
            "references": [{"id": "r", "source_type": "book", "title": "Book"}],
            "citation_sequence": [[{"reference_id": "r", "mode": "narrative"}]],
        },
    )

    assert response.status_code == 422
    assert "Narrative citations are not supported" in response.json()["detail"]


def test_import_endpoint_returns_validation_error_for_unknown_style_payload() -> None:
    response = client.post("/import", json={"format": "ris", "content": "TY  - UNKNOWN\nER  -"})

    assert response.status_code == 422
    assert "Unsupported RIS reference type" in response.json()["detail"]


def test_duplicate_suggestions_do_not_merge_records() -> None:
    response = client.post(
        "/duplicates",
        json=[
            {"id": "first", "source_type": "book", "title": "A shared title", "year": 2020},
            {"id": "second", "source_type": "book", "title": "A shared title", "year": 2020},
        ],
    )

    assert response.status_code == 200
    assert len(response.json()["suggestions"]) == 1
    assert len(response.request.content) > 0
