/**
 * Technical / Crawlability Auditor
 * Checks robots.txt, sitemap.xml, structured data, and indexability signals.
 * Uses both the rendered page and direct HTTP requests.
 */

const axios = require('axios');

class TechnicalAuditor {
  constructor() {
    this.name = 'Technical & Crawlability';
    this.weight = 9;
    this.maxScore = 100;
  }

  async audit(page, url) {
    const results = {
      name: this.name,
      weight: this.weight,
      score: 0,
      maxScore: this.maxScore,
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: [],
      recommendations: []
    };

    const origin = new URL(url).origin;

    // Pull structured data and head signals from the rendered page
    const pageData = await page.evaluate(() => {
      const jsonLdBlocks = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map((s) => {
        try {
          return JSON.parse(s.textContent);
        } catch {
          return { __invalid: true, raw: s.textContent.substring(0, 100) };
        }
      });

      const microdata = document.querySelectorAll('[itemscope]').length;
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
      const robotsMeta = document.querySelector('meta[name="robots"]')?.getAttribute('content') || null;
      const hreflang = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => ({
        lang: l.getAttribute('hreflang'),
        href: l.getAttribute('href')
      }));
      const favicon = document.querySelector('link[rel~="icon"]')?.getAttribute('href') || null;
      const ampLink = document.querySelector('link[rel="amphtml"]')?.getAttribute('href') || null;
      const charset = document.characterSet;
      const doctype = document.doctype ? document.doctype.name : null;

      return {
        jsonLdBlocks,
        microdata,
        canonical,
        robotsMeta,
        hreflang,
        favicon,
        ampLink,
        charset,
        doctype
      };
    });

    // Fetch robots.txt and sitemap over HTTP
    const robotsResult = await this.fetchRobots(origin);
    const sitemapResult = await this.fetchSitemap(origin, robotsResult.sitemaps);

    // Check 1: robots.txt
    results.checks.push(this.checkRobotsTxt(robotsResult));

    // Check 2: sitemap.xml
    results.checks.push(this.checkSitemap(sitemapResult));

    // Check 3: Structured data
    results.checks.push(this.checkStructuredData(pageData.jsonLdBlocks, pageData.microdata));

    // Check 4: Indexability
    results.checks.push(this.checkIndexability(pageData.robotsMeta, robotsResult));

    // Check 5: Canonical
    results.checks.push(this.checkCanonical(pageData.canonical));

    // Check 6: Doctype & charset
    results.checks.push(this.checkDoctype(pageData.doctype, pageData.charset));

    // Check 7: Favicon
    results.checks.push(this.checkFavicon(pageData.favicon));

    // Check 8: hreflang
    results.checks.push(this.checkHreflang(pageData.hreflang));

    results.checks.forEach((check) => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      ...pageData,
      robots: robotsResult,
      sitemap: sitemapResult,
      jsonLdTypes: pageData.jsonLdBlocks
        .map((b) => (Array.isArray(b) ? b.map((x) => x['@type']) : b['@type']))
        .flat()
        .filter(Boolean)
    };

    return results;
  }

  async fetchRobots(origin) {
    const result = { exists: false, status: null, sitemaps: [], hasDisallowAll: false, content: '' };
    try {
      const res = await axios.get(`${origin}/robots.txt`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'SanctifySEOBot/1.0' }
      });
      result.status = res.status;
      if (res.status === 200 && typeof res.data === 'string') {
        result.exists = true;
        result.content = res.data.substring(0, 2000);
        const lines = res.data.split('\n');
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (/^sitemap:/i.test(trimmed)) {
            result.sitemaps.push(trimmed.replace(/^sitemap:/i, '').trim());
          }
          if (/^disallow:\s*\/\s*$/i.test(trimmed)) {
            result.hasDisallowAll = true;
          }
        });
      }
    } catch (e) {
      result.error = e.message;
    }
    return result;
  }

  async fetchSitemap(origin, robotsSitemaps) {
    const result = { exists: false, status: null, url: null, urlCount: 0, isIndex: false };
    const candidates = [...(robotsSitemaps || []), `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
    for (const candidate of candidates) {
      try {
        const res = await axios.get(candidate, {
          timeout: 10000,
          validateStatus: () => true,
          headers: { 'User-Agent': 'SanctifySEOBot/1.0' }
        });
        if (res.status === 200 && typeof res.data === 'string' && res.data.includes('<')) {
          result.exists = true;
          result.status = res.status;
          result.url = candidate;
          result.isIndex = res.data.includes('<sitemapindex');
          result.urlCount = (res.data.match(/<loc>/g) || []).length;
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }
    return result;
  }

  checkRobotsTxt(robots) {
    const check = { name: 'robots.txt', status: 'pass', message: '', details: {} };
    if (!robots.exists) {
      check.status = 'warning';
      check.message = 'No robots.txt found';
      check.recommendation = 'Add a robots.txt file to guide search engine crawlers and reference your sitemap';
    } else if (robots.hasDisallowAll) {
      check.status = 'fail';
      check.message = 'robots.txt blocks all crawlers (Disallow: /)';
      check.recommendation = 'CRITICAL: Remove "Disallow: /" unless you intend to block all search engines';
    } else if (robots.sitemaps.length === 0) {
      check.status = 'warning';
      check.message = 'robots.txt exists but does not reference a sitemap';
      check.recommendation = 'Add a "Sitemap:" directive to robots.txt';
    } else {
      check.message = `robots.txt found with ${robots.sitemaps.length} sitemap reference(s)`;
    }
    check.details = { exists: robots.exists, sitemaps: robots.sitemaps, hasDisallowAll: robots.hasDisallowAll };
    return check;
  }

  checkSitemap(sitemap) {
    const check = { name: 'XML Sitemap', status: 'pass', message: '', details: {} };
    if (!sitemap.exists) {
      check.status = 'fail';
      check.message = 'No XML sitemap found';
      check.recommendation = 'Generate an XML sitemap and submit it to Google Search Console';
    } else if (sitemap.urlCount === 0) {
      check.status = 'warning';
      check.message = 'Sitemap found but appears empty';
      check.recommendation = 'Ensure your sitemap lists all important URLs';
    } else {
      check.message = `Sitemap found (${sitemap.isIndex ? 'index, ' : ''}${sitemap.urlCount} URLs)`;
    }
    check.details = sitemap;
    return check;
  }

  checkStructuredData(jsonLdBlocks, microdata) {
    const check = { name: 'Structured Data', status: 'pass', message: '', details: {} };
    const validBlocks = jsonLdBlocks.filter((b) => !b.__invalid);
    const invalidBlocks = jsonLdBlocks.filter((b) => b.__invalid);

    if (jsonLdBlocks.length === 0 && microdata === 0) {
      check.status = 'warning';
      check.message = 'No structured data (JSON-LD or microdata) found';
      check.recommendation =
        'Add Schema.org structured data (e.g., LocalBusiness, Organization, FAQPage) to enable rich results';
    } else if (invalidBlocks.length > 0) {
      check.status = 'warning';
      check.message = `${invalidBlocks.length} JSON-LD block(s) contain invalid JSON`;
      check.recommendation = 'Fix malformed JSON-LD so search engines can parse your structured data';
    } else {
      check.message = `${validBlocks.length} JSON-LD block(s) and ${microdata} microdata items found`;
    }
    check.details = { jsonLdCount: jsonLdBlocks.length, microdata, invalid: invalidBlocks.length };
    return check;
  }

  checkIndexability(robotsMeta, robots) {
    const check = { name: 'Indexability', status: 'pass', message: '', details: {} };
    if (robotsMeta && robotsMeta.includes('noindex')) {
      check.status = 'fail';
      check.message = 'Page has a noindex directive';
      check.recommendation = 'Remove the noindex meta tag if you want this page to appear in search results';
    } else if (robots.hasDisallowAll) {
      check.status = 'fail';
      check.message = 'Site-wide crawl block detected in robots.txt';
      check.recommendation = 'Allow crawling so the page can be indexed';
    } else {
      check.message = 'Page is indexable by search engines';
    }
    check.details = { robotsMeta };
    return check;
  }

  checkCanonical(canonical) {
    const check = { name: 'Canonical Tag', status: 'pass', message: '', details: {} };
    if (!canonical) {
      check.status = 'warning';
      check.message = 'No canonical tag found';
      check.recommendation = 'Add a self-referencing canonical tag to consolidate ranking signals';
    } else {
      check.message = 'Canonical tag is present';
    }
    check.details = { canonical };
    return check;
  }

  checkDoctype(doctype, charset) {
    const check = { name: 'Document Setup', status: 'pass', message: '', details: {} };
    const issues = [];
    if (!doctype || doctype.toLowerCase() !== 'html') issues.push('missing or non-HTML5 doctype');
    if (!charset || !charset.toLowerCase().includes('utf-8')) issues.push('charset is not UTF-8');

    if (issues.length > 0) {
      check.status = 'warning';
      check.message = `Document setup issues: ${issues.join(', ')}`;
      check.recommendation = 'Use <!DOCTYPE html> and UTF-8 character encoding';
    } else {
      check.message = 'HTML5 doctype and UTF-8 charset are properly set';
    }
    check.details = { doctype, charset };
    return check;
  }

  checkFavicon(favicon) {
    const check = { name: 'Favicon', status: 'pass', message: '', details: {} };
    if (!favicon) {
      check.status = 'warning';
      check.message = 'No favicon detected';
      check.recommendation = 'Add a favicon for branding and SERP appearance';
    } else {
      check.message = 'Favicon is present';
    }
    check.details = { favicon };
    return check;
  }

  checkHreflang(hreflang) {
    const check = { name: 'Hreflang', status: 'pass', message: '', details: {} };
    if (!hreflang || hreflang.length === 0) {
      check.message = 'No hreflang tags (fine for single-language sites)';
      check.recommendation = 'Add hreflang tags only if you serve multiple languages/regions';
    } else {
      check.message = `${hreflang.length} hreflang annotation(s) found`;
    }
    check.details = { hreflang };
    return check;
  }
}

module.exports = TechnicalAuditor;
