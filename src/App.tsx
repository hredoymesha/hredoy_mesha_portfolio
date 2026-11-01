import { lazy, Suspense, useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Download,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  BookOpen,
  Briefcase,
  Award,
  GraduationCap
} from 'lucide-react';
import { siteData } from './data/siteData';
import { HelsinkiDhakaNetworkCanvas } from './components/HelsinkiDhakaNetwork';
import { ContactSection } from './components/ContactSection';
import { CareerTimeline } from './components/CareerTimeline';
import { CiteCraftPanel } from './components/CiteCraftPanel';
/** "UTC+3" style label for a time zone, correct in summer and winter. */
function utcLabel(timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
  return (part?.value ?? '').replace('GMT', 'UTC') || 'UTC';
}

// The Living Globe section. Set to false to hide it; it is loaded lazily, so it costs nothing while hidden.
const SHOW_LIVING_GLOBE = true;
const LivingGlobe = lazy(() => import('./components/LivingGlobe/LivingGlobe').then((m) => ({ default: m.LivingGlobe })));

export default function App() {
  // Start from the theme the page already has (set before first paint by index.html), so the hero painting is drawn once, in the right mood
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showToTop, setShowToTop] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [contactTab, setContactTab] = useState<'direct' | 'anonymous'>('direct');
  const [currentTime, setCurrentTime] = useState<{ helsinki: string; dhaka: string }>({
    helsinki: '--:--',
    dhaka: '--:--'
  });

  // Language of the introduction (hero + About). Kept only in this browser; nothing is sent anywhere.
  const [introLang, setIntroLang] = useState<'en' | 'bn'>(() => {
    try {
      return localStorage.getItem('hm-lang') === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });
  const [introAnnounce, setIntroAnnounce] = useState('');
  const chooseIntroLang = (next: 'en' | 'bn') => {
    setIntroLang(next);
    setIntroAnnounce(next === 'bn' ? siteData.introBn.announce : 'Introduction shown in English.');
    try {
      localStorage.setItem('hm-lang', next);
    } catch {
      // Ignored in restricted environments
    }
  };
  const bn = introLang === 'bn';
  const intro = {
    lead: bn ? siteData.introBn.headline.lead : siteData.profile.headline.lead,
    em: bn ? siteData.introBn.headline.em : siteData.profile.headline.em,
    summary: bn ? siteData.introBn.summary : [siteData.profile.summary],
    availability: bn ? siteData.introBn.availability : siteData.profile.availability,
    about: bn ? siteData.introBn.aboutParagraphs : siteData.about.paragraphs
  };
  const bnAttr = bn ? { lang: 'bn' as const } : {};

  const handleOpenAnonymous = () => {
    setContactTab('anonymous');
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initialize theme from html attribute or localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = prefersDark ? 'dark' : 'light';
        setTheme(initial);
        document.documentElement.setAttribute('data-theme', initial);
      }
    } catch {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Ignored in restricted environments
    }
  };

  // Dual live clocks
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      try {
        const helsinki = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Europe/Helsinki'
        }).format(now);

        const dhaka = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Dhaka'
        }).format(now);

        setCurrentTime({ helsinki, dhaka });
      } catch {
        const fallback = now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });
        setCurrentTime({ helsinki: fallback, dhaka: fallback });
      }
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll listener for progress bar and back-to-top
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) {
        setScrollProgress(window.scrollY / total);
      }
      setShowToTop(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Copy email handler
  const handleCopyEmail = async () => {
    const email = siteData.profile.links.email;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopiedEmail(true);
      showToast(`Email copied: ${email}`);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      showToast(email);
    }
  };

  // Save Contact Card (vCard generator)
  const handleDownloadVCard = () => {
    const p = siteData.profile;
    const l = p.links;
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Mesha;MD Hredoy;;;',
      `FN:${p.name}`,
      'TITLE:Data & IT Professional, Independent Researcher',
      `EMAIL;TYPE=INTERNET:${l.email}`,
      'ADR;TYPE=home:;;;Helsinki;;;Finland',
      'ADR;TYPE=home:;;;Dhaka;;;Bangladesh',
      `URL:${l.linkedin}`,
      `URL:${l.github}`,
      `URL:${l.orcid}`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MD-Hredoy-Mesha.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Contact card (vCard) downloaded');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-[var(--accent)] z-50 transition-all duration-75"
        style={{ width: `${Math.min(100, Math.max(0, scrollProgress * 100))}%` }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-3 gap-y-1 min-h-16 py-1">
          <a href="#top" className="shrink-0 whitespace-nowrap text-xl font-bold tracking-tight">
            Hredoy <span className="text-[var(--accent)]">Mesha</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <a
              href="#about"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              About
            </a>
            <a
              href="#research"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Research
            </a>
            <a
              href="#experience"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Experience
            </a>
            <a
              href="#work"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Work
            </a>
            <a
              href="#skills"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Skills
            </a>
            <a
              href="#education"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Education
            </a>
            <a
              href="#contact"
              className="px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] rounded-md transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAnonymous}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line-strong)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <span>Anonymous Note</span>
            </button>

            <button
              onClick={toggleTheme}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--panel-2)] transition-colors"
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--panel-2)] transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-b border-[var(--line)] bg-[var(--bg)] px-6 py-4 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenAnonymous();
              }}
              type="button"
              className="text-left py-2 text-sm font-semibold text-[var(--accent)] border-b border-[var(--line)] pb-2"
            >
              🔒 Send Anonymous Note
            </button>
            {[
              ['About', '#about'],
              ['Research', '#research'],
              ['Experience', '#experience'],
              ['Work', '#work'],
              ['Skills', '#skills'],
              ['Education', '#education'],
              ['Contact', '#contact']
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-base font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-12 md:pt-20 pb-12">
          <div className="wrap grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Hero Left Content (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Language of the introduction */}
              <div className="lang-switch" role="group" aria-label="Introduction language: English or Bengali">
                <span className="lang-label" aria-hidden="true">Intro</span>
                <button type="button" className="lang-btn" lang="en" aria-pressed={!bn} onClick={() => chooseIntroLang('en')}>
                  English
                </button>
                <button type="button" className="lang-btn" lang="bn" aria-label="বাংলা (Bengali)" aria-pressed={bn} onClick={() => chooseIntroLang('bn')}>
                  বাংলা
                </button>
                <span className="sr-only" role="status" aria-live="polite">{introAnnounce}</span>
              </div>

              {/* Profile Kicker */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)] mb-5 font-[var(--ui)]">
                <span className="font-semibold text-[var(--ink)]">{siteData.profile.name}</span>
                <span className="text-[var(--accent)] font-bold">/</span>
                <span>{siteData.profile.role}</span>
                <span className="text-[var(--accent)] font-bold">/</span>
                <span>{siteData.profile.bases.join(' · ')}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--ink)] leading-[1.12]">
                {intro.lead}{' '}
                <span className="text-[var(--accent)] block sm:inline">
                  {intro.em}
                </span>
              </h1>

              {/* Lead Summary */}
              {intro.summary.map((para, i) => (
                <p key={i} {...bnAttr} className="mt-6 text-lg sm:text-xl text-[var(--muted)] leading-relaxed max-w-2xl font-[var(--body)]">
                  {para}
                </p>
              ))}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-4 font-[var(--ui)]">
                <a
                  href="#work"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-ink)] text-[var(--on-accent)] text-sm font-semibold transition-colors shadow-sm"
                >
                  See the work
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--line-strong)] hover:border-[var(--accent)] text-[var(--ink)] hover:text-[var(--accent)] text-sm font-semibold transition-colors"
                >
                  Get in touch
                </a>
              </div>
            </div>

            {/* Hero Right Visuals & Info Panel (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Hero artwork, painted by code: Night Mode = dusk scene, Day Mode = late-afternoon scene */}
              <div className="flex flex-col gap-2">
                <HelsinkiDhakaNetworkCanvas theme={theme} />
              </div>

              {/* Live Info Card */}
              <aside className="print-hide border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 shadow-sm">
                {/* Clocks */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))] gap-4 pb-4 border-b border-[var(--line)]">
                  <div className="text-center">
                    <span className="block font-[var(--display)] text-2xl font-bold tabular-nums text-[var(--ink)]">
                      {currentTime.helsinki}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[var(--faint)] font-[var(--ui)]">
                      Helsinki
                    </span>
                  </div>
                  <div className="text-center border-l border-[var(--line)] pl-4">
                    <span className="block font-[var(--display)] text-2xl font-bold tabular-nums text-[var(--ink)]">
                      {currentTime.dhaka}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[var(--faint)] font-[var(--ui)]">
                      Dhaka
                    </span>
                  </div>
                </div>

                {/* Availability status */}
                <p className="text-xs text-center text-[var(--muted)] mt-6 pt-1 leading-relaxed font-[var(--ui)]">
                  {intro.availability}
                </p>

                {/* Social links */}
                <div className="flex flex-wrap justify-center gap-4 text-sm mt-3 font-[var(--ui)]">
                  <a
                    href={siteData.profile.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="lnk lnk-target font-medium"
                  >
                    LinkedIn
                  </a>
                  <a
                    href={siteData.profile.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="lnk lnk-target font-medium"
                  >
                    GitHub
                  </a>
                  <a
                    href={siteData.profile.links.orcid}
                    target="_blank"
                    rel="noreferrer"
                    className="lnk lnk-target font-medium"
                  >
                    ORCID
                  </a>
                </div>

                {/* CV buttons: open a private Google Drive file (visitors request access). No CV file is stored in this project. */}
                <div className="mt-4 pt-4 border-t border-[var(--line)] flex flex-col items-center gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {siteData.profile.cv.map((c) =>
                      c.href ? (
                        <a
                          key={c.label}
                          href={c.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cv="drive"
                          aria-describedby="cv-note"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line-strong)] hover:border-[var(--accent)] text-xs font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          {c.label}
                          <span className="sr-only"> (opens Google Drive in a new tab)</span>
                        </a>
                      ) : (
                        <button
                          key={c.label}
                          type="button"
                          disabled
                          aria-disabled="true"
                          aria-describedby="cv-note"
                          data-cv="inactive"
                          className="cv-inactive inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--line-strong)] text-xs font-medium text-[var(--muted)] cursor-not-allowed"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {c.label}
                          <span className="text-[10px] uppercase tracking-wider text-[var(--faint)]">Soon</span>
                        </button>
                      )
                    )}
                  </div>
                  <p id="cv-note" className="text-[11px] text-[var(--muted)] text-center leading-snug font-[var(--ui)]">
                    {siteData.profile.cvNote}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* PILLARS BAND */}
        <section className="border-y border-[var(--line)] bg-[var(--panel)] py-8">
          <div className="wrap">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {siteData.pillars.map((pillar) => (
                <div key={pillar.title} className="flex flex-col">
                  <h3 className="text-lg font-bold text-[var(--ink)] mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[var(--ui)] leading-relaxed">
                    {pillar.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">About</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
              {/* Bio Prose (7 cols) */}
              <div className="about-prose lg:col-span-7">
                {intro.about.map((para, i) => (
                  <p
                    key={i}
                    {...bnAttr}
                    className="text-lg sm:text-[19px] leading-[1.85] text-[var(--ink)]"
                  >
                    {para}
                  </p>
                ))}
              </div>

              {/* Research Interests (5 cols) */}
              <div className="lg:col-span-5 bg-[var(--panel)] border border-[var(--line)] rounded-2xl p-6">
                <h3 className="research-interests-title text-sm uppercase tracking-widest text-[var(--ink)] mb-4">
                  Research Interests
                </h3>
                <ul className="space-y-3 font-[var(--body)]">
                  {siteData.about.interests.map((interest, i) => (
                    <li
                      key={i}
                      className="text-base text-[var(--ink)] flex items-start gap-2.5 pb-2.5 border-b border-[var(--line)] last:border-0 last:pb-0"
                    >
                      <span className="text-[var(--accent)] font-serif font-bold text-lg leading-none">
                        —
                      </span>
                      <span>{interest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* RESEARCH & PUBLICATIONS SECTION */}
        <section id="research" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(290px,3fr)] gap-8 items-start">
              <div className="min-w-0">
                <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold">Publications &amp; Research</h2>
                  </div>
                </div>

                {/* Academic Publication Cards Stack */}
                <div className="grid grid-cols-1 gap-6">
                  {siteData.publications.map((pub, idx) => (
                    <article
                      key={idx}
                      className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 sm:p-7 md:p-8 hover:border-[var(--line-strong)] transition-colors duration-200 shadow-sm flex flex-col justify-between group not-italic"
                    >
                      <div>
                        {/* Metadata Header Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 mb-4 border-b border-[var(--line)] not-italic">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-[var(--ui)] not-italic">
                            <span className="font-semibold uppercase tracking-wider text-[var(--accent)] not-italic">
                              {pub.type}
                            </span>
                            <span className="text-[var(--faint)]">·</span>
                            <span className="font-mono text-[var(--muted)] not-italic">{pub.year}</span>
                          </div>
                          {pub.doi ? (
                            <span className="max-w-full break-all text-xs font-mono text-[var(--muted)] bg-[var(--panel-2)] px-2.5 py-1 rounded-md border border-[var(--line)] not-italic">
                              DOI: {pub.doi}
                            </span>
                          ) : (
                            <span className="text-xs font-[var(--ui)] text-[var(--faint)] not-italic">
                              Manuscript / Article
                            </span>
                          )}
                        </div>

                        {/* Title Zone */}
                        <h3 className="text-xl sm:text-2xl font-bold font-serif text-[var(--ink)] leading-snug not-italic">
                          {pub.bilingualTitle ? (
                            <div className="not-italic">
                              {pub.link ? (
                                <a
                                  href={pub.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-start gap-2 group-hover:text-[var(--accent)] transition-colors not-italic"
                                >
                                  <span
                                    lang="bn"
                                    className="font-['Noto_Sans_Bengali'] font-medium text-lg sm:text-xl leading-[1.45] text-[var(--ink)] block not-italic"
                                  >
                                    {pub.bilingualTitle.bn}
                                  </span>
                                  <ExternalLink className="w-4 h-4 mt-1 text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                                </a>
                              ) : (
                                <span
                                  lang="bn"
                                  className="font-['Noto_Sans_Bengali'] font-medium text-lg sm:text-xl leading-[1.45] text-[var(--ink)] block not-italic"
                                >
                                  {pub.bilingualTitle.bn}
                                </span>
                              )}
                              <div className="mt-1.5 text-xs sm:text-sm font-sans not-italic text-[var(--muted)] flex items-baseline gap-2">
                                <span className="text-[11px] font-sans uppercase tracking-widest text-[var(--faint)] font-semibold shrink-0 not-italic">
                                  EN:
                                </span>
                                <span className="not-italic font-normal pub-title-font">{pub.bilingualTitle.en}</span>
                              </div>
                            </div>
                          ) : pub.link ? (
                            <a
                              href={pub.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-start gap-2 group-hover:text-[var(--accent)] transition-colors not-italic"
                            >
                              <span className="not-italic">{pub.title}</span>
                              <ExternalLink className="w-4 h-4 mt-1 text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                            </a>
                          ) : (
                            <span className="not-italic">{pub.title}</span>
                          )}
                        </h3>

                        {/* Summary / Abstract */}
                        <p className="mt-3.5 text-base text-[var(--ink)] opacity-90 leading-relaxed font-[var(--body)] text-justify-body not-italic">
                          {pub.desc}
                        </p>
                      </div>

                      {/* Card Action Footer: external link only, no duplicate bottom DOI */}
                      {pub.link && (
                        <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-center justify-end text-xs font-[var(--ui)] not-italic">
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline ml-auto not-italic"
                          >
                            <span className="not-italic">Open Publication</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
              <CiteCraftPanel />
            </div>
          </div>
        </section>

        {/* EXPERIENCE SECTION */}
        <section id="experience" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Experience</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,70fr)_minmax(0,30fr)] gap-8 items-start">
            <div className="divide-y divide-[var(--line)] border-t border-b border-[var(--line)]">
              {siteData.experience.map((xp, idx) => (
                <div
                  key={idx}
                  className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8"
                >
                  <div className="md:col-span-3 font-[var(--ui)]">
                    <span className="text-sm font-semibold text-[var(--muted)] block">
                      {xp.when}
                    </span>
                    <span className="text-xs text-[var(--faint)] block mt-0.5">
                      {xp.place}
                    </span>
                  </div>
                  <div className="md:col-span-9 flex flex-col">
                    <h3 className="text-xl md:text-2xl font-bold text-[var(--ink)]">
                      {xp.role}{' '}
                      <span className="text-[var(--accent)] font-normal font-serif">
                        — {xp.org}
                      </span>
                    </h3>
                    {xp.impact && (
                      <p className="mt-2 text-base text-[var(--ink)] font-medium">
                        {xp.impact}
                      </p>
                    )}
                    <ul className="mt-3 space-y-2 font-[var(--ui)] text-sm text-[var(--muted)]">
                      {xp.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2.5">
                          <span className="text-[var(--faint)] mt-1.5 leading-none">—</span>
                          <span className="text-justify-body">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <CareerTimeline />
            </div>
          </div>
        </section>

        {/* SELECTED WORK SECTION */}
        <section id="work" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Selected Work</h2>
              <p className="mt-2 text-base text-[var(--muted)] font-[var(--ui)]">
                Products, tooling, and analytics — code and write-ups linked where public.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {siteData.work.map((w, idx) => (
                <article
                  key={idx}
                  className="flex flex-col border border-[var(--line)] rounded-2xl bg-[var(--panel)] overflow-hidden shadow-sm hover:border-[var(--accent)] transition-all duration-200 group"
                >
                  {/* Media container */}
                  <div className="aspect-[16/10] bg-[var(--panel-2)] overflow-hidden relative">
                    <img
                      src={w.img}
                      alt={w.imgAlt}
                      className="w-full h-full object-cover object-top transform-gpu backface-hidden [image-rendering:auto] group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[var(--faint)] font-semibold font-[var(--ui)] mb-2">
                      <span>{w.tag}</span>
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--ink)] mb-2 leading-snug break-words">
                      {w.title}
                    </h3>

                    <p className="text-sm text-[var(--muted)] leading-relaxed font-[var(--ui)] flex-1">
                      {w.desc}
                    </p>

                    {w.link && (
                      <div className="mt-4 pt-4 border-t border-[var(--line)]">
                        <a
                          href={w.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)] font-[var(--ui)] transition-colors"
                        >
                          {w.linkText || 'Open'}
                          <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES / SKILLS SECTION */}
        <section id="skills" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Capabilities</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {siteData.skills.map((cat) => (
                <div key={cat.title} className="flex flex-col">
                  <h3 className="text-xs uppercase tracking-widest font-semibold text-[var(--accent)] mb-4 font-[var(--ui)]">
                    {cat.title}
                  </h3>
                  <ul className="space-y-2.5 font-[var(--ui)] text-sm">
                    {cat.items.map((it) => (
                      <li key={it.name} className="flex items-center justify-between text-[var(--ink)]">
                        <span>{it.name}</span>
                        {it.level && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                            {it.level}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EDUCATION & ACADEMIC SECTION */}
        <section id="education" className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="wrap">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Education &amp; Academic</h2>
            </div>

            {/* Education & Academic Cards (2x2 Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {/* Row 1, Card 1: Master's Degree */}
              <article className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors">
                <div>
                  <div className="flex items-center justify-between text-xs font-[var(--ui)] text-[var(--faint)] uppercase tracking-wider font-semibold mb-3.5">
                    <span>Degree · Master's</span>
                    <span>2021 – 2023</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug mb-5 sm:mb-6">
                    Master's in <span className="text-[var(--accent)]">{siteData.education.degrees[0].title}</span> (MSc)
                  </h3>
                  <p className="edu-meta text-xs font-[var(--ui)] text-[var(--muted)] text-left">
                    {siteData.education.degrees[0].org} · {siteData.education.degrees[0].place}
                  </p>
                  <p className="text-base text-[var(--ink)] leading-[1.65] text-left">
                    {siteData.education.degrees[0].about}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--line)]">
                  <p className="text-sm text-[var(--muted)] font-[var(--ui)] leading-[1.65] text-left">
                    <strong className="text-[var(--accent)] uppercase tracking-wider text-xs block mb-1.5">
                      Key Achievements:
                    </strong>
                    {siteData.education.degrees[0].achievement}
                  </p>
                </div>
              </article>

              {/* Row 1, Card 2: Bachelor's Degree */}
              <article className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors">
                <div>
                  <div className="flex items-center justify-between text-xs font-[var(--ui)] text-[var(--faint)] uppercase tracking-wider font-semibold mb-3.5">
                    <span>Degree · Bachelor's</span>
                    <span>2016 – 2020</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug mb-5 sm:mb-6">
                    Bachelor of <span className="text-[var(--accent)]">{siteData.education.degrees[1].title}</span>
                  </h3>
                  <p className="edu-meta text-xs font-[var(--ui)] text-[var(--muted)] text-left">
                    {siteData.education.degrees[1].org} · {siteData.education.degrees[1].place}
                  </p>
                  <p className="text-base text-[var(--ink)] leading-[1.65] text-left">
                    {siteData.education.degrees[1].about}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--line)]">
                  <p className="text-sm text-[var(--muted)] font-[var(--ui)] leading-[1.65] text-left">
                    <strong className="text-[var(--accent)] uppercase tracking-wider text-xs block mb-1.5">
                      Key Achievements:
                    </strong>
                    {siteData.education.degrees[1].achievement}
                  </p>
                </div>
              </article>

              {/* Row 2, Card 3: Student Tutor (Academic Activity) */}
              <article className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors">
                <div>
                  <div className="flex items-center justify-between text-xs font-[var(--ui)] text-[var(--faint)] uppercase tracking-wider font-semibold mb-3.5">
                    <span>Academic Activity</span>
                    <span>{siteData.education.activities[0].when}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug mb-5 sm:mb-6">
                    {siteData.education.activities[0].role}{' '}
                    <span className="text-[var(--accent)] font-normal font-serif">
                      — {siteData.education.activities[0].org}
                    </span>
                  </h3>
                  <p className="edu-meta text-xs font-[var(--ui)] text-[var(--muted)] text-left">
                    Åbo Akademi University · Turku, Finland
                  </p>
                  <p className="text-base text-[var(--muted)] leading-[1.65] text-left font-[var(--ui)]">
                    {siteData.education.activities[0].desc}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--line)]">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--faint)] font-[var(--ui)]">
                    Mentorship &amp; International Student Integration
                  </span>
                </div>
              </article>

              {/* Row 2, Card 4: Project Manager (VRGP Academic Project) */}
              <article className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-[var(--line-strong)] transition-colors">
                <div>
                  <div className="flex items-center justify-between text-xs font-[var(--ui)] text-[var(--faint)] uppercase tracking-wider font-semibold mb-3.5">
                    <span>Academic Project</span>
                    <span>{siteData.education.project.when}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug mb-5 sm:mb-6">
                    {siteData.education.project.role}{' '}
                    <span className="text-[var(--accent)] font-normal font-serif">
                      — {siteData.education.project.title}
                    </span>
                  </h3>
                  <p className="edu-meta text-xs font-[var(--ui)] text-[var(--muted)] text-left">
                    {siteData.education.project.org} · ICT Showroom 2022
                  </p>
                  <p className="text-base text-[var(--muted)] leading-[1.65] text-left font-[var(--ui)]">
                    {siteData.education.project.desc}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {siteData.education.project.awards.map((award) => (
                      <span
                        key={award}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full font-[var(--ui)]"
                      >
                        <Award className="w-3 h-3" />
                        {award}
                      </span>
                    ))}
                  </div>
                  {siteData.education.project.link && (
                    <a
                      href={siteData.education.project.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline font-[var(--ui)] whitespace-nowrap"
                    >
                      {siteData.education.project.linkText}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </article>
            </div>

            {/* Certifications */}
            <div className="mt-12 pt-8 border-t border-[var(--line)]">
              <h3 className="text-xs uppercase tracking-widest font-semibold text-[var(--faint)] mb-6 font-[var(--ui)]">
                Certifications &amp; Courses
              </h3>

              {siteData.certificationGroups ? (
                <div className="space-y-8">
                  {siteData.certificationGroups.map((group) => (
                    <div key={group.groupTitle} className="border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--line)]">
                        <h4 className="text-sm font-semibold font-[var(--ui)] text-[var(--ink)]">
                          {group.groupTitle}
                        </h4>
                        <span className="text-[11px] font-[var(--ui)] text-[var(--faint)]">
                          {group.items.length} items
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-[var(--ui)] text-xs">
                        {group.items.map((item) => (
                          <div
                            key={item.name}
                            className="flex flex-row items-center justify-between gap-2 p-3 rounded-xl bg-[var(--panel-2)]/60 border border-[var(--line)]"
                          >
                            <span className="font-medium text-[var(--ink)] text-sm">
                              {item.name}
                            </span>
                            <span className="text-[var(--muted)] font-mono text-xs shrink-0 font-medium bg-[var(--panel)] px-2 py-0.5 rounded border border-[var(--line)]">
                              {item.year}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                  {siteData.certifications.map((cert) => (
                    <div
                      key={cert.name}
                      className="flex items-center justify-between py-2.5 border-b border-[var(--line)] text-sm font-[var(--ui)]"
                    >
                      <span className="text-[var(--ink)] font-medium">{cert.name}</span>
                      <span className="text-xs text-[var(--faint)]">{cert.year}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* THE LIVING GLOBE (see SHOW_LIVING_GLOBE) */}
        {SHOW_LIVING_GLOBE && (
          <section id="globe" className="py-16 md:py-24">
            <div className="wrap">
              <Suspense fallback={null}>
                <LivingGlobe />
              </Suspense>
            </div>
          </section>
        )}

        {/* CONTACT SECTION (Balanced 7:5 2-Column Responsive Architecture) */}
        <section id="contact" className="py-16 md:py-24">
          <div className="wrap">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Column (7 cols): Section Lead & Compact Contact Form */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold font-serif text-[var(--ink)] mb-3">
                    Let's talk.
                  </h2>
                  <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed font-[var(--body)]">
                    Open to research collaboration, doctoral opportunities, data &amp; IT roles, and public security or AI governance research.
                  </p>
                  <p className="hidden print:block mt-2 text-base">E-mail: {siteData.profile.links.email}</p>
                </div>

                <ContactSection
                  email={siteData.profile.links.email}
                  activeTab={contactTab}
                  onTabChange={(t) => setContactTab(t)}
                />
              </div>

              {/* Right Column (5 cols): LinkedIn Card, Dual Clocks & Direct Delivery, Quick Topics */}
              <div className="lg:col-span-5 flex flex-col gap-5 mt-8 lg:mt-32">
                {/* Point 6: Dedicated Professional LinkedIn Card */}
                <aside className="print-hide border border-[var(--line-strong)] rounded-2xl bg-[var(--panel)] p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-[#0a66c2]/10 text-[#0a66c2] dark:text-[#70b5f9] flex items-center justify-center font-bold text-base">
                        in
                      </span>
                      <div>
                        <h4 className="text-sm font-bold font-[var(--ui)] text-[var(--ink)]">
                          LinkedIn Professional
                        </h4>
                        <span className="text-[11px] font-mono text-[var(--faint)]">
                          @meshahredoy
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium font-[var(--ui)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <a
                    href={siteData.profile.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-linkedin-light inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold font-[var(--ui)] transition-colors"
                  >
                    <span>Connect on LinkedIn</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </aside>

                {/* Point 8: Live Dual Working Timezones & Direct Delivery Panel */}
                <aside className="print-hide border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 shadow-sm">
                  <span className="block text-xs uppercase tracking-widest font-semibold text-[var(--faint)] mb-4 font-[var(--ui)]">
                    Dual Working Timezones
                  </span>

                  <div className="grid grid-cols-2 gap-3 pb-4 mb-4 border-b border-[var(--line)]">
                    {/* Helsinki Digital Clock */}
                    <div className="text-center">
                      <div className="inline-flex max-w-full items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--panel-2)] border border-[var(--line)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="font-mono text-sm font-bold tabular-nums text-[var(--ink)] tracking-wider">
                          {currentTime.helsinki}
                        </span>
                      </div>
                      <span className="mt-1.5 block text-[10px] uppercase tracking-widest text-[var(--faint)] font-[var(--ui)]">
                        Helsinki ({utcLabel('Europe/Helsinki')})
                      </span>
                    </div>
                    {/* Dhaka Digital Clock */}
                    <div className="text-center">
                      <div className="inline-flex max-w-full items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--panel-2)] border border-[var(--line)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="font-mono text-sm font-bold tabular-nums text-[var(--ink)] tracking-wider">
                          {currentTime.dhaka}
                        </span>
                      </div>
                      <span className="mt-1.5 block text-[10px] uppercase tracking-widest text-[var(--faint)] font-[var(--ui)]">
                        Dhaka ({utcLabel('Asia/Dhaka')})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 font-[var(--ui)]">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyEmail}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-ink)] text-[var(--on-accent)] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Copied' : 'Copy email'}</span>
                      </button>

                      <button
                        onClick={handleDownloadVCard}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--line-strong)] hover:border-[var(--accent)] text-[var(--ink)] hover:text-[var(--accent)] text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save contact card</span>
                      </button>
                    </div>
                  </div>
                </aside>

                {/* Conversation Topics & Location Bases Card */}
                <aside className="print-hide border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 shadow-sm font-[var(--ui)]">
                  <span className="block text-xs uppercase tracking-widest font-semibold text-[var(--faint)] mb-3">
                    Start a conversation about
                  </span>

                  <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {siteData.contact.quickTopics?.map((topic) => (
                      <a
                        key={topic.label}
                        href={`mailto:${siteData.profile.links.email}?subject=${encodeURIComponent(topic.subject)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent)] text-[var(--ink)] font-medium transition-colors"
                      >
                        {topic.icon === 'graduation-cap' && <GraduationCap className="w-3 h-3 text-[var(--accent)]" />}
                        {topic.icon === 'briefcase' && <Briefcase className="w-3 h-3 text-[var(--accent)]" />}
                        {topic.icon === 'book-open' && <BookOpen className="w-3 h-3 text-[var(--accent)]" />}
                        <span>{topic.label}</span>
                      </a>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[11px] text-[var(--muted)]">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)]/60 font-medium"
                    >
                      <MapPin className="w-3 h-3 text-[var(--accent)]" />
                      <span>Helsinki, Finland</span>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--panel-2)]/60 font-medium ml-auto"
                    >
                      <MapPin className="w-3 h-3 text-[var(--accent)]" />
                      <span>Dhaka, Bangladesh</span>
                    </span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--line)] py-8 font-[var(--ui)] text-xs text-[var(--faint)]">
        <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} {siteData.profile.name} · Helsinki · Dhaka
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[var(--muted)]">
            <a
              href={siteData.profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--accent)] transition-colors"
            >
              LinkedIn
            </a>
            <a
              href={siteData.profile.links.github}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--accent)] transition-colors"
            >
              GitHub
            </a>
            <a
              href={siteData.profile.links.orcid}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--accent)] transition-colors"
            >
              ORCID
            </a>
            <a
              href={`mailto:${siteData.profile.links.email}`}
              className="hover:text-[var(--accent)] transition-colors"
            >
              Email
            </a>
          </div>
        </div>
      </footer>


      {/* Back to top button */}
      {showToTop && (
        <button
          onClick={scrollToTop}
          type="button"
          aria-label="Back to top"
          className="fixed bottom-6 right-6 w-11 h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--ink)] shadow-md flex items-center justify-center hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all z-30"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Toast popup */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 rounded-xl shadow-xl text-sm font-[var(--ui)] font-medium z-50 animate-bounce"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
