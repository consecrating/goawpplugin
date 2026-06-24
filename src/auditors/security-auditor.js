/**
 * Security SEO Auditor
 * Analyzes security-related factors that affect SEO
 */

class SecurityAuditor {
  constructor() {
    this.name = 'Security SEO';
    this.weight = 6;
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

    const parsedUrl = new URL(url);
    
    const securityData = await page.evaluate(() => {
      return {
        protocol: window.location.protocol,
        hasHttps: window.location.protocol === 'https:',
        hasMixedContent: false, // Will be checked separately
        hasPasswordField: !!document.querySelector('input[type="password"]'),
        formsWithoutAction: document.querySelectorAll('form:not([action])').length,
        formsOnHttp: 0, // Will be checked
        externalScripts: Array.from(document.querySelectorAll('script[src]'))
          .map(s => s.src)
          .filter(src => {
            try {
              const scriptUrl = new URL(src, window.location.href);
              return scriptUrl.protocol === 'http:';
            } catch { return false; }
          }).length,
        hasReferrerPolicy: !!document.querySelector('meta[name="referrer"]'),
        hasCSP: false, // Would need response headers
        hasXFrameOptions: false, // Would need response headers
        externalLinks: document.querySelectorAll('a[href^="http"]').length
      };
    });

    // Check for HTTP resources
    const httpResources = await page.evaluate(() => {
      const resources = [];
      
      // Images
      document.querySelectorAll('img[src^="http:"]').forEach(img => {
        resources.push({ type: 'image', src: img.src });
      });
      
      // Scripts
      document.querySelectorAll('script[src^="http:"]').forEach(script => {
        resources.push({ type: 'script', src: script.src });
      });
      
      // Stylesheets
      document.querySelectorAll('link[rel="stylesheet"][href^="http:"]').forEach(link => {
        resources.push({ type: 'stylesheet', src: link.href });
      });

      return resources;
    });

    // Check 1: HTTPS
    const httpsCheck = this.checkHTTPS(securityData.hasHttps, url);
    results.checks.push(httpsCheck);

    // Check 2: Mixed Content
    const mixedCheck = this.checkMixedContent(httpResources, securityData.hasHttps);
    results.checks.push(mixedCheck);

    // Check 3: Forms Security
    const formsCheck = this.checkFormsSecurity(securityData);
    results.checks.push(formsCheck);

    // Check 4: External Scripts Security
    const scriptsCheck = this.checkExternalScripts(securityData.externalScripts);
    results.checks.push(scriptsCheck);

    // Check 5: Referrer Policy
    const referrerCheck = this.checkReferrerPolicy(securityData.hasReferrerPolicy);
    results.checks.push(referrerCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      hasHttps: securityData.hasHttps,
      protocol: securityData.protocol,
      httpResources: httpResources.length,
      hasPasswordField: securityData.hasPasswordField
    };

    return results;
  }

  checkHTTPS(hasHttps, url) {
    const check = {
      name: 'HTTPS',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!hasHttps) {
      check.status = 'fail';
      check.message = 'Site is not using HTTPS';
      check.recommendation = 'Migrate to HTTPS immediately. Google prioritizes secure sites in rankings';
    } else {
      check.message = 'Site is using HTTPS';
    }

    check.details = { hasHttps };
    return check;
  }

  checkMixedContent(httpResources, hasHttps) {
    const check = {
      name: 'Mixed Content',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!hasHttps) {
      check.message = 'Not applicable (site is HTTP)';
    } else if (httpResources.length > 0) {
      check.status = 'warning';
      check.message = `${httpResources.length} HTTP resources on HTTPS page (mixed content)`;
      check.recommendation = 'Update all resource URLs to HTTPS to avoid security warnings';
    } else {
      check.message = 'No mixed content issues';
    }

    check.details = { httpResources: httpResources.slice(0, 5) };
    return check;
  }

  checkFormsSecurity(securityData) {
    const check = {
      name: 'Form Security',
      status: 'pass',
      message: '',
      details: {}
    };

    if (securityData.hasPasswordField && !securityData.hasHttps) {
      check.status = 'fail';
      check.message = 'Password field on non-HTTPS page';
      check.recommendation = 'CRITICAL: All pages with password fields must use HTTPS';
    } else if (securityData.formsWithoutAction > 0) {
      check.status = 'warning';
      check.message = `${securityData.formsWithoutAction} forms without action attribute`;
      check.recommendation = 'Ensure all forms have proper action attributes';
    } else {
      check.message = 'Forms are properly configured';
    }

    return check;
  }

  checkExternalScripts(externalScripts) {
    const check = {
      name: 'External Scripts Security',
      status: 'pass',
      message: '',
      details: {}
    };

    if (externalScripts > 0) {
      check.status = 'warning';
      check.message = `${externalScripts} scripts loaded over HTTP`;
      check.recommendation = 'Load all external scripts over HTTPS for security';
    } else {
      check.message = 'All external scripts use HTTPS';
    }

    check.details = { count: externalScripts };
    return check;
  }

  checkReferrerPolicy(hasReferrerPolicy) {
    const check = {
      name: 'Referrer Policy',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!hasReferrerPolicy) {
      check.status = 'warning';
      check.message = 'No referrer policy meta tag';
      check.recommendation = 'Consider adding <meta name="referrer" content="no-referrer-when-downgrade">';
    } else {
      check.message = 'Referrer policy is set';
    }

    return check;
  }
}

module.exports = SecurityAuditor;
