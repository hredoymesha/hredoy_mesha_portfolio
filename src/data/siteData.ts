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
  /** Longer abstract, shown in a closed "Read the working abstract" box. Only for work that is still in progress. */
  abstract?: string;
  /** Text on the opening line of the box, for example "Read the abstract". Default: "Read the working abstract". */
  abstractLabel?: string;
  /** Small note under the abstract. Default: the "not published yet" note used for in-progress work. */
  abstractNote?: string;
  /** Language of the abstract text ("bn" for Bengali). */
  abstractLang?: 'bn';
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
  /** Slug of the case-study page for this item (see caseStudies.ts). */
  caseStudy?: string;
  /** Optional buttons for the card footer (for example "Web preview" and "Download APK"). When present they replace the single link; a case-study button, if the item has one, is shown first. */
  actions?: { label: string; url: string }[];
  /** Optional short looping video, shown in the picture box instead of the image. The poster is shown when the visitor prefers reduced motion. Not used yet. */
  video?: { mp4: string; webm?: string; poster: string };
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
  /** Full name of the project, shown under the title. */
  fullTitle: string;
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

/** Bengali version of the introduction (hero and About). */
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
  /** Self-directed hands-on work. Shown under the jobs with a "Personal experience" tag; not part of the career timeline. */
  personalExperience: { title: string; points: string[] }[];
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
      "আমি একজন ডেটা ও তথ্যপ্রযুক্তি (আইটি) পেশাজীবী এবং স্বাধীন গবেষক। বর্তমানে হেলসিঙ্কি ও ঢাকার মধ্যে অবস্থান করে কাজ করছি। ইউনিসেফ ফিনল্যান্ডে (UNICEF Finland) একাধিক মাঠপর্যায়ের দলের নেতৃত্ব দিয়েছি এবং কার্যসম্পাদন মূল্যায়নের জন্য কেপিআই (KPI) ও location বিশ্লেষণের টুল তৈরি করেছি। এইচসিএল টেকনোলজিসে (HCL Technologies) বার্কলেসের (Barclays) কর্মীদের সার্ভিস ডেস্কের মাধ্যমে আইটি সহায়তা প্রদান করেছি। এছাড়া, আবো আকাদেমি বিশ্ববিদ্যালয়ে (Åbo Akademi University) ফিনল্যান্ডের ট্যালেন্ট বুস্ট (Talent Boost) কর্মসূচিবিষয়ক গবেষণায় সহায়তা করেছি। আমার গবেষণার আগ্রহের প্রধান ক্ষেত্রগুলো হলো ইউরোপের শ্রমবাজারে কৃত্রিম বুদ্ধিমত্তা (AI) ও স্বয়ংক্রিয় প্রযুক্তির প্রভাব, স্থানীয় সরকারে জবাবদিহিমূলক কৃত্রিম বুদ্ধিমত্তার ব্যবহার এবং ফিনল্যান্ডে আন্তর্জাতিক দক্ষ জনশক্তির আকর্ষণ ও ধরে রাখার নীতি। আমি গভর্ন্যান্স অব ডিজিটালাইজেশন বিষয়ে স্নাতকোত্তর ডিগ্রিধারী।"
    ],
    availability: "Open to data, IT, and research roles — and doctoral collaboration.",
    aboutParagraphs: [
      "আমার পেশাগত অভিজ্ঞতার মধ্যে রয়েছে ইউনিসেফ ফিনল্যান্ডে (UNICEF Finland) একাধিক মাঠপর্যায়ের দলের নেতৃত্ব দেওয়া এবং এক্সেলভিত্তিক কেপিআই (KPI) ও location বিশ্লেষণী টুল তৈরি করা। এছাড়া, এইচসিএল টেকনোলজিসের (HCL Technologies) আইটি সার্ভিস ডেস্কের মাধ্যমে বার্কলেসের (Barclays) কর্মীদের প্রযুক্তিগত সহায়তা প্রদান করেছি এবং আবো আকাদেমি বিশ্ববিদ্যালয়ে (Åbo Akademi University) গবেষণাকাজে সহায়তা করেছি। পাশাপাশি, বিভিন্ন সময়ে প্রকল্পভিত্তিক ক্রীড়া সম্প্রচারের প্রযুক্তিগত কাজেও যুক্ত থাকি। তবে এটি নিয়মিত বা স্থায়ী কোনো চাকরি নয়, মূলত নির্দিষ্ট অনুষ্ঠানকেন্দ্রিক সাময়িক দায়িত্ব।",
      "এ পর্যন্ত আমার প্রকাশিত গবেষণার মধ্যে বাংলাদেশের জননিরাপত্তাবিষয়ক তথ্যপ্রমাণনির্ভর গবেষণাকাজ রয়েছে। বর্তমানে আমার গবেষণার আগ্রহের প্রধান ক্ষেত্রগুলো হলো ইউরোপের কর্মজগতে কৃত্রিম বুদ্ধিমত্তা (AI) ও স্বয়ংক্রিয় প্রযুক্তির প্রভাব, স্থানীয় সরকারে স্বচ্ছতা ও জবাবদিহি নিশ্চিত করে কৃত্রিম বুদ্ধিমত্তার ব্যবহার এবং ফিনল্যান্ডে আন্তর্জাতিক দক্ষ জনশক্তিকে আকৃষ্ট করা ও ধরে রাখার কৌশল। বর্তমানে দুটি স্কোপিং রিভিউ গবেষণাপত্র প্রস্তুত করছি এবং ডক্টরাল পর্যায়ে গবেষণার জন্য বিভিন্ন বিশ্ববিদ্যালয়ে আবেদনের প্রস্তুতি নিচ্ছি।"
    ],
    announce: "ভূমিকা এখন বাংলায় দেখানো হচ্ছে।"
  },
  profile: {
    name: "MD Hredoy Mesha",
    role: "Data Professional & Researcher",
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
      { label: "Professional CV", href: "https://drive.google.com/file/d/1lHyU7SlDg-M5M_2b-nc8nuCRM-HJQ740/view?usp=sharing" },
      { label: "Academic CV", href: "https://drive.google.com/file/d/1-H6mN1AcwYWxoagG2XmcpSMdSUm6xZMi/view?usp=sharing" }
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
      abstract: "This brief assesses crime and public-security conditions in Bangladesh between September 2024 and June 2026, drawing on 112 sources: press and institutional reporting; primary statistical tables from Ain o Salish Kendra (ASK), the Manabadhikar Shongskriti Foundation (MSF), the Human Rights Support Society (HRSS), and Odhikar; the original Global Center for Democratic Governance (GCDG) mob-violence report; and official Police Headquarters and Dhaka Metropolitan Police crime data. Six findings are reported with confidence. First, police-recorded crime rose across most major categories, with murder cases increasing from 3,023 in 2023 to 3,786 in 2025. Second, mob-violence deaths reached their highest documented level in at least a decade. Third, reported sexual violence rose sharply, with a majority of victims under 18 across every source recording age. Fourth, violence affecting religious minorities is documented throughout the period, though the reported scale depends heavily on source and definition. Fifth, the offices of Bangladesh's two leading newspapers were looted and burned in December 2025, the first missed editions in each paper's history. Sixth, organised extortion re-established itself in Dhaka, with 1,280 active extortionists recorded by police in May 2026. Across all six areas, prosecutions and follow-through stall except where a case draws sustained public attention.",
      abstractLabel: "Read the abstract",
      abstractNote: "Summary as shown on the GDN page. Open the publication for the full paper.",
      link: "https://www.gdn.int/crime-and-public-security-bangladesh-september-2024%E2%80%93june-2026",
      doi: "10.69814/wp/2026121"
    },
    {
      year: "2026",
      type: "Report · Zenodo · CC-BY",
      title: "Deteriorating Public Security and Law and Order in Bangladesh",
      desc: "An evidence-based situation brief covering six corroborated areas, each source named, with findings reported as ranges.",
      abstract: "This brief examines crime and public security in Bangladesh from September 2024, shortly after the political transition of August 2024, to June 2026. It draws only on a documented collection of press reports, institutional publications and primary-source material. Compared with 2023, most major indicators rose: recorded murder cases climbed to 3,786 in 2025, and deaths from mob violence reached their highest documented level in at least a decade. The brief covers six well-corroborated areas: overall recorded crime, mob violence and lynching, sexual violence against women and children, violence affecting religious minorities, attacks on the media, and organised extortion. It also assesses the institutional and judicial response. One pattern runs through all of them: weak follow-through. The state moved quickly in cases that drew national attention, while routine cases stalled. Two cautions apply to the figures throughout: Police data count cases filed rather than incidents, and the independent monitoring series do not always agree, so counts are reported as ranges with their sources named.",
      abstractLabel: "Read the abstract",
      abstractNote: "Abstract as shown on Zenodo. Open the publication for the full text.",
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
      abstract: "গবেষণার প্রেক্ষাপট ও লক্ষ্য: মৃত্যুপূর্ব সচেতনতা ও আচরণগত পরিবর্তন বিষয়ক বিদ্যমান গবেষণার বিশাল অংশ পাশ্চাত্য দেশের হাসপাতাল ও হসপিস প্রেক্ষাপটে সীমাবদ্ধ। বিদ্যমান একাডেমিক গবেষণার পর্যালোচনা অনুযায়ী, বাংলাদেশের ধর্মীয় ও সামাজিক প্রেক্ষাপটে এই বিষয়ে কোনো গুণগত গবেষণা এখন পর্যন্ত প্রকাশিত হয়নি। এই গবেষণার লক্ষ্য হলো বাংলাদেশের সামাজিক ও ধর্মীয় প্রেক্ষাপটে মৃত্যুপূর্ব সচেতনতা কীভাবে প্রকাশ পায়, প্রত্যক্ষদর্শীরা এই অভিজ্ঞতাগুলো কোন ব্যাখ্যামূলক কাঠামোয় উপস্থাপন করেন এবং মৃত্যুর ধরন ও লিঙ্গভেদে আচরণগত প্রবণতায় কী পার্থক্য লক্ষ্য করা যায় তা অনুসন্ধান করা।\n\nপদ্ধতি: একটি বাংলাভাষী বিজ্ঞানভিত্তিক Facebook গ্রুপে প্রকাশিত প্রায় ৬,০০০ মন্তব্য থেকে পূর্বনির্ধারিত মানদণ্ড অনুযায়ী প্রায় ২,০০০টি প্রাসঙ্গিক মন্তব্য নির্বাচন করা হয়েছে; পাশাপাশি গবেষক কর্তৃক পরিচালিত অনুসন্ধানমূলক ব্যক্তিগত সাক্ষাৎকার থেকে প্রাপ্ত তথ্যও বিশ্লেষণে অন্তর্ভুক্ত করা হয়েছে। এই সমন্বিত তথ্য Braun ও Clarke (2006)-এর প্রতিফলনমূলক থিম্যাটিক বিশ্লেষণ পদ্ধতিতে বিশ্লেষণ করা হয়েছে।",
      abstractLang: "bn",
      abstractLabel: "Read the abstract",
      abstractNote: "Shortened: the background, aim and method parts of the Bengali abstract. The full abstract, with results, conclusion and keywords, is on Zenodo.",
      link: "https://zenodo.org/records/21746471",
      doi: "10.5281/zenodo.21746471"
    },
    {
      year: "2026",
      type: "Opinion · Dhaka Opinion Magazine",
      title: "Dhaka knows exactly who is extorting it",
      desc: "A public-interest argument naming the structure behind organised extortion in Dhaka.",
      abstract: "Dhaka Metropolitan Police's own records, reported in May 2026, list 1,280 people actively running extortion rackets across the capital, 148 of them armed. They operate in named groups, each controlling a defined territory, with rates that range from BDT 200 a day from a pavement vendor to BDT 20,000 a month from a business in areas like Gulshan and Banani. This is not an outside estimate or a reconstruction after the fact — it is the police's own accounting of an economy that runs in daylight, street by street, inside a system whose stated job is to shut it down.\n\nThe question this raises is not whether extortion exists in Dhaka; the police's own numbers already answer that. It is why an enforcement apparatus that can name 1,280 individuals and knows exactly which streets they control has not managed to dismantle the extortion network those individuals run.\n\nBut police have not been idle. Operation Devil Hunt, launched in February 2025, produced more than 9,000 arrests within a matter of weeks. A nationwide drive launched in May 2026 added more than 18,000 arrests on top of that. In June 2026 alone, Dhaka police reported 2,314 arrests, of which 1,446 were for drug offences. In May 2025, the army arrested Subrata Bain, one of the police's own listed \"top criminals,\" along with an arms cache. Read on their own, these are the kind of numbers that read as proof of resolve, and by the standard of activity, they are real. Read against the extortion figures, they look different.",
      abstractLabel: "Read the opening of the article",
      abstractNote: "The opening paragraphs of the article, as published in Dhaka Opinion Magazine.",
      link: "https://dhakaopinionmagazine.com/2026/09/02/dhaka-knows-exactly-who-is-extorting-it/",
      doi: ""
    },
    {
      year: "In progress",
      type: "Working paper",
      title: "One Payment, Many Labels: Why Extortion Statistics Cannot Be Compared across Countries, and What Bangladesh Reveals",
      desc: "A review of why extortion statistics cannot be set side by side across countries, with Bangladesh as a detailed case.",
      // Working abstract. The source count (76) may still change.
      abstract: "Many countries try to count extortion, yet the figures they produce cannot be set side by side. This article reviews 76 sources, including international standards, official statistics, laws, police data, research and an expert index, drawn mainly from Latin America and South Asia, with Bangladesh as a detailed case. It identifies four ways of measuring extortion: victimisation surveys, police and prosecutors' records, expert-perception scores and direct observation. Where business surveys ask about it, as in Mexico, extortion can be the most frequent crime against businesses, while only a small share is recorded by the authorities. Comparison breaks down for several reasons. The same act, a payment demanded under pressure by a public official, carries at least five different labels, which count it as extortion in some systems, as bribery in others, and outside the extortion category in one; sources also differ on attempts, mode of contact, repeated demands and units of count, and their series are broken by changes in law and method. Bangladesh shows the consequences. Its national citizen perception survey does not ask about extortion, two other household surveys combine it with bribery, and the police crime tables reviewed contain no extortion category. Drawing on items that already exist elsewhere, the article proposes, as an untested idea, a short survey add-on that records who made a demand, whether anything was paid and whether the demand recurs, so that extortion could be counted separately from bribery.",
      link: "",
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

  personalExperience: [
    {
      title: "Personal Hardware Building & Maintenance",
      points: [
        "Built, upgraded and repaired computer systems at component level — RAM, storage drives, GPUs, cooling and peripherals.",
        "Diagnosed hardware faults through systematic testing and component isolation, then replaced parts and rebuilt machines."
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
      caseStudy: "erp-bd",
      desc: "An all-in-one business system for Bangladeshi businesses: catalog, purchasing, per-piece stock with barcodes, branch transfers and a website builder on one secure platform, in Bangla and English. Security, catalog, purchasing, inventory and the website builder are built and tested; sales, accounting and the rest are planned.",
      img: "/assets/work-erp.svg",
      imgAlt: "Module map of ERP BD: security and roles, catalog, inventory, purchasing and the website builder are built and tested; orders, point of sale, accounting, production, payroll, customers, automation, an API and mobile app, and multi-tenant hosting are planned.",
      link: "",
      linkText: ""
    },
    {
      tag: "Browser extension",
      title: "DevForge — Web Dev Workbench",
      /*caseStudy: "devforge",*/
      desc: "A privacy-first Chrome extension that inspects, edits, audits, recreates, and exports any web interface — every operation runs locally, nothing leaves the browser.",
      img: "/assets/work-devforge.webp",
      imgAlt: "Preview of the DevForge — Web Dev Workbench browser extension.",
      actions: [
        { label: "Chrome Web Store", url: "https://chromewebstore.google.com/detail/devforge-%E2%80%94-web-dev-workbe/ofeflmhckkgemcpfkmieekiojoopdgae" }
      ]
    },
    {
      tag: "Android & web app · Testing preview",
      title: "Personal Assistant",
      desc: "A local-first app for tasks, money, monthly bills and shared mess accounts, in English and Bangla. No account, no server, nothing tracked. Encrypted backups, and exports to CSV, Excel and PDF. Testing preview; coming soon to Google Play.",
      img: "/assets/work-personal-assistant.webp",
      imgAlt: "Screenshot of the Personal Assistant web app on its Home screen with sample data loaded. A banner at the top says it is a testing preview and has a Download APK button. Below, an At a glance summary shows 5 open tasks, 2 due today, 0 overdue, 4 open debts, 3 savings goals and 4 wallets, with income and mess expenses in taka. The bottom bar has Home, Tasks, Money, Cycle and Settings.",
      actions: [
        { label: "Web preview", url: "https://assistant.hredoymesha.com/" },
        { label: "Download APK", url: "https://github.com/hredoymesha/personal-assistant/releases/latest/download/personal-assistant-preview.apk" }
      ]
    },
    {
      tag: "Business analytics · Excel",
      title: "Retail Operations Dashboard",
      caseStudy: "retail-operations-dashboard",
      desc: "An Excel workbook on three years of synthetic retail data: drop-downs by year, region, channel and category, contribution margin after shipping, fees and returns, a margin bridge, ABC-XYZ, reorder planning and customer cohorts, checked against Python.",
      img: "/assets/work-retail.webp",
      imgAlt: "Screenshot of the Excel retail operations dashboard with year, region, channel and category drop-downs, six KPI cards and charts, and a smaller panel showing the inventory sheet. The data is synthetic.",
      link: "https://github.com/hredoymesha/excel-retail-operations-dashboard",
      linkText: "Source"
    },
    // Hidden from Selected Work for now. Its case-study page and picture stay.
    /*
    {
      tag: "Python · KPI",
      title: "Fundraising KPI Analysis",
      caseStudy: "fundraising-kpi-analysis",
      desc: "A Python toolkit that turns fundraising activity logs into KPI reports. Built and tested on sample data.",
      img: "/assets/work-fundraising.webp",
      imgAlt: "Screenshot of the fundraising KPI web app showing conversation rate, pledge rate, pledges per hour and charts by region, using sample data.",
      link: "https://github.com/hredoymesha/fundraising-kpi-analysis",
      linkText: "Source"
    }
    */
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
        { name: "Team leadership" },
        { name: "Linux (basic familiarity)" }
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
      title: "VRGP",
      fullTitle: "Vessel Remote Guidance Protocol",
      org: "Åbo Akademi University",
      when: "2021 – 2022",
      desc: "Led a university project implementing the Vessel Remote Guidance Protocol (VRGP) for safer ship docking — managing the full lifecycle: planning, documentation, stakeholder communication, and final presentation. The project received a 100% mark.",
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
        },
        {
          name: "Microsoft 365",
          year: "2024"
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
