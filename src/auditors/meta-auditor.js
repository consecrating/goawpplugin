/**
 * Meta Tags Auditor
 * Analyzes meta tags for SEO best practices
 */

class MetaAuditor {
  constructor() {
    this.name = 'Meta Tags';
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

    // Get all meta information
    const metaData = await page.evaluate(() => {
      const getTitle = () => {
        const title = document.querySelector('title');
        return title ? title.textContent.trim() : null;
      };

      const getDescription = () => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute('content') : null;
      };

      const getKeywords = () => {
        const meta = document.querySelector('meta[name="keywords"]');
        return meta ? meta.getAttribute('content') : null;
      };

      const getRobots = () => {
        const meta = document.querySelector('meta[name="robots"]');
        return meta ? meta.getAttribute('content') : null;
      };

      const getCanonical = () => {
        const link = document.querySelector('link[rel="canonical"]');
        return link ? link.getAttribute('href') : null;
      };

      const getViewport = () => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta ? meta.getAttribute('content') : null;
      };

      const getCharset = () => {
        const metaCharset = document.querySelector('meta[charset]');
        const metaHttpEquiv = document.querySelector('meta[http-equiv="Content-Type"]');
        if (metaCharset) return metaCharset.getAttribute('charset');
        if (metaHttpEquiv) return metaHttpEquiv.getAttribute('content');
        return null;
      };

      const getOgTags = () => {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const ogType = document.querySelector('meta[property="og:type"]');
        return {
          title: ogTitle ? ogTitle.getAttribute('content') : null,
          description: ogDesc ? ogDesc.getAttribute('content') : null,
          image: ogImage ? ogImage.getAttribute('content') : null,
          url: ogUrl ? ogUrl.getAttribute('content') : null,
          type: ogType ? ogType.getAttribute('content') : null
        };
      };

      const getTwitterCards = () => {
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        return {
          card: twitterCard ? twitterCard.getAttribute('content') : null,
          title: twitterTitle ? twitterTitle.getAttribute('content') : null,
          description: twitterDesc ? twitterDesc.getAttribute('content') : null,
          image: twitterImage ? twitterImage.getAttribute('content') : null
        };
      };

      return {
        title: getTitle(),
        description: getDescription(),
        keywords: getKeywords(),
        robots: getRobots(),
        canonical: getCanonical(),
        viewport: getViewport(),
        charset: getCharset(),
        ogTags: getOgTags(),
        twitterCards: getTwitterCards(),
        titleLength: getTitle() ? getTitle().length : 0,
        descriptionLength: getDescription() ? getDescription().length : 0
      };
    });

    // Check 1: Title Tag
    const titleCheck = this.checkTitle(metaData.title, metaData.titleLength);
    results.checks.push(titleCheck);

    // Check 2: Meta Description
    const descCheck = this.checkDescription(metaData.description, metaData.descriptionLength);
    results.checks.push(descCheck);

    // Check 3: Viewport Meta
    const viewportCheck = this.checkViewport(metaData.viewport);
    results.checks.push(viewportCheck);

    // Check 4: Charset
    const charsetCheck = this.checkCharset(metaData.charset);
    results.checks.push(charsetCheck);

    // Check 5: Canonical URL
    const canonicalCheck = this.checkCanonical(metaData.canonical, url);
    results.checks.push(canonicalCheck);

    // Check 6: Robots Meta
    const robotsCheck = this.checkRobots(metaData.robots);
    results.checks.push(robotsCheck);

    // Check 7: Open Graph Tags
    const ogCheck = this.checkOpenGraph(metaData.ogTags);
    results.checks.push(ogCheck);

    // Check 8: Twitter Cards
    const twitterCheck = this.checkTwitterCards(metaData.twitterCards);
    results.checks.push(twitterCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);

    return results;
  }

  checkTitle(title, length) {
    const check = {
      name: 'Title Tag',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!title) {
      check.status = 'fail';
      check.message = 'Missing title tag';
      check.recommendation = 'Add a descriptive title tag (50-60 characters)';
    } else if (length < 30) {
      check.status = 'warning';
      check.message = `Title too short (${length} characters)`;
      check.recommendation = 'Consider making your title longer (50-60 characters is optimal)';
    } else if (length > 60) {
      check.status = 'warning';
      check.message = `Title too long (${length} characters)`;
      check.recommendation = 'Consider shortening your title to 50-60 characters to prevent truncation in SERPs';
    } else {
      check.message = `Title is optimal length (${length} characters)`;
    }

    check.details = { title, length };
    return check;
  }

  checkDescription(description, length) {
    const check = {
      name: 'Meta Description',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!description) {
      check.status = 'fail';
      check.message = 'Missing meta description';
      check.recommendation = 'Add a compelling meta description (150-160 characters)';
    } else if (length < 120) {
      check.status = 'warning';
      check.message = `Description too short (${length} characters)`;
      check.recommendation = 'Consider making your description longer (150-160 characters is optimal)';
    } else if (length > 160) {
      check.status = 'warning';
      check.message = `Description too long (${length} characters)`;
      check.recommendation = 'Consider shortening to 150-160 characters to prevent truncation';
    } else {
      check.message = `Description is optimal length (${length} characters)`;
    }

    check.details = { description, length };
    return check;
  }

  checkViewport(viewport) {
    const check = {
      name: 'Viewport Meta Tag',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!viewport) {
      check.status = 'fail';
      check.message = 'Missing viewport meta tag';
      check.recommendation = 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile optimization';
    } else if (!viewport.includes('width=device-width')) {
      check.status = 'warning';
      check.message = 'Viewport tag may not be properly configured';
      check.recommendation = 'Ensure viewport includes "width=device-width, initial-scale=1"';
    } else {
      check.message = 'Viewport meta tag is properly set';
    }

    check.details = { viewport };
    return check;
  }

  checkCharset(charset) {
    const check = {
      name: 'Character Encoding',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!charset) {
      check.status = 'warning';
      check.message = 'No charset declaration found';
      check.recommendation = 'Add <meta charset="UTF-8"> for proper character encoding';
    } else if (charset.toLowerCase().includes('utf-8')) {
      check.message = 'UTF-8 charset is properly declared';
    } else {
      check.status = 'warning';
      check.message = `Charset is set to ${charset}`;
      check.recommendation = 'Consider using UTF-8 for universal character support';
    }

    check.details = { charset };
    return check;
  }

  checkCanonical(canonical, currentUrl) {
    const check = {
      name: 'Canonical URL',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!canonical) {
      check.status = 'warning';
      check.message = 'No canonical URL specified';
      check.recommendation = 'Add a canonical URL to prevent duplicate content issues';
    } else {
      try {
        const canonicalUrl = new URL(canonical);
        const pageUrl = new URL(currentUrl);
        if (canonicalUrl.pathname !== pageUrl.pathname) {
          check.status = 'warning';
          check.message = 'Canonical URL points to a different page';
        } else {
          check.message = 'Canonical URL is properly set';
        }
      } catch (e) {
        check.status = 'warning';
        check.message = 'Could not validate canonical URL';
      }
    }

    check.details = { canonical };
    return check;
  }

  checkRobots(robots) {
    const check = {
      name: 'Robots Meta Tag',
      status: 'pass',
      message: '',
      details: {}
    };

    if (!robots) {
      check.message = 'No robots meta tag (defaults to index, follow)';
      check.recommendation = 'Consider adding robots meta tag for explicit indexing instructions';
    } else if (robots.includes('noindex')) {
      check.status = 'warning';
      check.message = 'Page is set to noindex';
      check.recommendation = 'Verify this page should not be indexed by search engines';
    } else if (robots.includes('nofollow')) {
      check.status = 'warning';
      check.message = 'Page is set to nofollow';
      check.recommendation = 'Verify that links on this page should not be followed';
    } else {
      check.message = `Robots meta tag: ${robots}`;
    }

    check.details = { robots };
    return check;
  }

  checkOpenGraph(ogTags) {
    const check = {
      name: 'Open Graph Tags',
      status: 'pass',
      message: '',
      details: { tags: ogTags },
      subChecks: []
    };

    const requiredTags = ['title', 'description', 'image', 'url', 'type'];
    let missingTags = [];

    requiredTags.forEach(tag => {
      if (!ogTags[tag]) {
        missingTags.push(`og:${tag}`);
      }
    });

    if (missingTags.length > 2) {
      check.status = 'fail';
      check.message = `Missing ${missingTags.length} Open Graph tags`;
      check.recommendation = 'Add Open Graph tags for better social media sharing';
    } else if (missingTags.length > 0) {
      check.status = 'warning';
      check.message = `Missing: ${missingTags.join(', ')}`;
      check.recommendation = 'Add missing Open Graph tags for complete social sharing optimization';
    } else {
      check.message = 'All essential Open Graph tags present';
    }

    check.details.missingTags = missingTags;
    return check;
  }

  checkTwitterCards(twitterCards) {
    const check = {
      name: 'Twitter Card Tags',
      status: 'pass',
      message: '',
      details: { tags: twitterCards }
    };

    if (!twitterCards.card) {
      check.status = 'warning';
      check.message = 'Missing Twitter Card tag';
      check.recommendation = 'Add Twitter Card tags for better Twitter sharing (summary, summary_large_image, etc.)';
    } else {
      check.message = `Twitter Card type: ${twitterCards.card}`;
    }

    return check;
  }
}

module.exports = MetaAuditor;
