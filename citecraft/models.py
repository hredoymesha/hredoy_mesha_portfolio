"""Canonical reference data and request schemas."""

from __future__ import annotations

import re
import uuid
from datetime import date
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SourceType = Literal["article-journal", "book", "chapter", "webpage", "report", "thesis"]
LocatorLabel = Literal["page", "chapter", "paragraph", "section", "volume", "issue", "line"]
StyleId = Literal[
    "apa",
    "mla",
    "chicago-author-date",
    "chicago-notes",
    "ieee",
    "vancouver",
]
ExportFormat = Literal[
    "citecraft-json",
    "csl-json",
    "bibtex",
    "ris",
    "csv",
    "plain-text",
    "markdown",
    "html",
    "docx",
]

_DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)
_DATE_RE = re.compile(r"^\d{4}(?:-\d{2}(?:-\d{2})?)?$")


class Contributor(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    given: str | None = Field(default=None, max_length=160)
    family: str | None = Field(default=None, max_length=160)
    literal: str | None = Field(default=None, max_length=240)

    @model_validator(mode="after")
    def require_name(self) -> Contributor:
        if self.literal and (self.given or self.family):
            raise ValueError("Use either a literal name or given/family fields.")
        if not self.literal and not (self.given or self.family):
            raise ValueError("A contributor needs a name.")
        return self


class Reference(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), min_length=1, max_length=80)
    source_type: SourceType
    title: str = Field(min_length=1, max_length=1000)
    subtitle: str | None = Field(default=None, max_length=500)
    short_title: str | None = Field(default=None, max_length=300)
    authors: list[Contributor] = Field(default_factory=list, max_length=30)
    editors: list[Contributor] = Field(default_factory=list, max_length=30)
    publication_date: str | None = Field(default=None, max_length=10)
    year: int | None = Field(default=None, ge=1, le=9999)
    journal_title: str | None = Field(default=None, max_length=500)
    book_title: str | None = Field(default=None, max_length=500)
    publisher: str | None = Field(default=None, max_length=500)
    publisher_place: str | None = Field(default=None, max_length=240)
    institution: str | None = Field(default=None, max_length=500)
    volume: str | None = Field(default=None, max_length=80)
    issue: str | None = Field(default=None, max_length=80)
    pages: str | None = Field(default=None, max_length=100)
    article_number: str | None = Field(default=None, max_length=100)
    edition: str | None = Field(default=None, max_length=100)
    doi: str | None = Field(default=None, max_length=255)
    isbn: str | None = Field(default=None, max_length=24)
    issn: str | None = Field(default=None, max_length=12)
    url: str | None = Field(default=None, max_length=2048)
    accessed_date: str | None = Field(default=None, max_length=10)
    abstract: str | None = Field(default=None, max_length=5000)
    language: str | None = Field(default=None, max_length=35)
    number: str | None = Field(default=None, max_length=100)

    @field_validator(
        "subtitle",
        "short_title",
        "journal_title",
        "book_title",
        "publisher",
        "publisher_place",
        "institution",
        "volume",
        "issue",
        "pages",
        "article_number",
        "edition",
        "doi",
        "isbn",
        "issn",
        "url",
        "accessed_date",
        "abstract",
        "language",
        "number",
        mode="before",
    )
    @classmethod
    def empty_values_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("publication_date", "accessed_date")
    @classmethod
    def validate_partial_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not _DATE_RE.fullmatch(value):
            raise ValueError(
                "Use a year, year-month, or full ISO date (YYYY, YYYY-MM, YYYY-MM-DD)."
            )
        if len(value) == 4:
            if int(value) < 1:
                raise ValueError("Year must be positive.")
        elif len(value) == 7:
            date.fromisoformat(f"{value}-01")
        else:
            date.fromisoformat(value)
        return value

    @field_validator("doi")
    @classmethod
    def validate_doi(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", value, flags=re.IGNORECASE)
        if not _DOI_RE.fullmatch(value):
            raise ValueError(
                "Enter a DOI such as 10.1234/example. DOI values are not looked up online."
            )
        return value

    @field_validator("isbn")
    @classmethod
    def validate_isbn(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = re.sub(r"[\s-]", "", value).upper()
        if len(normalized) == 10:
            digits = normalized[:9]
            if not digits.isdigit() or normalized[-1] not in "0123456789X":
                raise ValueError("ISBN-10 contains invalid characters.")
            checksum = sum((10 - index) * int(char) for index, char in enumerate(digits))
            checksum += 10 if normalized[-1] == "X" else int(normalized[-1])
            if checksum % 11:
                raise ValueError("ISBN-10 check digit is invalid.")
        elif len(normalized) == 13 and normalized.isdigit():
            checksum = sum(
                int(char) * (1 if index % 2 == 0 else 3)
                for index, char in enumerate(normalized[:12])
            )
            if (10 - checksum % 10) % 10 != int(normalized[-1]):
                raise ValueError("ISBN-13 check digit is invalid.")
        else:
            raise ValueError("ISBN must be a valid ISBN-10 or ISBN-13.")
        return normalized

    @field_validator("issn")
    @classmethod
    def validate_issn(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = re.sub(r"[\s-]", "", value).upper()
        if (
            len(normalized) != 8
            or not normalized[:7].isdigit()
            or normalized[-1] not in "0123456789X"
        ):
            raise ValueError("ISSN must contain seven digits and a valid check character.")
        checksum = sum((8 - index) * int(char) for index, char in enumerate(normalized[:7]))
        expected = (11 - checksum % 11) % 11
        check_char = "X" if expected == 10 else str(expected)
        if normalized[-1] != check_char:
            raise ValueError("ISSN check character is invalid.")
        return f"{normalized[:4]}-{normalized[4:]}"

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str | None) -> str | None:
        if value is not None:
            parsed = urlsplit(value)
            if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
                raise ValueError("URL must be an absolute http:// or https:// address.")
        return value

    @model_validator(mode="after")
    def derive_year_and_validate_date(self) -> Reference:
        if self.publication_date is not None:
            date_year = int(self.publication_date[:4])
            if self.year is not None and self.year != date_year:
                raise ValueError("year must match the year in publication_date.")
            self.year = date_year
        if not self.title.strip():
            raise ValueError("Title is required.")
        return self


class CitationItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference_id: str = Field(min_length=1, max_length=80)
    locator_label: LocatorLabel | None = None
    locator: str | None = Field(default=None, max_length=100)
    mode: Literal["parenthetical", "narrative", "note"] = "parenthetical"

    @model_validator(mode="after")
    def locator_has_label(self) -> CitationItemRequest:
        if bool(self.locator) != bool(self.locator_label):
            raise ValueError("A locator value and locator type must be supplied together.")
        return self


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    references: Annotated[list[Reference], Field(min_length=1, max_length=100)]
    style: StyleId = "apa"
    citation_sequence: list[list[CitationItemRequest]] = Field(default_factory=list, max_length=200)


class ImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: Literal["citecraft-json", "csl-json", "ris", "bibtex", "csv"]
    content: str = Field(min_length=1, max_length=2_000_000)


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    references: Annotated[list[Reference], Field(min_length=1, max_length=100)]
    style: StyleId = "apa"
    format: ExportFormat
