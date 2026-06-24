/**
 * Images SEO Auditor
 * Analyzes images for SEO best practices
 */

class ImagesAuditor {
  constructor() {
    this.name = 'Images SEO';
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

    const imagesData = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        altEmpty: img.alt === '',
        title: img.title || null,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        loading: img.loading || null,
        isLazy: img.loading === 'lazy' || img.hasAttribute('data-src'),
        fileSize: null, // Will be populated separately
        format: img.src ? img.src.split('.').pop().split('?')[0].toLowerCase() : null
      }));
    });

    // Check 1: Alt Text Presence
    const altCheck = this.checkAltText(imagesData);
    results.checks.push(altCheck);

    // Check 2: Image Lazy Loading
    const lazyCheck = this.checkLazyLoading(imagesData);
    results.checks.push(lazyCheck);

    // Check 3: Image Dimensions
    const dimensionsCheck = this.checkDimensions(imagesData);
    results.checks.push(dimensionsCheck);

    // Check 4: Alt Text Quality
    const altQualityCheck = this.checkAltQuality(imagesData);
    results.checks.push(altQualityCheck);

    // Check 5: Image Count
    const countCheck = this.checkImageCount(imagesData);
    results.checks.push(countCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      totalImages: imagesData.length,
      imagesWithAlt: imagesData.filter(i => i.hasAlt && !i.altEmpty).length,
      imagesWithoutAlt: imagesData.filter(i => !i.hasAlt || i.altEmpty).length,
      lazyLoaded: imagesData.filter(i => i.isLazy).length,
      images: imagesData.slice(0, 20) // Limit for report
    };

    return results;
  }

  checkAltText(images) {
    const check = {
      name: 'Alt Text Presence',
      status: 'pass',
      message: '',
      details: {}
    };

    const missingAlt = images.filter(img => !img.hasAlt || img.altEmpty);
    
    if (images.length === 0) {
      check.status = 'warning';
      check.message = 'No images found on the page';
      check.recommendation = 'Consider adding relevant images to enhance content';
    } else if (missingAlt.length === 0) {
      check.message = `All ${images.length} images have alt text`;
    } else if (missingAlt.length === images.length) {
      check.status = 'fail';
      check.message = `All ${images.length} images are missing alt text`;
      check.recommendation = 'Add descriptive alt text to all images for accessibility and SEO';
    } else {
      check.status = 'warning';
      check.message = `${missingAlt.length} of ${images.length} images missing alt text`;
      check.recommendation = 'Add descriptive alt text to images without it';
    }

    check.details = { 
      total: images.length, 
      missing: missingAlt.length,
      missingImages: missingAlt.slice(0, 5).map(i => i.src)
    };
    return check;
  }

  checkLazyLoading(images) {
    const check = {
      name: 'Lazy Loading',
      status: 'pass',
      message: '',
      details: {}
    };

    const lazyLoaded = images.filter(img => img.isLazy);
    
    if (images.length === 0) {
      check.message = 'No images to check';
    } else if (images.length <= 2) {
      check.message = 'Few images, lazy loading less critical';
    } else if (lazyLoaded.length === 0) {
      check.status = 'warning';
      check.message = 'No images use lazy loading';
      check.recommendation = 'Add loading="lazy" to off-screen images to improve page load speed';
    } else {
      const percentage = Math.round((lazyLoaded.length / images.length) * 100);
      check.message = `${lazyLoaded.length} of ${images.length} images (${percentage}%) use lazy loading`;
    }

    check.details = { lazyLoaded: lazyLoaded.length, total: images.length };
    return check;
  }

  checkDimensions(images) {
    const check = {
      name: 'Image Dimensions',
      status: 'pass',
      message: '',
      details: {}
    };

    const noDimensions = images.filter(img => !img.width || !img.height || img.width === 0 || img.height === 0);
    
    if (images.length === 0) {
      check.message = 'No images to check';
    } else if (noDimensions.length > images.length / 2) {
      check.status = 'warning';
      check.message = 'Many images have dimension issues';
      check.recommendation = 'Ensure all images have explicit width and height attributes to prevent layout shifts';
    } else {
      check.message = 'Most images have proper dimensions';
    }

    check.details = { issues: noDimensions.length };
    return check;
  }

  checkAltQuality(images) {
    const check = {
      name: 'Alt Text Quality',
      status: 'pass',
      message: '',
      details: {}
    };

    const withAlt = images.filter(img => img.hasAlt && !img.altEmpty);
    
    if (withAlt.length === 0) {
      check.status = 'warning';
      check.message = 'No images with alt text to evaluate';
    } else {
      // Check for generic alt texts
      const genericAlts = withAlt.filter(img => {
        const alt = img.alt.toLowerCase();
        return alt === 'image' || alt === 'photo' || alt === 'picture' || 
               alt === 'img' || alt.length < 3;
      });

      const shortAlts = withAlt.filter(img => img.alt.length < 10 && img.alt.length > 0);

      if (genericAlts.length > 0) {
        check.status = 'warning';
        check.message = `${genericAlts.length} images have generic alt text`;
        check.recommendation = 'Use descriptive alt text that describes the image content and context';
      } else if (shortAlts.length > withAlt.length / 2) {
        check.status = 'warning';
        check.message = 'Many images have very short alt text';
        check.recommendation = 'Consider more descriptive alt text (aim for 10-15 words)';
      } else {
        check.message = 'Alt text quality looks good';
      }
    }

    return check;
  }

  checkImageCount(images) {
    const check = {
      name: 'Image Usage',
      status: 'pass',
      message: '',
      details: {}
    };

    if (images.length === 0) {
      check.status = 'warning';
      check.message = 'No images found';
      check.recommendation = 'Add relevant images to make content more engaging and shareable';
    } else if (images.length > 50) {
      check.status = 'warning';
      check.message = `High number of images (${images.length})`;
      check.recommendation = 'Consider reducing image count or optimizing for performance';
    } else {
      check.message = `${images.length} images found on the page`;
    }

    check.details = { count: images.length };
    return check;
  }
}

module.exports = ImagesAuditor;
