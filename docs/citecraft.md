# CiteCraft

CiteCraft is the citation and bibliography tool inside the Publications section. The page is React. A small Python service (FastAPI) formats the citations. The Express server starts that service on `127.0.0.1:8765` and passes requests from `/api/citecraft/*` to it, so there is only one public address and no CORS setup.

The service keeps nothing. Your references live in the browser's local storage, and you can save them as a JSON file. Clearing the browser data deletes the local copy. No account, no database, and no outside lookups: the DOI field is checked for its format and never opened.

## Running it

See the main README. Set `CITECRAFT_PYTHON` if your Python is not `py -3` (Windows) or `python3`, and `CITECRAFT_API_PORT` to change the port.

## References

Six source types: journal article, book, book chapter, webpage, report, thesis. A record has a title, ordered authors and editors, a date (year, year and month, or full date), container details (volume, issue, pages), edition, DOI, ISBN, ISSN, URL with access date, abstract and language. Impossible dates, wrong ISBN and ISSN check digits and non-HTTP(S) URLs are rejected. Unknown fields are rejected too. Missing fields give a warning next to the result; nothing is filled in for you.

Only the structured record is stored. Citations are made again from it each time you change the style.

## Styles

Formatting uses `citeproc-py` 0.11.1 with six style files that are included in the repository:

- APA 7th edition
- MLA 9th edition
- Chicago 17th, author-date
- Chicago 17th, notes and bibliography
- IEEE
- Vancouver (the Taylor & Francis / NLM variant, named as such in the list)

`citeproc-py` is an incomplete CSL processor. Its own documentation says it passes about 60% of the CSL test suite, and it lacks year suffixes (2024a, 2024b), some repeated-citation rules and collapsing. What that means in practice:

- Two sources with the same author and year do not get a suffix. The tool shows a warning, and you must tell them apart yourself.
- Narrative citations ("Rahman (2024)") come from a small adapter that works for the common APA and Chicago author-date cases.
- Repeated Chicago notes use a short author, title and page form. There is no "Ibid." and not every Chicago exception is covered.
- Corporate authors are passed to the processor as a family name, because it has no support for literal names. Names without a comma are kept as one string.
- Legal sources, unusual dates and publisher-specific rules need checking against the official guide.

Check every citation against the source before you submit it.

The style files are CC BY-SA and keep their original metadata. Credit is in `citecraft/resources/ATTRIBUTION.md`.

## Import and export

Import: CiteCraft JSON, CSL JSON, RIS, BibTeX and CSV. CSV needs `source_type` and `title` columns, and names separated by semicolons (`Family, Given`). Imported records are added to the existing ones. Possible duplicates are only suggested, never merged. If an imported ID already exists in the browser, the new record gets a new ID.

Export: CiteCraft JSON, CSL JSON, BibTeX, RIS, CSV, plain text, Markdown, HTML (escaped) and DOCX. The DOCX is built in memory and sent to the browser; nothing is written on the server.

CSV is a plain interchange format. Look at untrusted values before you open a file in a spreadsheet program.

## Limits

- Up to 100 references per request. Import and export requests can be 2 MB, other requests 64 KB.
- The service is meant to sit behind the portfolio server. It has no login and should not be put on the internet by itself.
- Python 3.12 is the version I tested with.
