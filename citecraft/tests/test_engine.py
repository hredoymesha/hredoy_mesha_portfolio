from __future__ import annotations

from citecraft.engine import citation_warnings, reference_to_csl, render
from citecraft.models import (
    CitationItemRequest,
    Contributor,
    Reference,
    RenderRequest,
)


def test_apa_journal_in_text_and_bibliography(journal_reference: Reference) -> None:
    result = render(RenderRequest(references=[journal_reference], style="apa"))

    assert result["citations"] == ["(Rahman, 2024)"]
    assert "Rahman, A. (2024)." in result["bibliography"][0]
    assert "Journal of Policy Studies" in result["bibliography"][0]
    assert "10.1234/example.2024.1" in result["bibliography"][0]


def test_personal_authors_page_locator_and_citation_group(
    journal_reference: Reference, book_reference: Reference
) -> None:
    request = RenderRequest(
        references=[journal_reference, book_reference],
        style="apa",
        citation_sequence=[
            [CitationItemRequest(reference_id="journal-1", locator_label="page", locator="27")],
            [
                CitationItemRequest(reference_id="journal-1"),
                CitationItemRequest(reference_id="book-1"),
            ],
        ],
    )

    result = render(request)

    assert result["citations"][0] == "(Rahman, 2024, p. 27)"
    assert "Rahman, 2024" in result["citations"][1]
    assert "Nguyen & O'Connor, 2022" in result["citations"][1]


def test_narrative_author_date_adapter(journal_reference: Reference) -> None:
    request = RenderRequest(
        references=[journal_reference],
        style="apa",
        citation_sequence=[[CitationItemRequest(reference_id="journal-1", mode="narrative")]],
    )

    assert render(request)["citations"] == ["Rahman (2024)"]


def test_chicago_full_note_and_repeat_short_title(journal_reference: Reference) -> None:
    request = RenderRequest(
        references=[journal_reference],
        style="chicago-notes",
        citation_sequence=[
            [CitationItemRequest(reference_id="journal-1", mode="note")],
            [
                CitationItemRequest(
                    reference_id="journal-1", mode="note", locator_label="page", locator="27"
                )
            ],
        ],
    )

    result = render(request)

    assert "Evidence and Public Policy" in result["citations"][0]
    assert result["citations"][1] == "Rahman, Evidence and Public Policy, 27."


def test_numeric_style_numbers_by_first_citation(
    journal_reference: Reference, book_reference: Reference
) -> None:
    request = RenderRequest(
        references=[journal_reference, book_reference],
        style="ieee",
        citation_sequence=[
            [CitationItemRequest(reference_id="book-1")],
            [CitationItemRequest(reference_id="journal-1")],
        ],
    )

    result = render(request)

    assert result["citations"] == ["[1]", "[2]"]
    assert result["bibliography"][0].startswith("[1]")
    assert "Research Methods" in result["bibliography"][0]


def test_corporate_author_adapter_preserves_name(journal_reference: Reference) -> None:
    corporate = journal_reference.model_copy(
        update={
            "id": "corporate-1",
            "authors": [Contributor(literal="World Research Group")],
        }
    )

    result = render(RenderRequest(references=[corporate], style="apa"))

    assert result["citations"] == ["(World Research Group, 2024)"]
    assert "World Research Group. (2024)." in result["bibliography"][0]
    assert reference_to_csl(corporate)["author"] == [{"family": "World Research Group"}]


def test_unicode_literal_name_is_not_lost(journal_reference: Reference) -> None:
    unicode_reference = journal_reference.model_copy(
        update={
            "id": "unicode-1",
            "authors": [Contributor(literal="মীরা দাস")],
            "title": "বাংলা ভাষা ও প্রযুক্তি",
        }
    )

    result = render(RenderRequest(references=[unicode_reference], style="apa"))

    assert result["citations"] == ["(মীরা দাস, 2024)"]
    assert result["bibliography"][0].startswith("মীরা দাস. (2024).")
    assert "বাংলা ভাষা ও প্রযুক্তি" in result["bibliography"][0]


def test_same_author_year_collision_is_warned_not_disambiguated(
    journal_reference: Reference,
) -> None:
    second = journal_reference.model_copy(
        update={"id": "journal-2", "title": "Different policy evidence"}
    )

    result = render(RenderRequest(references=[journal_reference, second], style="apa"))

    assert "(Rahman, 2024)" in result["citations"][0]
    assert any(
        "does not add year suffixes" in warning for warning in result["warnings"]["journal-1"]
    )
    assert any(
        "does not add year suffixes" in warning for warning in result["warnings"]["journal-2"]
    )


def test_required_source_warnings_are_explicit() -> None:
    webpage = Reference(source_type="webpage", title="Research page")

    warnings = citation_warnings(webpage)

    assert any("No author" in warning for warning in warnings)
    assert any("No publication date" in warning for warning in warnings)
    assert any("URL is missing" in warning for warning in warnings)
