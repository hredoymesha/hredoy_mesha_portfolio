import { useEffect } from 'react';
import { caseStudies, type CaseStudy } from '../data/caseStudies';

const SITE = 'https://hredoymesha.com';

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** One case-study page, shown at /work/<slug>. */
export function CaseStudyPage({ study }: { study: CaseStudy }) {
  const index = caseStudies.findIndex((c) => c.slug === study.slug);
  const prev = caseStudies[(index - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(index + 1) % caseStudies.length];

  useEffect(() => {
    const url = `${SITE}/work/${study.slug}`;
    document.title = `${study.title} · Case study · MD Hredoy Mesha`;
    setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', study.metaDescription);
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url);
    setMeta('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m; }, 'content', url);
    setMeta('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m; }, 'content', `${study.title} · Case study`);
    setMeta('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m; }, 'content', study.metaDescription);
    window.scrollTo(0, 0);
  }, [study]);

  return (
    <div className="cs-page">
      <header className="cs-header">
        <div className="wrap cs-header-inner">
          <a className="cs-brand" href="/">Hredoy <span>Mesha</span></a>
          <a className="cs-back" href="/#work">Back to Selected Work</a>
        </div>
      </header>

      <main className="wrap cs-main">
        <article className="cs-article">
          <p className="cs-tag">{study.tag}</p>
          <h1 className="cs-title">{study.title}</h1>
          <p className="cs-summary">{study.summary}</p>

          <figure className="cs-figure">
            <img src={study.image} alt={study.imageAlt} decoding="async" />
          </figure>

          {study.sections.map((section) => (
            <section key={section.heading} className="cs-section">
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {study.note && <p className="cs-note">{study.note}</p>}

          {study.links.length > 0 && (
            <div className="cs-links">
              {study.links.map((l) => (
                <a key={l.href} className="pub-open-btn" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </article>

        <nav className="cs-pager" aria-label="Other case studies">
          <a href={`/work/${prev.slug}`}>
            <span>Previous</span>
            {prev.title}
          </a>
          <a href={`/work/${next.slug}`}>
            <span>Next</span>
            {next.title}
          </a>
        </nav>
      </main>

      <footer className="cs-footer">
        <div className="wrap">
          <a href="/">Back to the portfolio</a>
        </div>
      </footer>
    </div>
  );
}
