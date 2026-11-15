import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {NotFound} from './components/NotFound.tsx';
import {CaseStudyPage} from './components/CaseStudyPage.tsx';
import {findCaseStudy} from './data/caseStudies.ts';
import './index.css';

// Pages: the home page, one case-study page for each Selected Work item (/work/<slug>), and a "page not found" screen for anything else.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const slug = path.startsWith('/work/') ? path.slice('/work/'.length) : '';
const study = slug ? findCaseStudy(slug) : undefined;

createRoot(document.getElementById('root')!).render(
  path === '/' || path === '/index.html' ? <App /> : study ? <CaseStudyPage study={study} /> : <NotFound />
);
