/**
 * Headings Structure Auditor
 * Analyzes heading hierarchy for SEO best practices
 */

class HeadingsAuditor {
  constructor() {
    this.name = 'Headings Structure';
    this.weight = 8;
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

    const headingsData = await page.evaluate(() => {
      const headings = {};
      const h1Elements = document.querySelectorAll('h1');
      const h2Elements = document.querySelectorAll('h2');
      const h3Elements = document.querySelectorAll('h3');
      const h4Elements = document.querySelectorAll('h4');
      const h5Elements = document.querySelectorAll('h5');
      const h6Elements = document.querySelectorAll('h6');

      headings.h1 = Array.from(h1Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));
      headings.h2 = Array.from(h2Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));
      headings.h3 = Array.from(h3Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));
      headings.h4 = Array.from(h4Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));
      headings.h5 = Array.from(h5Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));
      headings.h6 = Array.from(h6Elements).map(h => ({
        text: h.textContent.trim(),
        length: h.textContent.trim().length
      }));

      // Check heading order
      const allHeadings = [];
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        document.querySelectorAll(tag).forEach(el => {
          allHeadings.push({
            tag: tag,
            level: parseInt(tag.replace('h', '')),
            text: el.textContent.trim().substring(0, 50)
          });
        });
      });

      return {
        headings,
        allHeadings,
        counts: {
          h1: headings.h1.length,
          h2: headings.h2.length,
          h3: headings.h3.length,
          h4: headings.h4.length,
          h5: headings.h5.length,
          h6: headings.h6.length
        },
        totalHeadings: allHeadings.length
      };
    });

    // Check 1: H1 Presence
    const h1Check = this.checkH1Presence(headingsData.headings.h1);
    results.checks.push(h1Check);

    // Check 2: Single H1
    const singleH1Check = this.checkSingleH1(headingsData.headings.h1);
    results.checks.push(singleH1Check);

    // Check 3: H1 Content
    if (headingsData.headings.h1.length > 0) {
      const h1ContentCheck = this.checkH1Content(headingsData.headings.h1[0]);
      results.checks.push(h1ContentCheck);
    }

    // Check 4: Heading Hierarchy
    const hierarchyCheck = this.checkHeadingHierarchy(headingsData.allHeadings);
    results.checks.push(hierarchyCheck);

    // Check 5: Heading Structure
    const structureCheck = this.checkHeadingStructure(headingsData.counts);
    results.checks.push(structureCheck);

    // Check 6: Empty Headings
    const emptyCheck = this.checkEmptyHeadings(headingsData.headings);
    results.checks.push(emptyCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = headingsData;

    return results;
  }

  checkH1Presence(h1s) {
    const check = {
      name: 'H1 Tag Presence',
      status: 'pass',
      message: '',
      details: {}
    };

    if (h1s.length === 0) {
      check.status = 'fail';
      check.message = 'No H1 tag found on the page';
      check.recommendation = 'Add a single H1 tag that describes the main topic of the page';
    } else {
      check.message = 'H1 tag is present';
    }

    check.details = { h1Count: h1s.length };
    return check;
  }

  checkSingleH1(h1s) {
    const check = {
      name: 'Single H1 Tag',
      status: 'pass',
      message: '',
      details: {}
    };

    if (h1s.length > 1) {
      check.status = 'warning';
      check.message = `Multiple H1 tags found (${h1s.length})`;
      check.recommendation = 'Use only one H1 tag per page for better SEO structure';
      check.details = { h1s: h1s.map(h => h.text) };
    } else if (h1s.length === 1) {
      check.message = 'Exactly one H1 tag found (recommended)';
    } else {
      check.status = 'fail';
      check.message = 'No H1 tag found';
    }

    return check;
  }

  checkH1Content(h1) {
    const check = {
      name: 'H1 Content Quality',
      status: 'pass',
      message: '',
      details: { text: h1.text, length: h1.length }
    };

    if (h1.length < 10) {
      check.status = 'warning';
      check.message = `H1 may be too short (${h1.length} characters)`;
      check.recommendation = 'Consider a more descriptive H1 that includes target keywords';
    } else if (h1.length > 70) {
      check.status = 'warning';
      check.message = `H1 is quite long (${h1.length} characters)`;
      check.recommendation = 'Consider a more concise H1 while keeping important keywords';
    } else {
      check.message = `H1 length is appropriate (${h1.length} characters)`;
    }

    return check;
  }

  checkHeadingHierarchy(allHeadings) {
    const check = {
      name: 'Heading Hierarchy',
      status: 'pass',
      message: '',
      details: { issues: [] }
    };

    const issues = [];
    let prevLevel = 0;

    for (let i = 0; i < allHeadings.length; i++) {
      const heading = allHeadings[i];
      if (prevLevel > 0 && heading.level > prevLevel + 1) {
        issues.push({
          issue: 'skipped_level',
          from: `h${prevLevel}`,
          to: heading.tag,
          text: heading.text
        });
      }
      prevLevel = heading.level;
    }

    if (issues.length > 0) {
      check.status = 'warning';
      check.message = `Found ${issues.length} heading hierarchy issues`;
      check.recommendation = 'Ensure headings follow a logical order (h1 → h2 → h3) without skipping levels';
      check.details.issues = issues;
    } else if (allHeadings.length > 0) {
      check.message = 'Heading hierarchy is properly structured';
    } else {
      check.status = 'warning';
      check.message = 'No headings found on the page';
      check.recommendation = 'Add heading tags to structure your content';
    }

    return check;
  }

  checkHeadingStructure(counts) {
    const check = {
      name: 'Content Structure',
      status: 'pass',
      message: '',
      details: { counts }
    };

    const hasH2 = counts.h2 > 0;
    const hasH3 = counts.h3 > 0;
    const totalHeadings = Object.values(counts).reduce((a, b) => a + b, 0);

    if (!hasH2 && totalHeadings > 1) {
      check.status = 'warning';
      check.message = 'No H2 tags found. Consider using H2 for section headers';
      check.recommendation = 'Use H2 tags to break up content into sections';
    } else if (totalHeadings < 3) {
      check.status = 'warning';
      check.message = 'Very few headings on the page';
      check.recommendation = 'Add more headings to better structure your content';
    } else {
      check.message = `Good heading structure: H1(${counts.h1}) H2(${counts.h2}) H3(${counts.h3}) H4(${counts.h4})`;
    }

    return check;
  }

  checkEmptyHeadings(headings) {
    const check = {
      name: 'Empty Headings',
      status: 'pass',
      message: '',
      details: { emptyHeadings: [] }
    };

    const emptyHeadings = [];
    Object.entries(headings).forEach(([level, items]) => {
      items.forEach((item, index) => {
        if (!item.text || item.length === 0) {
          emptyHeadings.push({ level, index: index + 1 });
        }
      });
    });

    if (emptyHeadings.length > 0) {
      check.status = 'fail';
      check.message = `Found ${emptyHeadings.length} empty heading(s)`;
      check.recommendation = 'Remove or add content to empty heading tags';
      check.details.emptyHeadings = emptyHeadings;
    } else {
      check.message = 'No empty headings found';
    }

    return check;
  }
}

module.exports = HeadingsAuditor;
