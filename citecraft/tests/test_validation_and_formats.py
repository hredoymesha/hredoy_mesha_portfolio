from __future__ import annotations

import pytest
from citecraft.formats import export_references, import_references
from citecraft.models import ExportRequest, Reference
from pydantic import ValidationError


def test_rejects_impossible_partial_dates() -> None:
    with pytest.raises(ValidationError):
        Reference(source_type="book", title="A book", publication_date="2024-02-30")


def test_rejects_invalid_doi_and_check_digits() -> None:
    with pytest.raises(ValidationError):
        Reference(source_type="book", title="A book", doi="https://example.org/fake")
    with pytest.raises(ValidationError):
        Reference(source_type="book", title="A book", isbn="9780306406158")


@pytest.mark.parametrize(
    ("format_name", "payload"),
    [
        (
            "citecraft-json",
            '{"schema_version":1,"references":[{"source_type":"book","title":"A book","year":2024}]}',
        ),
        (
            "csl-json",
            '[{"id":"csl-1","type":"book","title":"A book","issued":{"date-parts":[[2024]]}}]',
        ),
        (
            "ris",
            "TY  - BOOK\nTI  - A book\nPY  - 2024\nER  - ",
        ),
        (
            "bibtex",
            "@book{key, title={A book}, year={2024}}",
        ),
        (
            "csv",
            "source_type,title,year\nbook,A book,2024\n",
        ),
    ],
)
def test_supported_import_formats(format_name: str, payload: str) -> None:
    records = import_references(format_name, payload)

    assert len(records) == 1
    assert records[0].title == "A book"
    assert records[0].year == 2024


def test_citecraft_json_round_trip(book_reference: Reference) -> None:
    exported = export_references(
        ExportRequest(references=[book_reference], format="citecraft-json")
    )
    imported = import_references("citecraft-json", exported.content)

    assert imported == [book_reference]


@pytest.mark.parametrize(
    "format_name",
    ["csl-json", "bibtex", "ris", "csv", "plain-text", "markdown", "html", "docx"],
)
def test_supported_exports_return_content(book_reference: Reference, format_name: str) -> None:
    request = ExportRequest.model_validate({"references": [book_reference], "format": format_name})
    exported = export_references(request)

    assert exported.content
    assert exported.filename
    assert exported.content_type
