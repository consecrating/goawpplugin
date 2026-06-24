# Sanctify · Technical SEO Auditor

Sanctify is a Node.js command-line tool that runs a full technical SEO audit of any
website using a real headless browser (Puppeteer/Chromium). It measures **Core Web
Vitals**, inspects on-page SEO signals, and produces a **self-contained interactive
HTML report** plus a **history dashboard** — no external services, no API keys.

It was built and validated against [https://www.cpofficial.in](https://www.cpofficial.in)
(a WordPress site), but works on any public URL.

---

## What it checks

Sanctify runs 10 independent auditors. Each returns a 0–100 score, individual
pass/warn/fail checks, and actionable recommendations. The overall score is a
**weighted average** of all categories, then mapped to a letter grade.

| # | Category | Weight | What it looks at |
|---|----------|:------:|------------------|
| 1 | **Meta Tags** | 10 | Title, meta description, canonical, Open Graph, Twitter cards, robots meta |
| 2 | **Performance & Core Web Vitals** | 10 | LCP, FCP, CLS, INP, page load time, page weight, DOM size, request count |
| 3 | **Mobile SEO** | 10 | Viewport, responsive layout, tap target sizing, mobile rendering |
| 4 | **Content Quality** | 9 | Word count, text-to-HTML ratio, thin-content detection, keyword presence |
| 5 | **Technical & Crawlability** | 9 | robots.txt, XML sitemap, structured data (JSON-LD), HTTP status |
| 6 | **Headings Structure** | 8 | Single H1, heading hierarchy, empty/duplicate headings |
| 7 | **Links Structure** | 8 | Internal vs external links, broken-link signals, descriptive anchors |
| 8 | **Images SEO** | 7 | alt text, dimensions, modern formats, lazy loading |
| 9 | **Accessibility** | 7 | Lang attribute, ARIA, contrast hints, form labels |
| 10 | **Security SEO** | 6 | HTTPS, HSTS, mixed content, security headers |

### Scoring & grades

A category's score is `round(passed / totalChecks * 100)`. The overall score is the
weight-weighted average across all categories:

```
overall = Σ(categoryScore × weight) / Σ(weight)
```

| Score | Grade |
|-------|:-----:|
| 90–100 | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| 50–59 | E |
| < 50 | F |

---

## Installation

Requires **Node.js ≥ 18** (built and tested on Node 22).

```bash
cd sanctify-seo-auditor
npm install
```

`npm install` downloads a matching Chromium build for Puppeteer automatically.

### ⚠️ Sandbox runtime note (important)

In this sandbox, the bundled Chromium is missing the system **NSS** libraries, which
were extracted manually into `/opt/chrome-libs`. **Every command that launches the
browser must be prefixed with `LD_LIBRARY_PATH=/opt/chrome-libs`**, otherwise Chrome
fails to start with an `error while loading shared libraries: libnss3.so` message.

```bash
LD_LIBRARY_PATH=/opt/chrome-libs node bin/cli.js audit https://www.cpofficial.in
```

On a normal machine (with NSS already installed system-wide) you can drop the prefix:

```bash
node bin/cli.js audit https://www.cpofficial.in
```

---

## Usage

### Run an audit

```bash
LD_LIBRARY_PATH=/opt/chrome-libs node bin/cli.js audit <url> [options]
```

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `-t, --timeout <ms>` | `60000` | Navigation timeout in milliseconds |
| `--no-headless` | off | Launch a visible browser (debugging) |
| `-o, --output <dir>` | `./audits` | Where reports are written |
| `--no-html` | off | Skip the standalone HTML report (JSON only) |

The CLI prints a colored summary (overall score, per-category bars, top
recommendations) and writes all artifacts to the output directory.

### List previous audits

```bash
node bin/cli.js list
```

### Serve the dashboard over HTTP

```bash
node bin/cli.js serve --port 4321
# then open http://localhost:4321/
```

`serve` hosts the `audits/` folder and rewrites `/` to the history dashboard. If you
have no localhost access, just open the generated HTML files directly (see below).

---

## Output

After an audit, the `audits/` directory contains:

| File | Description |
|------|-------------|
| `latest.html` | The most recent audit as a **self-contained** interactive report (inline CSS/JS — open it directly in any browser) |
| `report__<site>__<timestamp>.html` | Timestamped copy of each HTML report |
| `dashboard.html` | History dashboard: KPIs, score-trend chart, and links to every report |
| `data/<site>__<timestamp>.json` | Full structured results (every check, metric, and recommendation) |
| `index.json` | Lightweight index of all past audits |

The HTML report includes a score gauge, a Core Web Vitals panel, collapsible
per-category sections with each check, and a prioritized recommendations list. It is
fully standalone, so it can be emailed or committed to a repo and opened anywhere.

---

## Example: latest result for cpofficial.in

A real audit of `https://www.cpofficial.in` produced:

- **Overall: 61 / 100 — Grade D**
- Core Web Vitals: **LCP 12.6s** (poor), **FCP 3.4s** (needs work), **CLS 0.108** (borderline)
- Page weight: **2.25 MB**
- 15 prioritized recommendations (image compression, render-blocking resources,
  thin content, missing structured data, etc.)

These map directly to the SEO improvements that will help the site rank higher.

---

## Project structure

```
sanctify-seo-auditor/
├── bin/
│   └── cli.js                 # CLI entrypoint (audit / serve / list)
├── src/
│   ├── engine.js              # Puppeteer orchestrator + weighted scoring
│   ├── report.js              # JSON storage + index.json
│   ├── dashboard-builder.js   # Builds the self-contained HTML report
│   ├── history-dashboard.js   # Builds dashboard.html (trend + history)
│   └── auditors/              # 10 category auditors
│       ├── meta-auditor.js
│       ├── technical-auditor.js
│       ├── performance-auditor.js
│       ├── mobile-auditor.js
│       ├── content-auditor.js
│       ├── headings-auditor.js
│       ├── images-auditor.js
│       ├── links-auditor.js
│       ├── security-auditor.js
│       └── accessibility-auditor.js
└── audits/                    # Generated reports (created on first run)
```

## License

MIT
