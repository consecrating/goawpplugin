/**
 * Accessibility SEO Auditor
 * Analyzes accessibility factors that affect SEO
 */

class AccessibilityAuditor {
  constructor() {
    this.name = 'Accessibility';
    this.weight = 7;
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

    const accessibilityData = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images).filter(img => !img.hasAttribute('alt')).length;

      const links = document.querySelectorAll('a');
      const emptyLinks = Array.from(links).filter(link => {
        const text = link.textContent.trim();
        const hasAriaLabel = link.hasAttribute('aria-label');
        const hasTitle = link.hasAttribute('title');
        const hasImgAlt = link.querySelector('img[alt]');
        return !text && !hasAriaLabel && !hasTitle && !hasImgAlt;
      }).length;

      const forms = document.querySelectorAll('input, select, textarea');
      const inputsWithoutLabels = Array.from(forms).filter(input => {
        const id = input.id;
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        const hasPlaceholder = input.hasAttribute('placeholder');
        const wrappedInLabel = input.closest('label') !== null;
        return !hasLabel && !hasAriaLabel && !hasPlaceholder && !wrappedInLabel;
      }).length;

      const buttons = document.querySelectorAll('button');
      const emptyButtons = Array.from(buttons).filter(btn => {
        const text = btn.textContent.trim();
        const hasAriaLabel = btn.hasAttribute('aria-label');
        const hasTitle = btn.hasAttribute('title');
        return !text && !hasAriaLabel && !hasTitle;
      }).length;

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const emptyHeadings = Array.from(headings).filter(h => !h.textContent.trim()).length;

      // Check for lang attribute
      const htmlLang = document.documentElement.lang;
      
      // Check for skip links
      const skipLinks = document.querySelectorAll('a[href^="#"]').length;
      const potentialSkipLinks = Array.from(document.querySelectorAll('a[href^="#"]'))
        .filter(a => {
          const text = a.textContent.toLowerCase();
          return text.includes('skip') || text.includes('jump');
        }).length;

      // Check for sufficient color contrast (basic check)
      const bodyStyles = window.getComputedStyle(document.body);
      const bodyColor = bodyStyles.color;
      const bodyBg = bodyStyles.backgroundColor;

      // Check for focus indicators
      const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
      
      // Check for ARIA landmarks
      const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').length;

      // Check for tables
      const tables = document.querySelectorAll('table');
      const tablesWithoutCaption = Array.from(tables).filter(t => !t.querySelector('caption')).length;
      const tablesWithoutHeaders = Array.from(tables).filter(t => !t.querySelector('th')).length;

      return {
        imagesWithoutAlt,
        emptyLinks,
        inputsWithoutLabels,
        emptyButtons,
        emptyHeadings,
        htmlLang,
        potentialSkipLinks,
        focusableElements: focusableElements.length,
        landmarks,
        tablesWithoutCaption,
        tablesWithoutHeaders,
        tables: tables.length
      };
    });

    // Check 1: Language Attribute
    const langCheck = this.checkLanguageAttribute(accessibilityData.htmlLang);
    results.checks.push(langCheck);

    // Check 2: Image Alt Text
    const altCheck = this.checkImageAltText(accessibilityData.imagesWithoutAlt);
    results.checks.push(altCheck);

    // Check 3: Form Labels
    const labelCheck = this.checkFormLabels(accessibilityData.inputsWithoutLabels);
    results.checks.push(labelCheck);

    // Check 4: Empty Links/Buttons
    const emptyCheck = this.checkEmptyInteractive(accessibilityData.emptyLinks, accessibilityData.emptyButtons);
    results.checks.push(emptyCheck);

    // Check 5: ARIA Landmarks
    const landmarkCheck = this.checkLandmarks(accessibilityData.landmarks);
    results.checks.push(landmarkCheck);

    // Check 6: Empty Headings
    const headingCheck = this.checkEmptyHeadings(accessibilityData.emptyHeadings);
    results.checks.push(headingCheck);

    // Check 7: Skip Links
    const skipCheck = this.checkSkipLinks(accessibilityData.potentialSkipLinks);
    results.checks.push(skipCheck);

    // Check 8: Table Accessibility
    const tableCheck = this.checkTableAccessibility(accessibilityData.tablesWithoutCaption, accessibilityData.tablesWithoutHeaders, accessibilityData.tables);
    results.checks.push(tableCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = accessibilityData;

    return results;
  }

  checkLanguageAttribute(lang) {
    const check = {
      name: 'Language Attribute',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!lang) {
      check.status = 'warning';
      check.message = 'Missing lang attribute on HTML element';
      check.recommendation = 'Add lang attribute (e.g., lang="en") to help screen readers pronounce content correctly';
    } else {
      check.message = `Language attribute is set: "${lang}"`;
    }

    check.details = { lang };
    return check;
  }

  checkImageAltText(imagesWithoutAlt) {
    const check = {
      name: 'Image Alt Text',
      status: 'pass',
      message: '',
      details: {}
    };

    if (imagesWithoutAlt > 0) {
      check.status = 'warning';
      check.message = `${imagesWithoutAlt} images missing alt text`;
      check.recommendation = 'Add descriptive alt text to all images for accessibility';
    } else {
      check.message = 'All images have alt attributes';
    }

    check.details = { count: imagesWithoutAlt };
    return check;
  }

  checkFormLabels(inputsWithoutLabels) {
    const check = {
      name: 'Form Labels',
      status: 'pass',
      message: '',
      details: {}
    };

    if (inputsWithoutLabels > 0) {
      check.status = 'warning';
      check.message = `${inputsWithoutLabels} form inputs without labels`;
      check.recommendation = 'Associate labels with form inputs using for/id or wrap inputs in labels';
    } else {
      check.message = 'All form inputs have associated labels';
    }

    check.details = { count: inputsWithoutLabels };
    return check;
  }

  checkEmptyInteractive(emptyLinks, emptyButtons) {
    const check = {
      name: 'Interactive Elements',
      status: 'pass',
      message: '',
      details: {}
    };

    const total = emptyLinks + emptyButtons;
    if (total > 0) {
      check.status = 'warning';
      check.message = `${emptyLinks} empty links, ${emptyButtons} empty buttons`;
      check.recommendation = 'Add descriptive text or aria-labels to all interactive elements';
    } else {
      check.message = 'All interactive elements have accessible names';
    }

    check.details = { emptyLinks, emptyButtons };
    return check;
  }

  checkLandmarks(landmarks) {
    const check = {
      name: 'Page Landmarks',
      status: 'pass',
      message: '',
      details: {}
    };

    if (landmarks === 0) {
      check.status = 'warning';
      check.message = 'No ARIA landmarks found';
      check.recommendation = 'Add semantic HTML5 elements (main, nav, header, footer) or ARIA landmarks';
    } else if (landmarks < 3) {
      check.status = 'warning';
      check.message = `Only ${landmarks} landmarks found`;
      check.recommendation = 'Consider adding more semantic structure (main, nav, header, footer)';
    } else {
      check.message = `${landmarks} landmarks found`;
    }

    check.details = { count: landmarks };
    return check;
  }

  checkEmptyHeadings(emptyHeadings) {
    const check = {
      name: 'Empty Headings',
      status: 'pass',
      message: '',
      details: {}
    };

    if (emptyHeadings > 0) {
      check.status = 'fail';
      check.message = `${emptyHeadings} empty heading elements`;
      check.recommendation = 'Remove empty headings or add content';
    } else {
      check.message = 'No empty headings';
    }

    check.details = { count: emptyHeadings };
    return check;
  }

  checkSkipLinks(skipLinks) {
    const check = {
      name: 'Skip Navigation',
      status: 'pass',
      message: '',
      details: {}
    };

    if (skipLinks === 0) {
      check.status = 'warning';
      check.message = 'No skip navigation link found';
      check.recommendation = 'Add a skip link at the top of the page for keyboard users';
    } else {
      check.message = 'Skip navigation link detected';
    }

    check.details = { count: skipLinks };
    return check;
  }

  checkTableAccessibility(withoutCaption, withoutHeaders, total) {
    const check = {
      name: 'Table Accessibility',
      status: 'pass',
      message: '',
      details: {}
    };

    if (total === 0) {
      check.message = 'No tables on page';
    } else {
      const issues = [];
      if (withoutCaption > 0) issues.push(`${withoutCaption} tables without captions`);
      if (withoutHeaders > 0) issues.push(`${withoutHeaders} tables without headers`);

      if (issues.length > 0) {
        check.status = 'warning';
        check.message = issues.join(', ');
        check.recommendation = 'Add captions and header cells to tables for accessibility';
      } else {
        check.message = `${total} tables are properly structured`;
      }
    }

    check.details = { withoutCaption, withoutHeaders, total };
    return check;
  }
}

module.exports = AccessibilityAuditor;
