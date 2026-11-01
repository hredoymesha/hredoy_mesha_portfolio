# Citation-style resource attribution

The bundled CSL files in this directory were obtained from the official
[Citation Style Language styles repository](https://github.com/citation-style-language/styles):

- `apa.csl` — APA Style 7th edition.
- `modern-language-association.csl` — MLA Handbook 9th edition.
- `chicago-author-date.csl` — Chicago Manual of Style 17th edition, Author-Date.
- `chicago-notes.csl` — Chicago Manual of Style 17th edition, Notes and Bibliography.
- `ieee.csl` — IEEE Reference Guide.
- `vancouver.csl` — Taylor & Francis / National Library of Medicine Vancouver variant.
- `../locales/locales-en-US.xml` — U.S. English CSL locale from the official CSL locales repository.

The CSL styles and locale are distributed under
[Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
Their original style metadata, authors, links, and rights notices are retained in
the XML. This application does not claim ownership of those files.

The citation processor is `citeproc-py` 0.11.1, distributed under the
BSD 3-Clause license. Its upstream project documents known CSL compatibility
gaps; see [citation style support](../../docs/citecraft.md).
Other dependencies and their license metadata are listed in the Python package
metadata. Review the license of each dependency before redistributing a bundled
release.
