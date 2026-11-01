"""Offline CSL citation rendering and style-specific, testable adapters."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from citeproc import (
    Citation,
    CitationItem,
    CitationStylesBibliography,
    CitationStylesStyle,
    formatter,
)
from citeproc.source import Locator
from citeproc.source.json import CiteProcJSON

from citecraft.models import CitationItemRequest, Reference, RenderRequest

ROOT = Path(__file__).resolve().parent
STYLE_DIR = ROOT / "resources" / "styles"

STYLE_REGISTRY: dict[str, dict[str, str]] = {
    "apa": {
        "label": "APA 7th edition",
        "file": "apa.csl",
        "family": "author-date",
        "limitations": "Narrative author-date citations use a tested adapter; CSL disambiguation is not supported.",
    },
    "mla": {
        "label": "MLA 9th edition",
        "file": "modern-language-association.csl",
        "family": "author-date",
        "limitations": "CSL disambiguation is not supported; use the result as a draft for source-specific rules.",
    },
    "chicago-author-date": {
        "label": "Chicago 17th edition (Author-Date)",
        "file": "chicago-author-date.csl",
        "family": "author-date",
        "limitations": "Narrative author-date citations use a tested adapter; CSL disambiguation is not supported.",
    },
    "chicago-notes": {
        "label": "Chicago 17th edition (Notes & Bibliography)",
        "file": "chicago-notes.csl",
        "family": "note",
        "limitations": "First notes use CSL; repeated notes use a tested short-title adapter. Ibid. and full Chicago edge cases are not implemented.",
    },
    "ieee": {
        "label": "IEEE Reference Guide",
        "file": "ieee.csl",
        "family": "numeric",
        "limitations": "Numbering follows the order of first citation; source-specific editorial requirements may differ.",
    },
    "vancouver": {
        "label": "Vancouver (Taylor & Francis NLM variant)",
        "file": "vancouver.csl",
        "family": "numeric",
        "limitations": "Uses the bundled Taylor & Francis NLM/Vancouver variant, not a claim of universal Vancouver compliance.",
    },
}

AUTHOR_DATE_STYLES = {"apa", "chicago-author-date"}
ResolvedCitationItem = tuple[Reference, CitationItemRequest]


class CitationRenderError(ValueError):
    """A supported style cannot render the requested citation context."""


def available_styles() -> list[dict[str, str]]:
    return [
        {"id": style_id, **details}
        for style_id, details in STYLE_REGISTRY.items()
        if (STYLE_DIR / details["file"]).is_file()
    ]


def reference_to_csl(reference: Reference) -> dict[str, Any]:
    issued: list[int] | None = None
    date_value = reference.publication_date
    if date_value:
        issued = [int(part) for part in date_value.split("-")]
    elif reference.year:
        issued = [reference.year]

    item: dict[str, Any] = {
        "id": reference.id,
        "type": reference.source_type,
        "title": reference.title,
        "author": [_contributor_to_csl(person) for person in reference.authors],
        "editor": [_contributor_to_csl(person) for person in reference.editors],
    }
    if issued:
        item["issued"] = {"date-parts": [issued]}
    optional_fields = {
        "subtitle": reference.subtitle,
        "shortTitle": reference.short_title,
        "container-title": reference.journal_title or reference.book_title,
        "publisher": reference.publisher,
        "publisher-place": reference.publisher_place,
        "institution": reference.institution,
        "volume": reference.volume,
        "issue": reference.issue,
        "page": reference.pages,
        "article-number": reference.article_number,
        "edition": reference.edition,
        "DOI": reference.doi,
        "ISBN": reference.isbn,
        "ISSN": reference.issn,
        "URL": reference.url,
        "abstract": reference.abstract,
        "language": reference.language,
        "number": reference.number,
    }
    for key, value in optional_fields.items():
        if value is not None:
            item[key] = value
    if reference.accessed_date:
        item["accessed"] = {
            "date-parts": [[int(part) for part in reference.accessed_date.split("-")]]
        }
    return _adapt_corporate_names(item)


def _contributor_to_csl(person: Any) -> dict[str, str]:
    if person.literal:
        return {"literal": person.literal}
    result: dict[str, str] = {}
    if person.given:
        result["given"] = person.given
    if person.family:
        result["family"] = person.family
    return result


def _adapt_corporate_names(item: dict[str, Any]) -> dict[str, Any]:
    """citeproc-py 0.11 does not support CSL literal names; preserve them as family names."""
    for role in ("author", "editor"):
        contributors = item.get(role, [])
        item[role] = [
            {"family": person["literal"]} if "literal" in person else person
            for person in contributors
        ]
    return item


def citation_warnings(reference: Reference) -> list[str]:
    warnings: list[str] = []
    if not reference.authors and not reference.editors:
        warnings.append(
            "No author or editor supplied; the selected style may begin with the title."
        )
    if not reference.publication_date and not reference.year:
        warnings.append("No publication date supplied; the selected style may use a no-date form.")
    if reference.source_type == "article-journal" and not reference.journal_title:
        warnings.append("Journal title is missing for this journal article.")
    if reference.source_type == "chapter" and not reference.book_title:
        warnings.append("Book title is missing for this chapter.")
    if reference.source_type == "webpage" and not reference.url:
        warnings.append("URL is missing for this webpage.")
    if reference.source_type == "thesis" and not (reference.institution or reference.publisher):
        warnings.append("Institution or publisher is missing for this thesis.")
    if reference.source_type == "report" and not (reference.institution or reference.publisher):
        warnings.append("Institution or publisher is missing for this report.")
    if reference.source_type in {"book", "chapter"} and not reference.publisher:
        warnings.append("Publisher is missing for this book source.")
    return warnings


def render(request: RenderRequest) -> dict[str, Any]:
    details = STYLE_REGISTRY.get(request.style)
    if details is None:
        raise CitationRenderError(f"Unsupported citation style: {request.style}")
    style_path = STYLE_DIR / details["file"]
    if not style_path.is_file():
        raise CitationRenderError(f"The bundled style file is missing: {details['file']}")

    references_by_id = {reference.id: reference for reference in request.references}
    if len(references_by_id) != len(request.references):
        raise CitationRenderError("Reference IDs in a bibliography must be unique.")

    sequence: list[list[CitationItemRequest]] = request.citation_sequence or [
        [CitationItemRequest(reference_id=reference.id)] for reference in request.references
    ]
    citations: list[Citation] = []
    sequence_items: list[list[ResolvedCitationItem]] = []
    for request_group in sequence:
        cite_items: list[CitationItem] = []
        resolved_items: list[ResolvedCitationItem] = []
        for item in request_group:
            reference = references_by_id.get(item.reference_id)
            if reference is None:
                raise CitationRenderError(
                    f"Citation refers to unknown reference ID: {item.reference_id}"
                )
            kwargs: dict[str, Any] = {}
            if item.locator and item.locator_label:
                kwargs["locator"] = Locator(item.locator_label, item.locator)
            cite_items.append(CitationItem(item.reference_id, **kwargs))
            resolved_items.append((reference, item))
        if not cite_items:
            raise CitationRenderError("Citation groups cannot be empty.")
        citations.append(Citation(cite_items))
        sequence_items.append(resolved_items)

    source = CiteProcJSON([reference_to_csl(reference) for reference in request.references])
    style = CitationStylesStyle(str(style_path), validate=False)
    bibliography = CitationStylesBibliography(style, source, formatter.plain)
    for citation in citations:
        bibliography.register(citation)

    rendered_citations: list[str] = []
    notes_seen: set[str] = set()
    for citation, resolved_group in zip(citations, sequence_items, strict=True):
        if request.style == "chicago-notes":
            note = _render_note(resolved_group, bibliography, notes_seen)
            rendered_citations.append(note)
            continue
        if any(item.mode == "note" for _, item in resolved_group):
            raise CitationRenderError(
                "Note citations are only available with Chicago Notes & Bibliography."
            )
        if any(item.mode == "narrative" for _, item in resolved_group):
            if request.style not in AUTHOR_DATE_STYLES:
                raise CitationRenderError(
                    f"Narrative citations are not supported by {details['label']}."
                )
            rendered_citations.append(_render_narrative(resolved_group, request.style))
            continue
        rendered_citations.append(str(bibliography.cite(citation, lambda _item: None)).strip())

    bibliography_entries = [str(entry).strip() for entry in bibliography.bibliography()]
    return {
        "style": request.style,
        "style_label": details["label"],
        "limitations": details["limitations"],
        "citations": rendered_citations,
        "bibliography": bibliography_entries,
        "warnings": _render_warnings(request),
        "references": [reference.model_dump(mode="json") for reference in request.references],
    }


def _render_warnings(request: RenderRequest) -> dict[str, list[str]]:
    warnings = {reference.id: citation_warnings(reference) for reference in request.references}
    if request.style not in AUTHOR_DATE_STYLES:
        return warnings
    for index, left in enumerate(request.references):
        left_author = _first_author_key(left)
        if left.year is None or not left_author:
            continue
        for right in request.references[index + 1 :]:
            if left.year == right.year and left_author == _first_author_key(right):
                message = (
                    "Possible author/year collision. This processor does not add year suffixes; "
                    "review the citation manually."
                )
                warnings[left.id].append(message)
                warnings[right.id].append(message)
    return warnings


def _first_author_key(reference: Reference) -> str | None:
    if not reference.authors:
        return None
    first = reference.authors[0]
    return (first.literal or first.family or first.given or "").casefold() or None


def _render_note(
    group: list[tuple[Reference, Any]],
    bibliography: CitationStylesBibliography,
    notes_seen: set[str],
) -> str:
    rendered: list[str] = []
    for reference, item in group:
        if reference.id not in notes_seen:
            first_note = Citation([CitationItem(reference.id)])
            bibliography.register(first_note)
            value = str(bibliography.cite(first_note, lambda _item: None)).strip()
            if item.locator:
                value = f"{value.rstrip('.')} {item.locator}."
            rendered.append(value)
            notes_seen.add(reference.id)
        else:
            rendered.append(_short_note(reference, item.locator))
    return " ".join(rendered)


def _short_note(reference: Reference, locator: str | None) -> str:
    names = [
        contributor.literal or contributor.family or contributor.given or ""
        for contributor in reference.authors
    ]
    names = [name for name in names if name]
    if not names:
        author = ""
    elif len(names) == 1:
        author = names[0]
    elif len(names) <= 3:
        author = " and ".join([", ".join(names[:-1]), names[-1]])
    else:
        author = f"{names[0]} et al."

    short_title = reference.short_title or reference.title.split(":", 1)[0]
    short_title = short_title.strip().rstrip(".,;:")
    pieces = [value for value in (author, short_title, locator) if value]
    return f"{', '.join(pieces)}."


def _render_narrative(group: list[tuple[Reference, Any]], style_id: str) -> str:
    parts: list[str] = []
    for reference, item in group:
        author = _narrative_author(reference, style_id)
        year = str(reference.year) if reference.year else "n.d."
        locator = ""
        if item.locator:
            if item.locator_label == "page":
                prefix = "pp." if re.search(r"[-–,]", item.locator) else "p."
                locator = f", {prefix} {item.locator}"
            else:
                locator = f", {item.locator_label} {item.locator}"
        parts.append(f"{author} ({year}{locator})")
    return "; ".join(parts)


def _narrative_author(reference: Reference, style_id: str) -> str:
    names = [
        contributor.literal or contributor.family or contributor.given or ""
        for contributor in reference.authors
    ]
    names = [name for name in names if name]
    if not names:
        return reference.title
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return f"{names[0]} et al."
