import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

type SourceType = 'article-journal' | 'book' | 'chapter' | 'webpage' | 'report' | 'thesis';
type StyleId = 'apa' | 'mla' | 'chicago-author-date' | 'chicago-notes' | 'ieee' | 'vancouver';
type ExportFormat =
  | 'citecraft-json'
  | 'csl-json'
  | 'bibtex'
  | 'ris'
  | 'csv'
  | 'plain-text'
  | 'markdown'
  | 'html'
  | 'docx';
type ImportFormat = 'citecraft-json' | 'csl-json' | 'ris' | 'bibtex' | 'csv';

interface Contributor {
  given?: string | null;
  family?: string | null;
  literal?: string | null;
}

interface Reference {
  id: string;
  source_type: SourceType;
  title: string;
  subtitle: string | null;
  short_title: string | null;
  authors: Contributor[];
  editors: Contributor[];
  publication_date: string | null;
  year: number | null;
  journal_title: string | null;
  book_title: string | null;
  publisher: string | null;
  publisher_place: string | null;
  institution: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  article_number: string | null;
  edition: string | null;
  doi: string | null;
  isbn: string | null;
  issn: string | null;
  url: string | null;
  accessed_date: string | null;
  abstract: string | null;
  language: string | null;
  number: string | null;
}

interface Draft {
  source_type: SourceType;
  title: string;
  subtitle: string;
  authors: string;
  editors: string;
  publication_date: string;
  journal_title: string;
  book_title: string;
  publisher: string;
  publisher_place: string;
  institution: string;
  volume: string;
  issue: string;
  pages: string;
  article_number: string;
  edition: string;
  doi: string;
  isbn: string;
  issn: string;
  url: string;
  accessed_date: string;
  short_title: string;
  number: string;
  abstract: string;
  language: string;
}

interface RenderResult {
  style: StyleId;
  style_label: string;
  limitations: string;
  citations: string[];
  bibliography: string[];
  warnings: Record<string, string[]>;
}

interface DuplicateSuggestion {
  first_id: string;
  second_id: string;
  reason: string;
}

const STORAGE_KEY = 'citecraft.references.v1';
const SOURCE_TYPES: Array<{ id: SourceType; label: string }> = [
  { id: 'article-journal', label: 'Journal article' },
  { id: 'book', label: 'Book' },
  { id: 'chapter', label: 'Book chapter' },
  { id: 'webpage', label: 'Web page' },
  { id: 'report', label: 'Report' },
  { id: 'thesis', label: 'Thesis' },
];
const STYLE_OPTIONS: Array<{ id: StyleId; label: string }> = [
  { id: 'apa', label: 'APA 7th edition' },
  { id: 'mla', label: 'MLA 9th edition' },
  { id: 'chicago-author-date', label: 'Chicago 17th · Author-Date' },
  { id: 'chicago-notes', label: 'Chicago 17th · Notes & Bibliography' },
  { id: 'ieee', label: 'IEEE Reference Guide' },
  { id: 'vancouver', label: 'Vancouver · Taylor & Francis NLM variant' },
];
const EMPTY_DRAFT: Draft = {
  source_type: 'article-journal',
  title: '',
  subtitle: '',
  authors: '',
  editors: '',
  publication_date: '',
  journal_title: '',
  book_title: '',
  publisher: '',
  publisher_place: '',
  institution: '',
  volume: '',
  issue: '',
  pages: '',
  article_number: '',
  edition: '',
  doi: '',
  isbn: '',
  issn: '',
  url: '',
  accessed_date: '',
  short_title: '',
  number: '',
  abstract: '',
  language: '',
};

function isReference(value: unknown): value is Reference {
  if (!value || typeof value !== 'object') return false;
  const reference = value as Partial<Reference>;
  return (
    typeof reference.id === 'string' &&
    typeof reference.title === 'string' &&
    SOURCE_TYPES.some((source) => source.id === reference.source_type) &&
    Array.isArray(reference.authors) &&
    Array.isArray(reference.editors)
  );
}

function contributorLabel(contributor: Contributor): string {
  if (contributor.literal) return contributor.literal;
  return [contributor.family, contributor.given].filter(Boolean).join(', ');
}

function parseContributors(value: string): Contributor[] {
  return value
    .split(';')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const comma = name.indexOf(',');
      if (comma >= 0) {
        return {
          family: name.slice(0, comma).trim(),
          given: name.slice(comma + 1).trim() || null,
        };
      }
      return { literal: name };
    });
}

function toDraft(reference: Reference): Draft {
  return {
    source_type: reference.source_type,
    title: reference.title,
    subtitle: reference.subtitle || '',
    authors: reference.authors.map(contributorLabel).join('; '),
    editors: reference.editors.map(contributorLabel).join('; '),
    publication_date: reference.publication_date || '',
    journal_title: reference.journal_title || '',
    book_title: reference.book_title || '',
    publisher: reference.publisher || '',
    publisher_place: reference.publisher_place || '',
    institution: reference.institution || '',
    volume: reference.volume || '',
    issue: reference.issue || '',
    pages: reference.pages || '',
    article_number: reference.article_number || '',
    edition: reference.edition || '',
    doi: reference.doi || '',
    isbn: reference.isbn || '',
    issn: reference.issn || '',
    url: reference.url || '',
    accessed_date: reference.accessed_date || '',
    short_title: reference.short_title || '',
    number: reference.number || '',
    abstract: reference.abstract || '',
    language: reference.language || '',
  };
}

function createReference(draft: Draft, id: string): Reference {
  const publicationDate = draft.publication_date.trim() || null;
  return {
    id,
    source_type: draft.source_type,
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim() || null,
    short_title: draft.short_title.trim() || null,
    authors: parseContributors(draft.authors),
    editors: parseContributors(draft.editors),
    publication_date: publicationDate,
    year: publicationDate ? Number(publicationDate.slice(0, 4)) : null,
    journal_title: draft.journal_title.trim() || null,
    book_title: draft.book_title.trim() || null,
    publisher: draft.publisher.trim() || null,
    publisher_place: draft.publisher_place.trim() || null,
    institution: draft.institution.trim() || null,
    volume: draft.volume.trim() || null,
    issue: draft.issue.trim() || null,
    pages: draft.pages.trim() || null,
    article_number: draft.article_number.trim() || null,
    edition: draft.edition.trim() || null,
    doi: draft.doi.trim() || null,
    isbn: draft.isbn.trim() || null,
    issn: draft.issn.trim() || null,
    url: draft.url.trim() || null,
    accessed_date: draft.accessed_date.trim() || null,
    abstract: draft.abstract.trim() || null,
    language: draft.language.trim() || null,
    number: draft.number.trim() || null,
  };
}

function filenameFromHeader(value: string | null, fallback: string): string {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export function CiteCraftPanel() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleId>('apa');
  const [citationMode, setCitationMode] = useState<'parenthetical' | 'narrative' | 'note'>('parenthetical');
  const [result, setResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'title' | 'year'>('added');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('citecraft-json');
  const [importFormat, setImportFormat] = useState<ImportFormat>('citecraft-json');
  const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  // The references / output section opens by itself as soon as there is something to show (it used to stay closed after adding a source).
  const [toolsOpen, setToolsOpen] = useState(false);
  const hasReferences = references.length > 0;
  useEffect(() => {
    if (hasReferences) setToolsOpen(true);
  }, [hasReferences]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadCompleteRef = useRef(false);
  const supportsNarrative = style === 'apa' || style === 'chicago-author-date';

  useEffect(() => {
    let canPersist = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        canPersist = true;
        return;
      }
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(isReference)) {
        throw new Error('Saved CiteCraft data has an unexpected structure.');
      }
      setReferences(parsed);
      canPersist = true;
    } catch (loadError) {
      setStorageError(
        loadError instanceof Error
          ? `Could not read saved references: ${loadError.message} Add a source to replace the unreadable library.`
          : 'Could not read saved references. Add a source to replace the unreadable library.',
      );
    } finally {
      initialLoadCompleteRef.current = canPersist;
    }
  }, []);

  useEffect(() => {
    if (!initialLoadCompleteRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(references));
      setStorageError(null);
    } catch (saveError) {
      setStorageError(
        saveError instanceof Error
          ? `Browser storage is unavailable: ${saveError.message}`
          : 'Browser storage is unavailable; this session will not persist after closing.',
      );
    }
  }, [references]);

  useEffect(() => {
    if (!references.length) {
      setResult(null);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setBusy(true);
    setError(null);
    const mode = style === 'chicago-notes' ? 'note' : citationMode;
    fetch('/api/citecraft/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        references,
        style,
        citation_sequence: references.map((reference) => [
          { reference_id: reference.id, mode },
        ]),
      }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof payload.detail === 'string' ? payload.detail : typeof payload.error === 'string' ? payload.error : 'Citation generation failed.',
          );
        }
        if (current) setResult(payload as RenderResult);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        if (current) {
          setResult(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Citation service returned an unexpected error.',
          );
        }
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [references, style, citationMode]);

  useEffect(() => {
    if (references.length < 2) {
      setDuplicates([]);
      return;
    }
    const controller = new AbortController();
    fetch('/api/citecraft/duplicates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(references),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || payload.error || 'Duplicate check failed.');
        setDuplicates(payload.suggestions as DuplicateSuggestion[]);
      })
      .catch((duplicateError: unknown) => {
        if (duplicateError instanceof DOMException && duplicateError.name === 'AbortError') return;
        setError(
          duplicateError instanceof Error
            ? duplicateError.message
            : 'Could not check for possible duplicates.',
        );
      });
    return () => controller.abort();
  }, [references]);

  const visibleReferences = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return references
      .filter((reference) => {
        const haystack = [
          reference.title,
          reference.journal_title,
          reference.book_title,
          ...reference.authors.map(contributorLabel),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortBy === 'title') return left.title.localeCompare(right.title);
        if (sortBy === 'year') return (right.year || 0) - (left.year || 0);
        return references.indexOf(left) - references.indexOf(right);
      });
  }, [references, search, sortBy]);

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveReference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = editingId || window.crypto.randomUUID();
    const reference = createReference(draft, id);
    if (!reference.title) {
      setError('A title is required before adding this reference.');
      return;
    }
    initialLoadCompleteRef.current = true;
    setReferences((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? reference : item))
        : [...current, reference],
    );
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError(null);
  };

  const editReference = (reference: Reference) => {
    setDraft(toDraft(reference));
    setEditingId(reference.id);
    setError(null);
  };

  const removeReference = (id: string) => {
    setReferences((current) => current.filter((reference) => reference.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Copied to clipboard.');
      window.setTimeout(() => setCopyMessage(null), 1800);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? `Clipboard access failed: ${copyError.message}`
          : 'Clipboard access failed.',
      );
    }
  };

  const download = (filename: string, content: string, contentType: string, isBase64 = false) => {
    const bytes = isBase64 ? Uint8Array.from(atob(content), (character) => character.charCodeAt(0)) : null;
    const blob = bytes
      ? new Blob([bytes], { type: contentType })
      : new Blob([content], { type: `${contentType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportProject = async () => {
    if (!references.length) {
      setError('Add at least one reference before exporting.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/citecraft/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ references, style, format: exportFormat }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || 'Export failed.');
      download(
        filenameFromHeader(null, payload.filename),
        payload.content,
        payload.content_type,
        payload.encoding === 'base64',
      );
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const importProject = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/citecraft/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ format: importFormat, content: await file.text() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || 'Import failed.');
      const existingIds = new Set(references.map((reference) => reference.id));
      const incoming = (payload.references as Reference[]).map((reference) => {
        if (!existingIds.has(reference.id)) {
          existingIds.add(reference.id);
          return reference;
        }
        return { ...reference, id: window.crypto.randomUUID() };
      });
      initialLoadCompleteRef.current = true;
      setReferences((current) => [...current, ...incoming]);
      setCopyMessage(`Imported ${incoming.length} reference${incoming.length === 1 ? '' : 's'}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="citecraft-panel" aria-labelledby="citecraft-title">
      <details className="citecraft-disclosure" open>
        <summary className="citecraft-heading citecraft-toggle">
          <h3 id="citecraft-title">CiteCraft</h3>
        </summary>
        <p className="citecraft-intro">
          Build citations from your own source details. No lookup service or example output is used; references stay in this browser unless exported.
        </p>

        <label className="citecraft-field">
          <span>Citation style</span>
          <select value={style} onChange={(event) => setStyle(event.target.value as StyleId)}>
            {STYLE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        {supportsNarrative && (
          <label className="citecraft-field">
            <span>Citation form</span>
            <select
              value={citationMode}
              onChange={(event) => setCitationMode(event.target.value as 'parenthetical' | 'narrative')}
            >
              <option value="parenthetical">Parenthetical</option>
              <option value="narrative">Narrative author-date</option>
            </select>
          </label>
        )}
        {style === 'chicago-notes' && (
          <p className="citecraft-note">Chicago notes use full first notes and shortened repeat notes.</p>
        )}

        <details className="citecraft-form">
          <summary>{editingId ? 'Edit reference' : 'Add a reference'}</summary>
          <form onSubmit={saveReference}>
          <label className="citecraft-field">
            <span>Source type</span>
            <select
              value={draft.source_type}
              onChange={(event) => updateDraft('source_type', event.target.value as SourceType)}
            >
              {SOURCE_TYPES.map((source) => (
                <option key={source.id} value={source.id}>{source.label}</option>
              ))}
            </select>
          </label>
          <label className="citecraft-field">
            <span>Title *</span>
            <input
              required
              maxLength={1000}
              value={draft.title}
              onChange={(event) => updateDraft('title', event.target.value)}
            />
          </label>
          <label className="citecraft-field">
            <span>Subtitle</span>
            <input
              maxLength={500}
              value={draft.subtitle}
              onChange={(event) => updateDraft('subtitle', event.target.value)}
            />
          </label>
          <label className="citecraft-field">
            <span>Authors</span>
            <input
              placeholder="Rahman, Amina; World Research Group"
              value={draft.authors}
              onChange={(event) => updateDraft('authors', event.target.value)}
            />
            <small>Use Family, Given for personal names; enter non-Latin names as written.</small>
          </label>
          <label className="citecraft-field">
            <span>Editors</span>
            <input
              placeholder="Khan, Samira"
              value={draft.editors}
              onChange={(event) => updateDraft('editors', event.target.value)}
            />
          </label>
          <label className="citecraft-field">
            <span>Publication date</span>
            <input
              type="text"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={draft.publication_date}
              onChange={(event) => updateDraft('publication_date', event.target.value)}
            />
          </label>

          {draft.source_type === 'article-journal' && (
            <>
              <label className="citecraft-field"><span>Journal</span><input value={draft.journal_title} onChange={(event) => updateDraft('journal_title', event.target.value)} /></label>
              <div className="citecraft-inline-fields">
                <label className="citecraft-field"><span>Volume</span><input value={draft.volume} onChange={(event) => updateDraft('volume', event.target.value)} /></label>
                <label className="citecraft-field"><span>Issue</span><input value={draft.issue} onChange={(event) => updateDraft('issue', event.target.value)} /></label>
              </div>
              <div className="citecraft-inline-fields">
                <label className="citecraft-field"><span>Pages</span><input value={draft.pages} onChange={(event) => updateDraft('pages', event.target.value)} /></label>
                <label className="citecraft-field"><span>Article number</span><input value={draft.article_number} onChange={(event) => updateDraft('article_number', event.target.value)} /></label>
              </div>
              <label className="citecraft-field"><span>ISSN</span><input value={draft.issn} onChange={(event) => updateDraft('issn', event.target.value)} /></label>
            </>
          )}
          {draft.source_type === 'book' && (
            <>
              <label className="citecraft-field"><span>Publisher</span><input value={draft.publisher} onChange={(event) => updateDraft('publisher', event.target.value)} /></label>
              <label className="citecraft-field"><span>Edition</span><input value={draft.edition} onChange={(event) => updateDraft('edition', event.target.value)} /></label>
              <label className="citecraft-field"><span>ISBN</span><input value={draft.isbn} onChange={(event) => updateDraft('isbn', event.target.value)} /></label>
            </>
          )}
          {draft.source_type === 'chapter' && (
            <>
              <label className="citecraft-field"><span>Book title</span><input value={draft.book_title} onChange={(event) => updateDraft('book_title', event.target.value)} /></label>
              <label className="citecraft-field"><span>Publisher</span><input value={draft.publisher} onChange={(event) => updateDraft('publisher', event.target.value)} /></label>
              <label className="citecraft-field"><span>Chapter pages</span><input value={draft.pages} onChange={(event) => updateDraft('pages', event.target.value)} /></label>
              <label className="citecraft-field"><span>ISBN</span><input value={draft.isbn} onChange={(event) => updateDraft('isbn', event.target.value)} /></label>
            </>
          )}
          {draft.source_type === 'webpage' && (
            <>
              <label className="citecraft-field"><span>URL</span><input type="url" placeholder="https://" value={draft.url} onChange={(event) => updateDraft('url', event.target.value)} /></label>
              <label className="citecraft-field"><span>Accessed date</span><input placeholder="YYYY-MM-DD" value={draft.accessed_date} onChange={(event) => updateDraft('accessed_date', event.target.value)} /></label>
            </>
          )}
          {(draft.source_type === 'report' || draft.source_type === 'thesis') && (
            <>
              <label className="citecraft-field"><span>Institution</span><input value={draft.institution} onChange={(event) => updateDraft('institution', event.target.value)} /></label>
              {draft.source_type === 'report' && <label className="citecraft-field"><span>Report number</span><input value={draft.number} onChange={(event) => updateDraft('number', event.target.value)} /></label>}
            </>
          )}
          <details className="citecraft-extra-fields">
            <summary>Additional metadata</summary>
            <div className="citecraft-extra-grid">
              <label className="citecraft-field"><span>DOI</span><input placeholder="10.xxxx/..." value={draft.doi} onChange={(event) => updateDraft('doi', event.target.value)} /></label>
              {draft.source_type !== 'webpage' && (
                <label className="citecraft-field"><span>URL</span><input type="url" placeholder="https://" value={draft.url} onChange={(event) => updateDraft('url', event.target.value)} /></label>
              )}
              {draft.source_type !== 'webpage' && (
                <label className="citecraft-field"><span>Accessed date</span><input placeholder="YYYY-MM-DD" value={draft.accessed_date} onChange={(event) => updateDraft('accessed_date', event.target.value)} /></label>
              )}
              <label className="citecraft-field"><span>Abstract</span><textarea rows={4} maxLength={5000} value={draft.abstract} onChange={(event) => updateDraft('abstract', event.target.value)} /></label>
              <label className="citecraft-field"><span>Language</span><input maxLength={35} placeholder="en" value={draft.language} onChange={(event) => updateDraft('language', event.target.value)} /></label>
            </div>
          </details>
          {draft.source_type !== 'article-journal' && draft.source_type !== 'webpage' && (
            <label className="citecraft-field"><span>Publisher location (optional)</span><input value={draft.publisher_place} onChange={(event) => updateDraft('publisher_place', event.target.value)} /></label>
          )}
          {style === 'chicago-notes' && (
            <label className="citecraft-field"><span>Short title (optional)</span><input value={draft.short_title} onChange={(event) => updateDraft('short_title', event.target.value)} /></label>
          )}
          <div className="citecraft-form-actions">
            <button type="submit" className="citecraft-primary">{editingId ? 'Save changes' : 'Add to bibliography'}</button>
            {editingId && (
              <button
                type="button"
                className="citecraft-quiet"
                onClick={() => { setEditingId(null); setDraft(EMPTY_DRAFT); }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </details>

      <details className="citecraft-tools" open={toolsOpen} onToggle={(event) => setToolsOpen(event.currentTarget.open)}>
        <summary>Your references, import &amp; export ({references.length})</summary>
      <section className="citecraft-workspace" aria-label="Bibliography workspace">
        <div className="citecraft-workspace-heading">
          <h4>My references <span>{references.length}</span></h4>
          {references.length > 0 && (
            <button type="button" className="citecraft-quiet" onClick={() => setReferences([])}>
              Clear all
            </button>
          )}
        </div>
        <div className="citecraft-inline-fields">
          <label className="citecraft-field">
            <span className="sr-only">Search references</span>
            <input placeholder="Search title or author" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="citecraft-field">
            <span className="sr-only">Sort references</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'added' | 'title' | 'year')}>
              <option value="added">Added order</option>
              <option value="title">Title</option>
              <option value="year">Newest year</option>
            </select>
          </label>
        </div>
        {visibleReferences.length ? (
          <ul className="citecraft-reference-list">
            {visibleReferences.map((reference) => (
              <li key={reference.id}>
                <div>
                  <strong>{reference.title}</strong>
                  <span>{reference.year || 'No date'} · {SOURCE_TYPES.find((item) => item.id === reference.source_type)?.label}</span>
                </div>
                <div className="citecraft-item-actions">
                  <button type="button" onClick={() => editReference(reference)} aria-label={`Edit ${reference.title}`}>Edit</button>
                  <button type="button" onClick={() => removeReference(reference.id)} aria-label={`Delete ${reference.title}`}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="citecraft-empty">
            {references.length ? 'No references match this search.' : 'Add your first source to generate citations from your own metadata.'}
          </p>
        )}
      </section>

      <section className="citecraft-transfer" aria-label="Import and export">
        <label className="citecraft-field">
          <span>Import format</span>
          <select value={importFormat} onChange={(event) => setImportFormat(event.target.value as ImportFormat)}>
            <option value="citecraft-json">CiteCraft project JSON</option>
            <option value="csl-json">CSL JSON</option>
            <option value="bibtex">BibTeX</option>
            <option value="ris">RIS</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept=".json,.bib,.ris,.csv"
          aria-label="Choose a reference import file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importProject(file);
          }}
        />
        <button type="button" className="citecraft-quiet" onClick={() => fileInputRef.current?.click()}>
          Import references
        </button>
        <label className="citecraft-field">
          <span>Export format</span>
          <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
            <option value="citecraft-json">CiteCraft project JSON</option>
            <option value="csl-json">CSL JSON</option>
            <option value="bibtex">BibTeX</option>
            <option value="ris">RIS</option>
            <option value="csv">CSV</option>
            <option value="plain-text">Plain text bibliography</option>
            <option value="markdown">Markdown bibliography</option>
            <option value="html">HTML bibliography</option>
            <option value="docx">Word document (.docx)</option>
          </select>
        </label>
        <button type="button" className="citecraft-primary citecraft-export" disabled={busy || !references.length} onClick={() => void exportProject()}>
          Export bibliography / save project
        </button>
      </section>

      <section className="citecraft-results" aria-label="Generated citation output" aria-live="polite">
        <div className="citecraft-workspace-heading">
          <h4>Generated output</h4>
          {busy && <span className="citecraft-loading">Updating…</span>}
        </div>
        {error && <p className="citecraft-error" role="alert">{error}</p>}
        {storageError && <p className="citecraft-error" role="status">{storageError}</p>}
        {result && (
          <>
            <p className="citecraft-style-limit">{result.style_label}. {result.limitations}</p>
            {result.citations.map((citation, index) => (
              <div className="citecraft-output" key={`${references[index]?.id || index}-citation`}>
                <span>Citation {index + 1}</span>
                <p>{citation}</p>
                <button type="button" onClick={() => void copyText(citation)}>Copy</button>
                {references[index] && result.warnings[references[index].id]?.length > 0 && (
                  <ul className="citecraft-warnings">
                    {result.warnings[references[index].id].map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                )}
              </div>
            ))}
            <div className="citecraft-output">
              <span>Bibliography</span>
              <ol>
                {result.bibliography.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
              </ol>
              <button type="button" onClick={() => void copyText(result.bibliography.join('\n'))}>Copy bibliography</button>
            </div>
          </>
        )}
        {!references.length && !error && (
          <p className="citecraft-empty">No citation output yet. Results appear after you add a reference.</p>
        )}
      </section>

      {duplicates.length > 0 && (
        <section className="citecraft-duplicate-box" aria-label="Possible duplicate references">
          <h4>Possible duplicates</h4>
          <p>Suggestions only; no records were merged.</p>
          <ul>
            {duplicates.map((suggestion) => {
              const first = references.find((reference) => reference.id === suggestion.first_id);
              const second = references.find((reference) => reference.id === suggestion.second_id);
              return (
                <li key={`${suggestion.first_id}-${suggestion.second_id}`}>
                  {first?.title} / {second?.title}: {suggestion.reason}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {copyMessage && <p className="citecraft-status" role="status">{copyMessage}</p>}
      <p className="citecraft-footer">References stay in this browser unless you export them. Always check the output against the source and the current style guide.</p>
      </details>
      </details>
    </aside>
  );
}
