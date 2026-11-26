/**
 * Case-study pages for the Selected Work items. Each page lives at /work/<slug>.
 * Keep the slugs in step with CASE_STUDY_PATHS in server/app.ts; a test checks that they match.
 */
export interface CaseSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface CaseStudy {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  metaDescription: string;
  image: string;
  imageAlt: string;
  sections: CaseSection[];
  links: { label: string; href: string }[];
  note?: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'devforge',
    title: 'DevForge — Web Dev Workbench',
    tag: 'Browser extension',
    summary:
      'A local-first web development workbench that lives in the side panel of Chrome. It sits next to the page you are working on. Everything runs in your browser, with no accounts, servers or analytics.',
    metaDescription:
      'Case study: DevForge, a privacy-first Chrome extension (Manifest V3) that inspects, edits, audits and exports web interfaces. Everything runs locally in the browser.',
    image: '/assets/work-devforge.webp',
    imageAlt: 'Preview of the DevForge — Web Dev Workbench browser extension.',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          "DevForge gives you an inspector, a network layer you can intercept and rewrite, Core Web Vitals profiling, a DOM mutation timeline, storage editing and design-token extraction, all in one side panel next to the page you are working on."
        ]
      },
      {
        heading: 'Why it exists',
        paragraphs: [
          'Chrome DevTools is the reference, and DevForge does not try to replace it. It covers the work that DevTools makes slow: mocking an API response without a proxy, seeing which element caused your LCP, exporting a component with its computed styles, or turning a site\'s colours into design tokens.'
        ]
      },
      {
        heading: 'What it does',
        bullets: [
          'The inspector picks an element and shows its DOM tree, selectors, box model and accessibility information. CSS edits are checked before they are applied.',
          'The tokens panel reads colours, type scale, spacing, radii and shadows from computed styles and exports them as CSS variables, SCSS, W3C design-token JSON or a Tailwind theme.',
          'The network panel captures fetch, XHR, WebSocket, EventSource and sendBeacon calls. It has filters, a waterfall, timing phases, copy as cURL or fetch, and HAR 1.2 export.',
          'Interception rules can add latency, set request headers, block a request, mock a response or redirect. They are saved between sessions.',
          'The performance panel shows LCP, CLS, INP, FCP and TTFB, each linked to the element behind it. A mutation timeline lists DOM changes with their old and new values.',
          'An audit runs accessibility, performance, script and responsive checks only when you ask. A separate security checker is meant for sites you own or have permission to test.',
          'The storage panel edits localStorage, sessionStorage, cookies and IndexedDB. The data panel pulls links, images, tables and forms from a page into CSV, JSON, Markdown or HTML.',
          'Export saves part of a page as a ZIP with its HTML, CSS and assets, or as a React, Vue or Web Component. Recreate rebuilds an element from its computed styles.',
          'A workspace keeps the things you save from the other panels, in the browser.'
        ]
      },
      {
        heading: 'How it is built',
        bullets: [
          'A Manifest V3 extension for Chrome 116 or newer. It asks for the least access it needs, and it only injects code into a page when you use a tool on that page.',
          'The workbench is a side panel made of classic scripts, with one file per panel. A page agent is injected on demand, and network capture runs in the page itself so it can wrap fetch and XHR.',
          'Capture is guarded by a random 256-bit secret handed to the extension at page start, so page scripts cannot read the capture log or change its rules.',
          'Settings go in chrome.storage and projects in IndexedDB. None of it leaves the browser.',
          'The security checker enforces its limits in code, not only in the interface: same origin only, GET and HEAD only, no cookies or custom headers, a request budget, a minimum pause and a timeout.'
        ]
      },
      {
        heading: 'How it is checked',
        bullets: [
          'A verify command checks syntax, the manifest and file references, and then runs the unit tests for the pure modules.',
          'End-to-end tests drive the real extension in Chromium against local training sites that are deliberately weak or clean, so detectors are tested on the wire.'
        ]
      },
      {
        heading: 'Limits',
        bullets: [
          'It is on the Chrome Web Store. You can also install it from source or from a release ZIP.',
          'Browsers hide some things from extensions: Set-Cookie headers and HttpOnly cookies, and TLS details. Server-side flaws need controlled testing that DevForge does not do.',
          'Library versions in the security report are read from file names and can be wrong.'
        ]
      }
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/hredoymesha/devforge' }]
  },
  {
    slug: 'retail-operations-dashboard',
    title: 'Retail Operations Dashboard',
    tag: 'Business analytics · Excel',
    summary:
      'An Excel workbook on three years of invented retail data, built to practise the kind of analysis a retail or operations analyst is asked for. Python scripts work out the same numbers from the CSV files, which is how the workbook was checked.',
    metaDescription:
      'Case study: an Excel retail operations dashboard on three years of synthetic data, with contribution margin, a margin bridge, reorder planning and customer cohorts, checked against Python.',
    image: '/assets/work-retail.webp',
    imageAlt:
      'Screenshot of the Excel retail operations dashboard with year, region, channel and category drop-downs, six KPI cards and charts, and a smaller panel showing the inventory sheet. The data is synthetic.',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'All the data in this project is made up. The company, the products, the suppliers and the customers are invented, and nobody real is described. The numbers say nothing about a real shop.',
          'The workbook runs on three years of invented sales for a Finnish shop that sells online, in stores, on a marketplace and wholesale. The first version covered one year; it is kept untouched in the repository, with a changelog that says which mistakes it had.'
        ]
      },
      {
        heading: 'What it tries to answer',
        paragraphs: [
          'Where does the margin go once shipping, fees, discounts and returns are counted? What changed it between two years? Which products carry the revenue? What needs reordering, what is sitting on the shelf, and what did empty shelves cost? Which forecasting method suits each category? Do promotions pay for themselves? Who comes back, and how fast do new customers drop off?'
        ]
      },
      {
        heading: 'What came out',
        paragraphs: ['Because the data is synthetic, these figures show what the workbook can do. They say nothing about real retail.'],
        bullets: [
          'Gross margin over the three years is 52.1%, but contribution margin, after shipping, fees and returns, is 37.3%. Retail keeps 49.0% and the marketplace only 24.2%.',
          'Contribution margin went from 314,713 euros in 2024 to 317,479 in 2025. Higher list prices added 19,333 and higher unit costs took away 9,192.',
          'Stock-outs cost 2,088 units in 2025, 5.4% of demand, roughly 49,737 euros of sales.',
          'Of 73 promotions with a usable baseline, 35 added gross profit and 38 lost it. The baseline ignores seasonality, so that is a rough figure.',
          'Apparel returns 12.6% of units and office goods 2.0%. Returns cost 139,089 euros, 5.8% of revenue.',
          '72% of the 2,217 consumers who bought did so more than once, and 47% of the 2024 buyers came back in 2025.'
        ]
      },
      {
        heading: 'How it was built',
        bullets: [
          'A script generates the data from a seed: 42 SKUs in 6 categories, 5 regions, 4 channels and 4,000 customers, with seasonality, promotions, returns, supplier delays and stock-outs.',
          'It also writes a deliberately messy sales export, with duplicates, missing values and wrong dates, and a second script repairs it and logs every change.',
          'The workbook is written with XlsxWriter. The calculations are live formulas over Excel tables, with named ranges, drop-downs, conditional formats and charts, and every input sits on one Assumptions sheet.',
          'The PivotTable and the Power Query sheet were added by hand in Excel afterwards.'
        ]
      },
      {
        heading: 'How it was checked',
        bullets: [
          'A Checks sheet in the workbook runs 42 tests against the CSV files and against itself.',
          'A verification script recalculates the workbook in LibreOffice and compares 1,415 figures with pandas.',
          'A pytest suite covers the Python side.'
        ]
      },
      {
        heading: 'What I would do next',
        paragraphs: [
          'Try it on a real extract and see which assumptions break first. Take seasonality out of the promotion baseline and estimate elasticity properly instead of averaging lifts. Test the forecast on more than three held-back months. Model stock by region, and put returns back into stock.'
        ]
      },
      {
        heading: 'Limits',
        bullets: [
          'The data is synthetic and was built from the same rules the analysis finds again. That shows the method works, not that it works on real data.',
          'It was tested in desktop Excel on Windows and in LibreOffice. Mac Excel, Excel for the web and Google Sheets were not tried.',
          'About three quarters of order lines have no customer id, so the customer work covers identified customers only.',
          'Building the workbook again with the script drops the PivotTable and Power Query sheets.'
        ]
      }
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/hredoymesha/excel-retail-operations-dashboard' }]
  },
  {
    slug: 'fundraising-kpi-analysis',
    title: 'Fundraising KPI Analysis',
    tag: 'Python · KPI',
    summary:
      'A Python toolkit that turns face-to-face fundraising exports into KPI reports a team leader can act on. It works with any team\'s CSV or Excel export, and all the data in the project is fictional.',
    metaDescription:
      'Case study: f2f_kpi, a Python toolkit that turns fundraising activity logs into KPI reports, with data checks, location planning tiers, an Excel report and a web app. Built and tested on sample data.',
    image: '/assets/work-fundraising.webp',
    imageAlt:
      'Screenshot of the fundraising KPI web app showing conversation rate, pledge rate, pledges per hour and charts by region, using sample data.',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'Face-to-face fundraising teams collect a lot of numbers: doors knocked, conversations, pledges, hours. This project turns those exports into something a team leader can act on.',
          'It started as a small portfolio analysis and now includes a reusable toolkit, f2f_kpi. All the data in the project is fictional, and the sample data is made by a seeded generator: 12 weeks, 5 regions, 30 locations and 40 fundraisers who appear only as IDs.'
        ]
      },
      {
        heading: 'What the toolkit does',
        bullets: [
          'Reads CSV or Excel files, whatever the column names are, using a short YAML file that says which column is which.',
          'Checks the data and lists every problem with the file row it came from: impossible numbers, bad dates, duplicates, unknown IDs.',
          'Calculates five KPIs (conversation rate, pledge rate, pledges per hour, target attainment, average monthly donation) by region, activity type, fundraiser, location and by week or month.',
          'Sorts locations into planning tiers such as "Scale or repeat" or "Review before repeating", with thresholds you set.',
          'Writes one Excel workbook with the results, charts and a sheet of data issues, and offers the same in a browser app.'
        ]
      },
      {
        heading: 'How it fits together',
        paragraphs: [
          'All the logic lives in one package. The command line, the Excel report and the web app are thin layers on top of it, so they always give the same numbers. A file is read as text with each row\'s line number remembered, its columns are mapped, the values are parsed and validated, and then the KPIs, trends and location tiers are worked out.'
        ]
      },
      {
        heading: 'How the KPIs are worked out',
        bullets: [
          'Totals are added up before dividing, so a region\'s pledge rate is its total pledges over its total conversations, not an average of daily rates.',
          'If the bottom of a fraction is zero, the result is left blank instead of showing 0%. A region with no conversations has no pledge rate; it did not have a bad one.',
          'Rows with errors are not counted at all.',
          'Locations with too few hours, or no usable target, are labelled "Insufficient data" instead of being ranked.'
        ]
      },
      {
        heading: 'Care with the data',
        bullets: [
          'Every problem comes with the source row, the column, the value found and a plain description. An error leaves the row out of every figure; a warning keeps it and is worth a look.',
          'Text from an input file that starts with an equals sign is stored as plain text, so a hostile spreadsheet value cannot turn into a formula in the report.',
          'The web app runs on your own computer and warns if it is reachable from the network.'
        ]
      },
      {
        heading: 'How it is tested',
        bullets: [
          'The tests cover the engine with hand-calculated expected values, the planted mistakes in the sample data (13 in the shifts file and one wrong figure in the location file, all of which must be found), the command line, the Excel workbook, and the web app.',
          'A workflow runs the same test command on every push and pull request.'
        ]
      }
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/hredoymesha/fundraising-kpi-analysis' }],
    note: 'Python 3.10 or newer is needed; the project was developed and tested on Python 3.12.'
  },
  {
    slug: 'erp-bd',
    title: 'ERP BD',
    tag: 'Business platform · In development',
    summary:
      'Business-management software for shops, pharmacies, restaurants and wholesalers in Bangladesh, in Bangla and English. The catalog, purchasing, inventory and website builder are built and tested; sales, accounting and the rest are planned.',
    metaDescription:
      'Case study: ERP BD, business software for shops, pharmacies, restaurants and wholesalers in Bangladesh, in Bangla and English. Catalog, purchasing, per-piece stock and a website builder are built; sales and accounting are planned.',
    image: '/assets/work-erp.svg',
    imageAlt:
      'Module map of ERP BD: security and roles, catalog, inventory, purchasing and the website builder are built and tested; orders, point of sale, accounting, production, payroll, customers, automation, an API and mobile app, and multi-tenant hosting are planned.',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'ERP BD is business-management software for shops, pharmacies, restaurants and wholesalers in Bangladesh. It runs in Bangla and English.',
          'One system serves different kinds of business. The business type (fashion, retail, wholesale, pharmacy, restaurant, services or office) decides which sections show, the words on screen, the product fields and the units.'
        ]
      },
      {
        heading: 'What is built',
        bullets: [
          'Catalog: products with variants, categories, brands and options, and a review step for imported data.',
          'Purchasing: purchase orders, goods receipts where every piece gets its own barcode, vendor returns, vendor payments and a vendor ledger. Packs such as a strip or a box can have their own prices.',
          'Inventory: stock on hand by branch, transfers between branches with a challan, adjustments, stock counts by scanning, low-stock and reorder lists, and batch numbers with expiry dates.',
          'Website builder: sites and pages made inside the system.',
          'People and access: users, roles and permissions, branches, and an audit trail that keeps the values from before and after each change.',
          'Security: two-step sign-in, a password check before sensitive pages, a list of open sessions, account lockout and strict security headers.',
          'Demo workspace: a separate database with realistic sample data for any business type, so new staff can practise without touching real records.'
        ]
      },
      {
        heading: 'How it is built',
        paragraphs: ['The system runs on Laravel 13 and PHP 8.3 or newer, with MySQL or MariaDB, Blade templates, Tailwind CSS 4 and Alpine.js.'],
        bullets: [
          'Stock is kept per piece. Every piece has its own barcode, and each change of status or branch adds a row to a movement log that is never edited.',
          'Money owed to vendors sits in a ledger that is only ever added to.',
          'Each permission is a named action that is defined once, in one place.',
          'Every piece of text on screen goes through a translation file, and a separate layer swaps the words for each business type.'
        ]
      },
      {
        heading: 'How it is tested',
        paragraphs: [
          'Automated tests run on an in-memory database. They cover access control, security, the catalog, purchasing, inventory, a pharmacy flow, the website builder and the demo data.'
        ]
      },
      {
        heading: 'What is planned',
        paragraphs: [
          'Orders and couriers, point of sale, accounting, production, people and payroll, customers (CRM), automation, an API and mobile app, and a multi-tenant version are planned but not built yet.'
        ]
      },
      {
        heading: 'My role',
        paragraphs: ['I am the product owner and lead of the project, which is in active development.']
      }
    ],
    links: [],
    note: 'The source code is in a private repository, so there is no public link.'
  }
];

export const caseStudySlugs = caseStudies.map((c) => c.slug);

export function findCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
