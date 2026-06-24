/**
 * Sanctify SEO Audit Engine
 * Loads a page with a headless browser and runs all auditors,
 * then computes a weighted overall score.
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const MetaAuditor = require('./auditors/meta-auditor');
const HeadingsAuditor = require('./auditors/headings-auditor');
const ContentAuditor = require('./auditors/content-auditor');
const PerformanceAuditor = require('./auditors/performance-auditor');
const MobileAuditor = require('./auditors/mobile-auditor');
const ImagesAuditor = require('./auditors/images-auditor');
const LinksAuditor = require('./auditors/links-auditor');
const SecurityAuditor = require('./auditors/security-auditor');
const AccessibilityAuditor = require('./auditors/accessibility-auditor');
const TechnicalAuditor = require('./auditors/technical-auditor');

class SeoEngine {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 60000,
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (compatible; SanctifySEOBot/1.0; +https://github.com/sanctify-seo)',
      headless: options.headless !== false,
      ...options
    };

    // Order matters only for display; scoring uses weights
    this.auditors = [
      new MetaAuditor(),
      new TechnicalAuditor(),
      new PerformanceAuditor(),
      new MobileAuditor(),
      new ContentAuditor(),
      new HeadingsAuditor(),
      new ImagesAuditor(),
      new LinksAuditor(),
      new SecurityAuditor(),
      new AccessibilityAuditor()
    ];
  }

  async launchBrowser() {
    return puppeteer.launch({
      headless: this.options.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }

  /**
   * Run a full audit against a single URL.
   * @param {string} url
   * @param {(msg: string) => void} onProgress
   */
  async audit(url, onProgress = () => {}) {
    const normalizedUrl = this.normalizeUrl(url);
    const startTime = Date.now();
    let browser;

    const auditResult = {
      id: uuidv4(),
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      engine: 'puppeteer',
      duration: 0,
      overallScore: 0,
      grade: 'F',
      categories: [],
      summary: { passed: 0, failed: 0, warnings: 0, totalChecks: 0 },
      topRecommendations: [],
      error: null
    };

    try {
      onProgress('Launching headless browser...');
      browser = await this.launchBrowser();
      const page = await browser.newPage();

      await page.setUserAgent(this.options.userAgent);
      await page.setViewport({ width: 1366, height: 768 });

      onProgress(`Loading ${normalizedUrl}...`);
      const response = await page.goto(normalizedUrl, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });

      auditResult.httpStatus = response ? response.status() : null;
      auditResult.finalUrl = page.url();

      // Run each auditor
      for (const auditor of this.auditors) {
        onProgress(`Auditing: ${auditor.name}...`);
        try {
          // Reset viewport before each auditor (mobile auditor changes it)
          await page.setViewport({ width: 1366, height: 768 });
          const result = await auditor.audit(page, normalizedUrl);
          auditResult.categories.push(result);
        } catch (err) {
          auditResult.categories.push({
            name: auditor.name,
            weight: auditor.weight,
            score: 0,
            error: err.message,
            checks: [],
            passed: 0,
            failed: 0,
            warnings: 0
          });
        }
      }

      this.computeScores(auditResult);
      this.collectRecommendations(auditResult);
    } catch (err) {
      auditResult.error = err.message;
    } finally {
      if (browser) await browser.close();
      auditResult.duration = Date.now() - startTime;
    }

    return auditResult;
  }

  computeScores(auditResult) {
    let weightedSum = 0;
    let totalWeight = 0;

    auditResult.categories.forEach((cat) => {
      const weight = cat.weight || 1;
      weightedSum += (cat.score || 0) * weight;
      totalWeight += weight;

      auditResult.summary.passed += cat.passed || 0;
      auditResult.summary.failed += cat.failed || 0;
      auditResult.summary.warnings += cat.warnings || 0;
      auditResult.summary.totalChecks += (cat.checks || []).length;
    });

    auditResult.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    auditResult.grade = this.scoreToGrade(auditResult.overallScore);
  }

  collectRecommendations(auditResult) {
    const recs = [];
    auditResult.categories.forEach((cat) => {
      (cat.checks || []).forEach((check) => {
        if (check.recommendation && (check.status === 'fail' || check.status === 'warning')) {
          recs.push({
            category: cat.name,
            check: check.name,
            severity: check.status === 'fail' ? 'high' : 'medium',
            recommendation: check.recommendation,
            weight: cat.weight || 1
          });
        }
      });
    });

    // Sort: high severity first, then by category weight
    recs.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
      return b.weight - a.weight;
    });

    auditResult.topRecommendations = recs.slice(0, 15);
    auditResult.allRecommendations = recs;
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    if (score >= 50) return 'E';
    return 'F';
  }

  normalizeUrl(url) {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  }
}

module.exports = SeoEngine;
