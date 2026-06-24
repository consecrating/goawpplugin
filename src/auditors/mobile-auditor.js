/**
 * Mobile SEO Auditor
 * Analyzes mobile optimization and responsiveness
 */

class MobileAuditor {
  constructor() {
    this.name = 'Mobile SEO';
    this.weight = 10;
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

    // First, check desktop viewport
    const desktopData = await page.evaluate(() => {
      return {
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
        hasViewport: !!document.querySelector('meta[name="viewport"]'),
        fontSize: window.getComputedStyle(document.body).fontSize,
        bodyWidth: document.body.scrollWidth
      };
    });

    // Set mobile viewport and check mobile-specific issues
    await page.setViewport({ width: 375, height: 667 });
    
    const mobileData = await page.evaluate(() => {
      const touchElements = document.querySelectorAll('button, a, input, select, textarea');
      const smallTouchTargets = [];
      
      touchElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 48 || rect.height < 48) {
            smallTouchTargets.push({
              tag: el.tagName,
              text: el.textContent.substring(0, 20),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }
      });

      // Check for horizontal scroll
      const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;

      // Check for fixed elements that might cause issues
      const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
      
      // Check for flash of unstyled content indicators
      const inlineStyles = document.querySelectorAll('[style]').length;
      
      // Check for plugins
      const flash = document.querySelectorAll('object, embed').length;
      const javaApplets = document.querySelectorAll('applet').length;

      // Check font sizes
      const allText = document.querySelectorAll('p, li, span, a, h1, h2, h3, h4, h5, h6');
      let smallFontCount = 0;
      allText.forEach(el => {
        const fontSize = window.getComputedStyle(el).fontSize;
        const size = parseFloat(fontSize);
        if (size < 12) smallFontCount++;
      });

      return {
        smallTouchTargets: smallTouchTargets.slice(0, 10),
        hasHorizontalScroll,
        fixedElementsCount: fixedElements.length,
        inlineStylesCount: inlineStyles,
        hasFlash: flash > 0,
        hasJavaApplets: javaApplets > 0,
        smallFontCount,
        viewportWidth: window.innerWidth,
        documentWidth: document.body.scrollWidth
      };
    });

    // Check 1: Viewport Meta
    const viewportCheck = this.checkViewport(desktopData.viewport, desktopData.hasViewport);
    results.checks.push(viewportCheck);

    // Check 2: Touch Targets
    const touchCheck = this.checkTouchTargets(mobileData.smallTouchTargets);
    results.checks.push(touchCheck);

    // Check 3: Horizontal Scroll
    const scrollCheck = this.checkHorizontalScroll(mobileData.hasHorizontalScroll, mobileData.documentWidth, mobileData.viewportWidth);
    results.checks.push(scrollCheck);

    // Check 4: Font Size
    const fontCheck = this.checkFontSizes(mobileData.smallFontCount);
    results.checks.push(fontCheck);

    // Check 5: Flash/Plugins
    const pluginCheck = this.checkPlugins(mobileData.hasFlash, mobileData.hasJavaApplets);
    results.checks.push(pluginCheck);

    // Check 6: Mobile Performance Indicators
    const perfCheck = this.checkMobilePerformance(mobileData.inlineStylesCount, mobileData.fixedElementsCount);
    results.checks.push(perfCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      viewport: desktopData.viewport,
      viewportWidth: mobileData.viewportWidth,
      documentWidth: mobileData.documentWidth,
      smallTouchTargets: mobileData.smallTouchTargets.length,
      hasHorizontalScroll: mobileData.hasHorizontalScroll
    };

    return results;
  }

  checkViewport(viewport, hasViewport) {
    const check = {
      name: 'Viewport Meta Tag',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!hasViewport) {
      check.status = 'fail';
      check.message = 'Missing viewport meta tag';
      check.recommendation = 'Add <meta name="viewport" content="width=device-width, initial-scale=1">';
    } else if (!viewport.includes('width=device-width')) {
      check.status = 'warning';
      check.message = 'Viewport may not be mobile-optimized';
      check.recommendation = 'Ensure viewport includes "width=device-width"';
    } else if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
      check.status = 'warning';
      check.message = 'Viewport restricts user scaling';
      check.recommendation = 'Remove user-scalable=no and maximum-scale restrictions for accessibility';
    } else {
      check.message = 'Viewport is properly configured for mobile';
    }

    check.details = { viewport };
    return check;
  }

  checkTouchTargets(smallTargets) {
    const check = {
      name: 'Touch Target Size',
      status: 'pass',
      message: '',
      details: {}
    };

    if (smallTargets.length === 0) {
      check.message = 'All touch targets are appropriately sized';
    } else if (smallTargets.length < 5) {
      check.status = 'warning';
      check.message = `${smallTargets.length} touch targets may be too small`;
      check.recommendation = 'Increase touch target size to at least 48x48px for better mobile UX';
    } else {
      check.status = 'warning';
      check.message = `${smallTargets.length} touch targets are too small`;
      check.recommendation = 'Increase button and link sizes to at least 48x48px';
    }

    check.details = { count: smallTargets.length, samples: smallTargets.slice(0, 5) };
    return check;
  }

  checkHorizontalScroll(hasScroll, docWidth, viewportWidth) {
    const check = {
      name: 'Horizontal Scroll',
      status: 'pass',
      message: '',
      details: {}
    };

    if (hasScroll) {
      check.status = 'fail';
      check.message = `Page causes horizontal scroll (${docWidth}px wide on ${viewportWidth}px viewport)`;
      check.recommendation = 'Fix elements causing horizontal overflow, use responsive design';
    } else {
      check.message = 'No horizontal scroll on mobile';
    }

    check.details = { documentWidth: docWidth, viewportWidth };
    return check;
  }

  checkFontSizes(smallFontCount) {
    const check = {
      name: 'Font Size',
      status: 'pass',
      message: '',
      details: {}
    };

    if (smallFontCount > 10) {
      check.status = 'warning';
      check.message = `${smallFontCount} elements have font size smaller than 12px`;
      check.recommendation = 'Increase font sizes to at least 16px for body text on mobile';
    } else if (smallFontCount > 0) {
      check.message = 'Font sizes are generally good';
    } else {
      check.message = 'All font sizes are appropriate for mobile';
    }

    check.details = { smallFontCount };
    return check;
  }

  checkPlugins(hasFlash, hasJavaApplets) {
    const check = {
      name: 'Mobile-Incompatible Content',
      status: 'pass',
      message: '',
      details: {}
    };

    if (hasFlash || hasJavaApplets) {
      check.status = 'fail';
      check.message = 'Page contains Flash or Java applets';
      check.recommendation = 'Remove Flash and Java - they are not supported on mobile devices';
    } else {
      check.message = 'No Flash or Java content detected';
    }

    check.details = { hasFlash, hasJavaApplets };
    return check;
  }

  checkMobilePerformance(inlineStyles, fixedElements) {
    const check = {
      name: 'Mobile Performance',
      status: 'pass',
      message: '',
      details: {}
    };

    let issues = [];

    if (fixedElements > 3) {
      issues.push(`${fixedElements} fixed-position elements can cause issues on mobile`);
    }

    if (inlineStyles > 50) {
      issues.push('High number of inline styles may slow rendering');
    }

    if (issues.length > 1) {
      check.status = 'warning';
      check.message = 'Multiple mobile performance concerns';
      check.recommendation = 'Minimize fixed-position elements and inline styles';
    } else if (issues.length === 1) {
      check.status = 'warning';
      check.message = issues[0];
    } else {
      check.message = 'Mobile performance looks good';
    }

    check.details = { inlineStyles, fixedElements };
    return check;
  }
}

module.exports = MobileAuditor;
