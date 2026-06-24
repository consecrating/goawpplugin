/**
 * Report storage and management.
 * Persists audit results as timestamped JSON and maintains an index
 * the dashboard can consume.
 */

const fs = require('fs');
const path = require('path');

class ReportManager {
  constructor(auditsDir) {
    this.auditsDir = auditsDir || path.join(process.cwd(), 'audits');
    this.dataDir = path.join(this.auditsDir, 'data');
    this.indexFile = path.join(this.auditsDir, 'index.json');
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.auditsDir)) fs.mkdirSync(this.auditsDir, { recursive: true });
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  slugify(url) {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .substring(0, 60);
  }

  save(auditResult, extra = {}) {
    const stamp = auditResult.timestamp.replace(/[:.]/g, '-');
    const slug = this.slugify(auditResult.url);
    const filename = `${slug}__${stamp}.json`;
    const filepath = path.join(this.dataDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(auditResult, null, 2), 'utf8');

    this.updateIndex({
      id: auditResult.id,
      file: path.join('data', filename),
      htmlFile: extra.htmlFile || null,
      url: auditResult.url,
      timestamp: auditResult.timestamp,
      overallScore: auditResult.overallScore,
      grade: auditResult.grade,
      summary: auditResult.summary,
      error: auditResult.error
    });

    return filepath;
  }

  updateIndex(entry) {
    let index = [];
    if (fs.existsSync(this.indexFile)) {
      try {
        index = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
      } catch {
        index = [];
      }
    }
    index.unshift(entry);
    // Keep the most recent 100 audits in the index
    index = index.slice(0, 100);
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf8');
  }

  getIndex() {
    if (!fs.existsSync(this.indexFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
    } catch {
      return [];
    }
  }
}

module.exports = ReportManager;
