import { useEffect } from 'react';

/** Shown for any address other than the home page. The server also answers these addresses with status 404. */
export function NotFound() {
  useEffect(() => {
    document.title = 'Page not found · Hredoy Mesha';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => {
      robots.remove();
    };
  }, []);

  return (
    <main className="not-found">
      <p className="not-found-code" aria-hidden="true">404</p>
      <h1>This page does not exist</h1>
      <p className="not-found-text">The address may be mistyped, or the page may have moved. The portfolio, research and contact form are all on the home page.</p>
      <a className="not-found-link" href="/">Go to the home page</a>
    </main>
  );
}
