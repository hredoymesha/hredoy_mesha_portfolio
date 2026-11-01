export interface ClockConfig {
  city: string;
  tz: string;
}

export interface ProfileData {
  name: string;
  role: string;
  bases: string[];
  clocks: ClockConfig[];
  headline: {
    lead: string;
    em: string;
  };
  summary: string;
  availability: string;
  links: {
    linkedin: string;
    github: string;
    orcid: string;
    email: string;
  };
  /** CV links open a private Google Drive file. An item without `href` renders as an inactive button. */
  cv: Array<{
    label: string;
    href?: string;
  }>;
  cvNote: string;
}

export interface Pillar {
  title: string;
  text: string;
}

export interface PublicationItem {
  year: string;
  type: string;
  title: string;
  bilingualTitle?: {
    bn: string;
    en: string;
  };
  desc: string;
  link: string;
  doi?: string;
}

export type WorkKind = 'data' | 'research' | 'field' | 'study';

/** One line of the Career timeline. `sort` is the end of the period as YYYYMM (999999 = still going), newest first. */
export interface TimelineEntry {
  kinds: WorkKind[];
  sort: number;
  when: string;
  place: string;
  role: string;
  org: string;
}

export interface ExperienceItem extends TimelineEntry {
  impact?: string;
  points: string[];
}

export interface WorkItem {
  tag: string;
  title: string;
  desc: string;
  img: string;
  imgAlt: string;
  link?: string;
  linkText?: string;
}

export interface SkillCategory {
  title: string;
  items: Array<{
    name: string;
    level?: string;
  }>;
}

export interface Degree {
  level: string;
  title: string;
  org: string;
  place: string;
  when: string;
  about: string;
  achievement: string;
}

export interface Activity {
  role: string;
  org: string;
  when: string;
  desc: string;
}

export interface ProjectData {
  role: string;
  title: string;
  org: string;
  when: string;
  desc: string;
  link?: string;
  linkText?: string;
  awards: string[];
}

export interface CertificationItem {
  name: string;
  year: string;
}

export interface CertificationGroup {
  groupTitle: string;
  items: CertificationItem[];
}

/** Bengali version of the introduction (hero + About). Written for Bengali readers, not word-for-word; to be proofread by the owner. */
export interface IntroTranslation {
  headline: { lead: string; em: string };
  summary: string[];
  availability: string;
  aboutParagraphs: string[];
  announce: string;
}

export interface SiteData {
  profile: ProfileData;
  introBn: IntroTranslation;
  pillars: Pillar[];
  about: {
    paragraphs: string[];
    interests: string[];
  };
  publications: PublicationItem[];
  experience: ExperienceItem[];
  /** Studies shown on the Career timeline next to the jobs. */
  studyTimeline: TimelineEntry[];
  work: WorkItem[];
  skills: SkillCategory[];
  education: {
    degrees: Degree[];
    activities: Activity[];
    project: ProjectData;
  };
  certifications: CertificationItem[];
  certificationGroups?: CertificationGroup[];
  contact: {
    quickTopics?: Array<{
      label: string;
      icon?: string;
      subject: string;
    }>;
  };
}

export const siteData: SiteData = {
  introBn: {
    headline: { lead: "Analytics teams can act on.", em: "Research anyone can trace." },
    summary: [
      "আমি ডেটা ও তথ্যপ্রযুক্তি পেশায় যুক্ত। পাশাপাশি স্বাধীনভাবে গবেষণা করি। আমার কাজের ক্ষেত্র হেলসিঙ্কি ও ঢাকা।",
      "ইউনিসেফ ফিনল্যান্ডে কাজ করার সময় একাধিক ফান্ডরেইজিং ফিল্ড টিমের নেতৃত্ব দিয়েছি। দলের কাজের অগ্রগতি ও কর্মদক্ষতা মূল্যায়নের পাশাপাশি বিভিন্ন এলাকার তথ্য বিশ্লেষণের জন্য এক্সেলে KPI ও লোকেশনভিত্তিক বিশ্লেষণ টুল তৈরি করেছি। HCL Technologies-এ Barclays কর্মীদের তথ্যপ্রযুক্তিগত সমস্যা সমাধানে সার্ভিস ডেস্কের মাধ্যমে সহায়তা দিয়েছি। Åbo Akademi University-তে ফিনল্যান্ডের Talent Boost কর্মসূচি নিয়ে গবেষণার কাজেও যুক্ত ছিলাম।",
      "আমার গবেষণার মূল আগ্রহ কৃত্রিম বুদ্ধিমত্তা ও স্বয়ংক্রিয় প্রযুক্তির কারণে ইউরোপের শ্রমবাজারে যেসব পরিবর্তন ঘটছে, স্থানীয় সরকারে কৃত্রিম বুদ্ধিমত্তার জবাবদিহিমূলক ব্যবহার এবং ফিনল্যান্ডে আন্তর্জাতিক দক্ষ জনশক্তিকে ধরে রাখার চ্যালেঞ্জ ও সম্ভাবনা।",
      "আমি Governance of Digitalisation বিষয়ে স্নাতকোত্তর ডিগ্রি অর্জন করেছি।"
    ],
    availability: "Open to data, IT, and research roles — and doctoral collaboration.",
    aboutParagraphs: [
      "আমার পেশাগত অভিজ্ঞতার মধ্যে রয়েছে ইউনিসেফ ফিনল্যান্ডে ফান্ডরেইজিং ফিল্ড টিমের নেতৃত্ব দেওয়া এবং এক্সেলে KPI ও ম্যাপিং টুল তৈরি করা, HCL Technologies-এর আইটি সার্ভিস ডেস্কের মাধ্যমে Barclays কর্মীদের প্রযুক্তিগত সহায়তা দেওয়া এবং Åbo Akademi University-তে গবেষণার কাজে সহায়তা করা। পাশাপাশি, বিভিন্ন সময়ে ক্রীড়া সম্প্রচারের প্রযুক্তিগত কাজেও প্রকল্পভিত্তিক দায়িত্ব পালন করি। এটি নিয়মিত কোনো চাকরি নয়, বরং নির্দিষ্ট অনুষ্ঠানকেন্দ্রিক কাজ।",
      "এ পর্যন্ত আমার প্রকাশিত গবেষণার মধ্যে বাংলাদেশের জননিরাপত্তা বিষয়ে তথ্য-প্রমাণভিত্তিক কাজ রয়েছে। বর্তমানে আমার গবেষণার আগ্রহের মূল ক্ষেত্র হলো ইউরোপের কর্মজগতে কৃত্রিম বুদ্ধিমত্তা ও স্বয়ংক্রিয় প্রযুক্তির প্রভাব, স্থানীয় সরকারে স্বচ্ছ ও জবাবদিহিমূলকভাবে কৃত্রিম বুদ্ধিমত্তার ব্যবহার এবং ফিনল্যান্ডে আন্তর্জাতিক দক্ষ জনশক্তিকে আকৃষ্ট করা ও ধরে রাখার বিষয়গুলো।",
      "এ মুহূর্তে দুটি স্কোপিং রিভিউ গবেষণাপত্র প্রস্তুত করছি এবং পিএইচডি ও ডক্টরাল গবেষণার জন্য বিভিন্ন বিশ্ববিদ্যালয়ে আবেদনের কাজ এগিয়ে নিচ্ছি।"
    ],
    announce: "ভূমিকা এখন বাংলায় দেখানো হচ্ছে।"
  },
  profile: {
    name: "MD Hredoy Mesha",
    role: "Data & IT · Research",
    bases: ["Helsinki, Finland", "Dhaka, Bangladesh"],
    clocks: [
      { city: "Helsinki", tz: "Europe/Helsinki" },
      { city: "Dhaka", tz: "Asia/Dhaka" }
    ],
    headline: {
      lead: "Analytics teams can act on.",
      em: "Research anyone can trace."
    },
    summary:
      "I am a data and IT professional and independent researcher based between Helsinki and Dhaka. At UNICEF Finland, I led multiple fundraising field teams and built Excel KPI and location-analysis tools; at HCL Technologies, I supported Barclays staff through the service desk; and at Åbo Akademi University, I assisted research on Finland's Talent Boost programme. My research interests are AI and automation in European labour markets, accountable AI in local government, and international talent retention in Finland. I hold a Master's in Governance of Digitalisation.",
    availability: "Open to data, IT, and research roles — and doctoral collaboration.",
    links: {
      linkedin: "https://www.linkedin.com/in/meshahredoy/",
      github: "https://github.com/hredoymesha",
      orcid: "https://orcid.org/0009-0007-6584-4617",
      email: "md.hredoy.mesha@gmail.com"
    },
    cv: [
      { label: "Professional CV", href: "https://drive.google.com/file/d/1ybmIFTH6BAyM98pp2OJ-yVlXuMFILctr/view?usp=sharing" },
      { label: "Academic CV", href: "https://drive.google.com/file/d/1lI5z_UdJjdCPk-znR6VnmV_WT5qm-IEB/view?usp=sharing" }
    ],
    cvNote: "Opens Google Drive. If it asks for access, send a request with a short reason and I will reply."
  },

  pillars: [
    {
      title: "Analytics & performance reporting",
      text: "At UNICEF Finland, built Excel KPI reporting and location analysis to support fundraising performance and route planning."
    },
    {
      title: "Research interests & evidence",
      text: "AI and automation at work in Europe; accountable AI in local government; and international talent attraction and retention in Finland. Published evidence-based work on public security in Bangladesh."
    },
    {
      title: "IT support & event technology",
      text: "Supported Barclays staff through HCL Technologies' service desk; separately took project-based live UEFA match assignments setting up, checking, and operating broadcast tracking and replay equipment."
    },
    {
      title: "Team leadership & project delivery",
      text: "Led multicultural UNICEF field teams and coached team leaders; managed Åbo Akademi University's Vessel Remote Guidance Protocol (VRGP) student project, coordinating plans, documentation, and stakeholders."
    }
  ],

  about: {
    paragraphs: [
      "My professional experience includes leading multiple fundraising field teams and building Excel KPI and mapping tools at UNICEF Finland, supporting Barclays staff through HCL Technologies' IT service desk, and assisting research at Åbo Akademi University. I also take on occasional, project-based sports-broadcast technology assignments; this is event work, not a regular ongoing position.",
      "My published research so far includes evidence-based work on public security in Bangladesh. My current research interests are AI and automation's effects on work in Europe, transparent and accountable AI use in local government, and the attraction and retention of international talent in Finland. I am preparing two scoping-review manuscripts and doctoral applications."
    ],
    interests: [
      "AI and automation in European labour markets — job outcomes, task changes, and worker adaptation",
      "AI in local government — accountability, transparency, and public-sector governance",
      "International talent in Finland — attraction, retention, and labour-market integration",
      "Algorithmic management and responsible digital transformation"
    ]
  },

  publications: [
    {
      year: "2026",
      type: "GDN Working Paper No. 121",
      title: "Crime and Public Security in Bangladesh: September 2024–June 2026",
      desc: "Traces a measurable decline in public security after Bangladesh's 2024 transition — built from 112 primary and institutional sources.",
      link: "https://www.gdn.int/crime-and-public-security-bangladesh-september-2024%E2%80%93june-2026",
      doi: "10.69814/wp/2026121"
    },
    {
      year: "2026",
      type: "Report · Zenodo · CC-BY",
      title: "Deteriorating Public Security and Law and Order in Bangladesh",
      desc: "An evidence-based situation brief covering six corroborated areas, each source named, with findings reported as ranges.",
      link: "https://zenodo.org/records/22839812",
      doi: "10.5281/zenodo.21420949"
    },
    {
      year: "2026",
      type: "Preprint · Zenodo · Bengali",
      title: "Perceptions at the Moment of Death — a Qualitative Analysis",
      bilingualTitle: {
        bn: "মৃত্যুর মুহূর্তের উপলব্ধি — বাংলাদেশের ধর্মীয় ও সামাজিক প্রেক্ষাপটে একটি গুণগত বিশ্লেষণ",
        en: "Perceptions at the Moment of Death: A Qualitative Analysis"
      },
      desc: "A reflexive thematic analysis of first-hand accounts — the first qualitative study of its kind in Bangladesh's religious and social context.",
      link: "https://zenodo.org/records/21746471",
      doi: "10.5281/zenodo.21746471"
    },
    {
      year: "2026",
      type: "Opinion · Dhaka Opinion Magazine",
      title: "Dhaka knows exactly who is extorting it",
      desc: "A public-interest argument naming the structure behind organised extortion in Dhaka.",
      link: "https://dhakaopinionmagazine.com/2026/09/02/dhaka-knows-exactly-who-is-extorting-it/",
      doi: ""
    },
    {
      year: "In prep",
      type: "Scoping reviews",
      title: "Two manuscripts in preparation",
      desc: "“AI, Automation, and Labour-Market Outcomes in Europe (2019–2025)” and “From Attraction to Retention: International Talent in the Finnish Labour Market.”",
      link: "",
      doi: ""
    }
  ],

  experience: [
    {
      kinds: ['research'],
      sort: 999999,
      when: "2025 — Now",
      place: "Helsinki",
      role: "Independent Researcher",
      org: "Self-employed",
      impact: "Publishing sourced research and preparing doctoral applications.",
      points: [
        "Authored GDN Working Paper No. 121 on crime and public security in Bangladesh (September 2024 – June 2026), built from 112 primary and institutional sources and published with a persistent DOI.",
        "Published an evidence-based situation brief on Zenodo (v2.0, CC-BY) and a public-interest opinion piece in Dhaka Opinion Magazine.",
        "Preparing two scoping-review manuscripts: AI, automation and labour-market outcomes in Europe (2019–2025), and international talent attraction and retention in Finland.",
        "Developing doctoral proposals in AI governance and digital transformation, including literature review and academic writing.",
        "Builds data and web tools in public on GitHub: DevForge (a Manifest V3 Chrome extension), a fundraising-KPI toolkit with a web app, and an Excel retail-operations dashboard; the data projects use synthetic data only.",
        "Product owner and lead of ERP BD, a business-management platform in active development (see Selected Work)."
      ]
    },
    {
      kinds: ['data', 'field'],
      sort: 202411,
      when: "Feb 2023 — Nov 2024",
      place: "Helsinki",
      role: "F2F Team Leader",
      org: "UNICEF Finland",
      impact: "Led multicultural fundraising field teams, including a 16-member team, across multiple districts, consistently exceeding monthly KPI targets.",
      points: [
        "Built an Excel KPI analysis tool that cut manual reporting time by approximately 30% and put daily performance in front of team leaders.",
        "Carried out in-depth geographical KPI analysis for 2022–2023 and designed and implemented a mapping system for door-to-door (D2D) fundraising, improving planning and productivity.",
        "Coached and trained team leaders in data analysis and mapping techniques, so they could read the numbers and act on them."
      ]
    },
    {
      kinds: ['research'],
      sort: 202209,
      when: "Jul — Sep 2022",
      place: "Turku",
      role: "Research Assistant (Intern)",
      org: "Åbo Akademi University",
      impact: "Research support on Finland's Talent Boost programme.",
      points: [
        "Collected and analysed data for Talent Boost projects and turned literature into structured, presentable findings.",
        "Applied literature review, online research and academic writing to produce structured outputs.",
        "Worked in cross-functional teams to build and deliver presentations."
      ]
    },
    {
      kinds: ['data'],
      sort: 202109,
      when: "Jun — Sep 2021",
      place: "Vilnius",
      role: "IT Analyst — Service Desk",
      org: "HCL Technologies",
      impact: "Front-line IT support for Barclays staff, owned to resolution.",
      points: [
        "Resolved hardware and software issues through a ticketing workflow, taking ownership until each case was closed.",
        "Traced root causes, assessed impact, and escalated urgent or critical matters in line with procedure.",
        "Kept all work within internal and regulatory requirements."
      ]
    },
    {
      kinds: ['field'],
      sort: 201604,
      when: "Jan 2014 — Apr 2016",
      place: "Dhaka",
      role: "Assistant Supervisor",
      org: "M/S Nafisha Enterprise",
      impact: "First role — floor supervision and hiring support.",
      points: [
        "Supervised workers to keep productivity and operations efficient.",
        "Assisted recruitment, including evaluating applications from new hires."
      ]
    },
    {
      kinds: ['field'],
      sort: 202512,
      when: "2025 · Event-based",
      place: "Finland",
      role: "Technical Consultant (project-based)",
      org: "Hawk-Eye Innovations (Sony Group)",
      impact: "Event-based technical assignments at selected live UEFA matches.",
      points: [
        "Set up, assembled and maintained tracking and replay technology for live UEFA events.",
        "Ran pre-match hardware and system checks and operated sports tracking and replay systems during broadcasts."
      ]
    }
  ],

  studyTimeline: [
    {
      kinds: ['study'],
      sort: 202306,
      when: "Sep 2021 — Jun 2023",
      place: "Turku",
      role: "Master's in Governance of Digitalisation (MSc)",
      org: "Åbo Akademi University"
    },
    {
      kinds: ['study'],
      sort: 202002,
      when: "Sep 2016 — Feb 2020",
      place: "Vilnius",
      role: "Bachelor of Business Administration (BBA)",
      org: "Vytautas Magnus University"
    }
  ],

  work: [
    {
      tag: "Business platform · In development",
      title: "ERP BD",
      desc: "An all-in-one business system for Bangladeshi businesses — inventory, purchasing, sales, accounting and a website builder on one secure platform, in Bangla and English. The security, inventory and purchasing foundations are built and tested; the rest is planned.",
      img: "/assets/work-erp.svg",
      imgAlt: "Module map of ERP BD: security, inventory and purchasing are built and tested; sales, accounting, production, people, customers, website builder and automation are planned.",
      link: "",
      linkText: ""
    },
    {
      tag: "Browser extension",
      title: "DevForge — Web Dev Workbench",
      desc: "A privacy-first Chrome extension that inspects, edits, audits, recreates, and exports any web interface — every operation runs locally, nothing leaves the browser.",
      img: "/assets/work-devforge.webp",
      imgAlt: "Preview of the DevForge — Web Dev Workbench browser extension.",
      link: "https://github.com/hredoymesha/devforge",
      linkText: "Source"
    },
    {
      tag: "Business analytics · Excel",
      title: "Retail Operations Dashboard",
      desc: "An Excel workbook on three years of synthetic retail data: drop-downs by year, region, channel and category, contribution margin after shipping, fees and returns, a margin bridge, ABC-XYZ, reorder planning and customer cohorts, checked against Python.",
      img: "/assets/work-retail.webp",
      imgAlt: "Screenshot of the Excel retail operations dashboard with year, region, channel and category drop-downs, six KPI cards and charts, and a smaller panel showing the inventory sheet. The data is synthetic.",
      link: "https://github.com/hredoymesha/excel-retail-operations-dashboard",
      linkText: "Source"
    },
    {
      tag: "Python · KPI",
      title: "Fundraising KPI Analysis",
      desc: "A Python toolkit that turns fundraising activity logs into KPI reports. Built and tested on sample data.",
      img: "/assets/work-fundraising.webp",
      imgAlt: "Screenshot of the fundraising KPI web app showing conversation rate, pledge rate, pledges per hour and charts by region, using sample data.",
      link: "https://github.com/hredoymesha/fundraising-kpi-analysis",
      linkText: "Source"
    }
  ],

  skills: [
    {
      title: "Programming & data",
      items: [
        { name: "Python" },
        { name: "Pandas" },
        { name: "NumPy" },
        { name: "Matplotlib" },
        { name: "Seaborn" },
        { name: "SQL", level: "Intermediate" },
        { name: "Power BI", level: "Intermediate" },
        { name: "Excel" }
      ]
    },
    {
      title: "Analytics & reporting",
      items: [
        { name: "Data cleaning" },
        { name: "Statistical analysis" },
        { name: "Data visualisation" },
        { name: "KPI development" },
        { name: "Performance reporting" },
        { name: "Location analysis" }
      ]
    },
    {
      title: "Research methods",
      items: [
        { name: "Systematic & scoping reviews" },
        { name: "Qualitative analysis" },
        { name: "Thematic analysis" },
        { name: "Literature review" },
        { name: "Academic writing" }
      ]
    },
    {
      title: "IT & delivery",
      items: [
        { name: "IT support" },
        { name: "Service desk" },
        { name: "Troubleshooting" },
        { name: "Ticketing systems" },
        { name: "Project management" },
        { name: "Team leadership" }
      ]
    },
    {
      title: "Web development",
      items: [{ name: "HTML" }, { name: "CSS" }, { name: "JavaScript" }, { name: "Git & GitHub" }, { name: "Chrome extensions (Manifest V3)" }]
    }
  ],

  education: {
    degrees: [
      {
        level: "Master's",
        title: "Governance of Digitalisation",
        org: "Åbo Akademi University",
        place: "Turku, Finland",
        when: "2021 – 2023",
        about:
          "A two-year, 120-ECTS international Master's that blends information systems and information studies, treating digitalisation as a force that reshapes how organisations operate and create value. Coursework spans data analytics and business intelligence, digital services design, data and knowledge management, IT governance, and how people interact with digital technology.",
        achievement:
          "Graduated with a final grade of 4.51/5.0, earned merit-based grants, and held a 100% tuition-fee waiver for two years. The Master's thesis examined employee retention and turnover in Finland."
      },
      {
        level: "Bachelor's",
        title: "Business Administration (BBA)",
        org: "Vytautas Magnus University",
        place: "Vilnius, Lithuania",
        when: "2016 – 2020",
        about:
          "A four-year, 240-ECTS Bachelor of Business Administration taught in English, covering the fundamentals of economics, management, finance, and marketing, alongside entrepreneurship and leadership, financial accounting, business law, and human resource management — taught through case studies and practitioner-led lectures.",
        achievement:
          "Graduated with a final grade of 8.84/10 and was selected twice for the competitive ERASMUS exchange on academic merit."
      }
    ],
    activities: [
      {
        role: "Student Tutor",
        org: "Åbo Akademi University",
        when: "2022",
        desc: "Mentored and guided new international students as they adapted to university life and Finnish academic culture."
      }
    ],
    project: {
      role: "Project Manager",
      title: "VRGP — Vessel Remote Guidance Protocol",
      org: "Åbo Akademi University",
      when: "2021 – 2022",
      desc: "Led a university project implementing the Vessel Remote Guidance Protocol (VRGP) for safer ship docking — managing the full lifecycle: planning, documentation, stakeholder communication, and final presentation.",
      link: "https://hredoymesha.github.io/vrgp-remote-guidance-case-study/",
      linkText: "View case study",
      awards: [
        "Best Presentation",
        "Best Global Potential",
        "Best Technical Content"
      ]
    }
  },

  certificationGroups: [
    {
      groupTitle: "Python & Data Science, 4 courses, 2022-24",
      items: [
        {
          name: "Python for Data Science",
          year: "2023"
        },
        {
          name: "Python Data Analysis",
          year: "2023"
        },
        {
          name: "Data Science with Python",
          year: "2024"
        },
        {
          name: "Python Essential",
          year: "2022"
        }
      ]
    },
    {
      groupTitle: "IT, Management & Other Certifications",
      items: [
        {
          name: "Microsoft Excel",
          year: "2022"
        },
        {
          name: "Outlook Essential",
          year: "2021"
        },
        {
          name: "Project Management",
          year: "2023"
        },
        {
          name: "Web Development",
          year: "2017"
        },
        {
          name: "FRC Emergency First Aid",
          year: "2023"
        }
      ]
    }
  ],

  certifications: [
    { name: "Python for Data Science", year: "2023" },
    { name: "Python Data Analysis", year: "2023" },
    { name: "Data Science with Python", year: "2024" },
    { name: "Python Essential", year: "2022" },
    { name: "Microsoft Excel", year: "2022" },
    { name: "Outlook Essential", year: "2021" },
    { name: "Project Management", year: "2023" },
    { name: "Web Development", year: "2017" },
    { name: "FRC Emergency First Aid", year: "2023" }
  ],

  contact: {
    quickTopics: [
      {
        label: "Doctoral Collaboration",
        icon: "graduation-cap",
        subject: "[Collaboration] Doctoral Research Inquiry"
      },
      {
        label: "Data & IT Roles",
        icon: "briefcase",
        subject: "[Opportunity] Data & IT Role Inquiry"
      },
      {
        label: "Public Security & AI Governance",
        icon: "book-open",
        subject: "[Research] Public Security / AI Governance Discussion"
      }
    ]
  }
};
