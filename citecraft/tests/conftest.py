from __future__ import annotations

import pytest
from citecraft.models import Contributor, Reference


@pytest.fixture
def journal_reference() -> Reference:
    return Reference(
        id="journal-1",
        source_type="article-journal",
        title="Evidence and Public Policy",
        authors=[Contributor(family="Rahman", given="Amina")],
        publication_date="2024",
        journal_title="Journal of Policy Studies",
        volume="12",
        issue="2",
        pages="21-39",
        doi="10.1234/example.2024.1",
    )


@pytest.fixture
def book_reference() -> Reference:
    return Reference(
        id="book-1",
        source_type="book",
        title="Research Methods",
        authors=[
            Contributor(family="Nguyen", given="Linh"),
            Contributor(family="O'Connor", given="Maeve"),
        ],
        publication_date="2022",
        publisher="Northstar Press",
    )
