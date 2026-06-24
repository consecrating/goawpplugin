/**
 * Performance Auditor
 * Analyzes Core Web Vitals and performance metrics
 */

class PerformanceAuditor {
  constructor() {
    this.name = 'Performance & Core Web Vitals';
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

    // Get performance metrics
    const performanceData = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      // Calculate page weight
      let totalSize = 0;
      resources.forEach(r => {
        totalSize += r.transferSize || r.encodedBodySize || 0;
      });

      // Resource breakdown
      const resourceBreakdown = {
        scripts: resources.filter(r => r.initiatorType === 'script').length,
        stylesheets: resources.filter(r => r.initiatorType === 'link' && r.name.includes('.css')).length,
        images: resources.filter(r => r.initiatorType === 'img' || (r.initiatorType === 'link' && r.name.match(/\.(jpg|jpeg|png|gif|webp|svg)/i))).length,
        fonts: resources.filter(r => r.name.match(/\.(woff|woff2|ttf|otf)/i)).length,
        other: resources.filter(r => !['script', 'link', 'img'].includes(r.initiatorType)).length
      };

      return {
        // Navigation timing
        domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.fetchStart : 0,
        loadComplete: perfData ? perfData.loadEventEnd - perfData.fetchStart : 0,
        domInteractive: perfData ? perfData.domInteractive - perfData.fetchStart : 0,
        
        // Paint timing
        fcp: fcp ? fcp.startTime : null,
        lcp: null,
        
        // Resources
        totalResources: resources.length,
        totalSize: totalSize,
        resourceBreakdown,
        
        // DOM stats
        domNodes: document.querySelectorAll('*').length,
        domDepth: (function getDepth(el, depth) {
          if (!el || !el.children || el.children.length === 0) return depth;
          let max = depth;
          for (const child of el.children) {
            max = Math.max(max, getDepth(child, depth + 1));
          }
          return max;
        })(document.body, 0),
        
        // Scripts
        scripts: document.querySelectorAll('script').length,
        inlineScripts: document.querySelectorAll('script:not([src])').length
      };
    });

    // Get CLS (Cumulative Layout Shift)
    const clsData = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        
        // Wait a bit to collect CLS data
        setTimeout(() => {
          observer.disconnect();
          resolve({ cls: clsValue });
        }, 1000);
      });
    });

    // Get INP (Interaction to Next Paint) - simplified
    const inpData = await page.evaluate(() => {
      return new Promise((resolve) => {
        let maxInteraction = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            maxInteraction = Math.max(maxInteraction, entry.duration);
          }
        });
        observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        
        setTimeout(() => {
          observer.disconnect();
          resolve({ inp: maxInteraction });
        }, 500);
      });
    });

    // Get LCP (Largest Contentful Paint) via buffered observer
    const lcpData = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcpValue = null;
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) lcpValue = last.renderTime || last.loadTime || last.startTime;
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve({ lcp: lcpValue });
          }, 1000);
        } catch (e) {
          resolve({ lcp: null });
        }
      });
    });
    performanceData.lcp = lcpData.lcp;

    // Check 1: First Contentful Paint
    const fcpCheck = this.checkFCP(performanceData.fcp);
    results.checks.push(fcpCheck);

    // Check 2: Largest Contentful Paint
    const lcpCheck = this.checkLCP(performanceData.lcp);
    results.checks.push(lcpCheck);

    // Check 3: Cumulative Layout Shift
    const clsCheck = this.checkCLS(clsData.cls);
    results.checks.push(clsCheck);

    // Check 4: Interaction to Next Paint
    const inpCheck = this.checkINP(inpData.inp);
    results.checks.push(inpCheck);

    // Check 5: Page Load Time
    const loadCheck = this.checkLoadTime(performanceData.loadComplete);
    results.checks.push(loadCheck);

    // Check 6: Page Size
    const sizeCheck = this.checkPageSize(performanceData.totalSize);
    results.checks.push(sizeCheck);

    // Check 7: DOM Size
    const domCheck = this.checkDOMSize(performanceData.domNodes);
    results.checks.push(domCheck);

    // Check 8: Resource Count
    const resourceCheck = this.checkResourceCount(performanceData.totalResources, performanceData.resourceBreakdown);
    results.checks.push(resourceCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      ...performanceData,
      cls: clsData.cls,
      inp: inpData.inp,
      totalSizeFormatted: this.formatBytes(performanceData.totalSize)
    };

    return results;
  }

  getDOMDepth(element, depth = 0) {
    if (!element || !element.children) return depth;
    let maxDepth = depth;
    for (const child of element.children) {
      maxDepth = Math.max(maxDepth, this.getDOMDepth(child, depth + 1));
    }
    return maxDepth;
  }

  checkFCP(fcp) {
    const check = {
      name: 'First Contentful Paint (FCP)',
      status: 'pass',
      message: '',
      details: {},
      benchmark: { good: 1800, needsWork: 3000 }
    };

    if (!fcp) {
      check.status = 'warning';
      check.message = 'Could not measure FCP';
    } else if (fcp <= 1800) {
      check.message = `FCP is ${fcp.toFixed(0)}ms - Excellent!`;
    } else if (fcp <= 3000) {
      check.status = 'warning';
      check.message = `FCP is ${fcp.toFixed(0)}ms - Needs improvement`;
      check.recommendation = 'Optimize server response time, eliminate render-blocking resources, and minimize CSS/JS';
    } else {
      check.status = 'fail';
      check.message = `FCP is ${fcp.toFixed(0)}ms - Poor`;
      check.recommendation = 'Critical: Optimize server response, remove render-blocking resources, use caching';
    }

    check.details = { value: fcp, unit: 'ms' };
    return check;
  }

  checkLCP(lcp) {
    const check = {
      name: 'Largest Contentful Paint (LCP)',
      status: 'pass',
      message: '',
      details: {},
      benchmark: { good: 2500, needsWork: 4000 }
    };

    if (!lcp) {
      check.status = 'warning';
      check.message = 'Could not measure LCP';
    } else if (lcp <= 2500) {
      check.message = `LCP is ${lcp.toFixed(0)}ms - Good!`;
    } else if (lcp <= 4000) {
      check.status = 'warning';
      check.message = `LCP is ${lcp.toFixed(0)}ms - Needs improvement`;
      check.recommendation = 'Optimize images, preload important resources, use CDN';
    } else {
      check.status = 'fail';
      check.message = `LCP is ${lcp.toFixed(0)}ms - Poor`;
      check.recommendation = 'Critical: Optimize server response, compress images, remove render-blocking resources';
    }

    check.details = { value: lcp, unit: 'ms' };
    return check;
  }

  checkCLS(cls) {
    const check = {
      name: 'Cumulative Layout Shift (CLS)',
      status: 'pass',
      message: '',
      details: {},
      benchmark: { good: 0.1, needsWork: 0.25 }
    };

    if (cls === undefined || cls === null) {
      check.status = 'warning';
      check.message = 'Could not measure CLS';
    } else if (cls <= 0.1) {
      check.message = `CLS is ${cls.toFixed(3)} - Excellent!`;
    } else if (cls <= 0.25) {
      check.status = 'warning';
      check.message = `CLS is ${cls.toFixed(3)} - Needs improvement`;
      check.recommendation = 'Add size attributes to images, avoid inserting content above existing content';
    } else {
      check.status = 'fail';
      check.message = `CLS is ${cls.toFixed(3)} - Poor`;
      check.recommendation = 'Critical: Reserve space for dynamic content, set image dimensions, avoid layout shifts';
    }

    check.details = { value: cls };
    return check;
  }

  checkINP(inp) {
    const check = {
      name: 'Interaction to Next Paint (INP)',
      status: 'pass',
      message: '',
      details: {},
      benchmark: { good: 200, needsWork: 500 }
    };

    if (!inp || inp === 0) {
      check.message = 'No interactions measured (normal for static page)';
    } else if (inp <= 200) {
      check.message = `INP is ${inp.toFixed(0)}ms - Good!`;
    } else if (inp <= 500) {
      check.status = 'warning';
      check.message = `INP is ${inp.toFixed(0)}ms - Needs improvement`;
      check.recommendation = 'Optimize JavaScript execution, break up long tasks';
    } else {
      check.status = 'fail';
      check.message = `INP is ${inp.toFixed(0)}ms - Poor`;
      check.recommendation = 'Critical: Optimize event handlers, reduce JavaScript execution time';
    }

    check.details = { value: inp, unit: 'ms' };
    return check;
  }

  checkLoadTime(loadTime) {
    const check = {
      name: 'Page Load Time',
      status: 'pass',
      message: '',
      details: {}
    };

    if (loadTime <= 2000) {
      check.message = `Page loaded in ${(loadTime / 1000).toFixed(2)}s - Fast!`;
    } else if (loadTime <= 5000) {
      check.status = 'warning';
      check.message = `Page loaded in ${(loadTime / 1000).toFixed(2)}s - Acceptable`;
      check.recommendation = 'Consider optimizing to get under 2 seconds';
    } else {
      check.status = 'fail';
      check.message = `Page loaded in ${(loadTime / 1000).toFixed(2)}s - Slow`;
      check.recommendation = 'Critical: Optimize images, minify CSS/JS, use caching and CDN';
    }

    check.details = { value: loadTime, unit: 'ms' };
    return check;
  }

  checkPageSize(size) {
    const check = {
      name: 'Page Size',
      status: 'pass',
      message: '',
      details: {}
    };

    const sizeInKB = size / 1024;
    const sizeInMB = size / (1024 * 1024);

    if (sizeInMB <= 0.5) {
      check.message = `Page size: ${this.formatBytes(size)} - Good!`;
    } else if (sizeInMB <= 2) {
      check.status = 'warning';
      check.message = `Page size: ${this.formatBytes(size)} - Moderate`;
      check.recommendation = 'Consider compressing images and minifying resources';
    } else {
      check.status = 'fail';
      check.message = `Page size: ${this.formatBytes(size)} - Heavy`;
      check.recommendation = 'Critical: Reduce page weight, compress images, lazy load content';
    }

    check.details = { bytes: size, formatted: this.formatBytes(size) };
    return check;
  }

  checkDOMSize(domNodes) {
    const check = {
      name: 'DOM Size',
      status: 'pass',
      message: '',
      details: {}
    };

    if (domNodes < 1500) {
      check.message = `${domNodes} DOM nodes - Good!`;
    } else if (domNodes < 3000) {
      check.status = 'warning';
      check.message = `${domNodes} DOM nodes - Consider reducing`;
      check.recommendation = 'Remove unnecessary DOM elements to improve rendering performance';
    } else {
      check.status = 'fail';
      check.message = `${domNodes} DOM nodes - Too many!`;
      check.recommendation = 'Critical: Reduce DOM size to improve page performance';
    }

    check.details = { count: domNodes };
    return check;
  }

  checkResourceCount(total, breakdown) {
    const check = {
      name: 'Resource Count',
      status: 'pass',
      message: '',
      details: {}
    };

    if (total < 50) {
      check.message = `${total} resources - Good!`;
    } else if (total < 100) {
      check.status = 'warning';
      check.message = `${total} resources - Consider reducing`;
      check.recommendation = 'Combine CSS/JS files, use sprites for icons';
    } else {
      check.status = 'fail';
      check.message = `${total} resources - Too many HTTP requests`;
      check.recommendation = 'Critical: Reduce resource count through bundling, lazy loading';
    }

    check.details = { total, breakdown };
    return check;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = PerformanceAuditor;
