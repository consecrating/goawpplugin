/**
 * Links Auditor
 * Analyzes internal and external links for SEO best practices
 */

class LinksAuditor {
  constructor() {
    this.name = 'Links Structure';
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

    const baseUrl = new URL(url);
    
    const linksData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      
      return links.map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        hasText: link.textContent.trim().length > 0,
        isInternal: link.hostname === window.location.hostname,
        opensNewTab: link.target === '_blank',
        hasRel: link.rel,
        isNofollow: link.rel && link.rel.includes('nofollow'),
        isSponsored: link.rel && link.rel.includes('sponsored'),
        isUgc: link.rel && link.rel.includes('ugc'),
        hasTitle: !!link.title,
        isAnchor: link.href && link.href.includes('#'),
        isMailto: link.href && link.href.startsWith('mailto:'),
        isTel: link.href && link.href.startsWith('tel:')
      }));
    });

    const internalLinks = linksData.filter(l => l.isInternal && !l.isAnchor && !l.isMailto && !l.isTel);
    const externalLinks = linksData.filter(l => !l.isInternal && !l.isMailto && !l.isTel);
    const anchorLinks = linksData.filter(l => l.isAnchor);
    const emptyTextLinks = linksData.filter(l => !l.hasText && !l.isMailto && !l.isTel);

    // Check 1: Internal Links
    const internalCheck = this.checkInternalLinks(internalLinks);
    results.checks.push(internalCheck);

    // Check 2: External Links
    const externalCheck = this.checkExternalLinks(externalLinks);
    results.checks.push(externalCheck);

    // Check 3: Link Text
    const textCheck = this.checkLinkText(emptyTextLinks, linksData);
    results.checks.push(textCheck);

    // Check 4: Broken Links (basic check - would need actual request to verify)
    const brokenCheck = this.checkForBrokenLinks(linksData);
    results.checks.push(brokenCheck);

    // Check 5: Nofollow on External
    const nofollowCheck = this.checkNofollowOnExternal(externalLinks);
    results.checks.push(nofollowCheck);

    // Check 6: Links Structure
    const structureCheck = this.checkLinksStructure(internalLinks, externalLinks);
    results.checks.push(structureCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = {
      totalLinks: linksData.length,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      anchorLinks: anchorLinks.length,
      emptyTextLinks: emptyTextLinks.length,
      externalWithNofollow: externalLinks.filter(l => l.isNofollow).length,
      externalOpensNewTab: externalLinks.filter(l => l.opensNewTab).length,
      sampleLinks: {
        internal: internalLinks.slice(0, 5).map(l => ({ href: l.href, text: l.text.substring(0, 50) })),
        external: externalLinks.slice(0, 5).map(l => ({ href: l.href, text: l.text.substring(0, 50) }))
      }
    };

    return results;
  }

  checkInternalLinks(internalLinks) {
    const check = {
      name: 'Internal Links',
      status: 'pass',
      message: '',
      details: {}
    };

    if (internalLinks.length === 0) {
      check.status = 'warning';
      check.message = 'No internal links found';
      check.recommendation = 'Add internal links to improve site structure and distribute page authority';
    } else if (internalLinks.length < 3) {
      check.status = 'warning';
      check.message = `Only ${internalLinks.length} internal links found`;
      check.recommendation = 'Consider adding more internal links to related content';
    } else {
      check.message = `${internalLinks.length} internal links found`;
    }

    check.details = { count: internalLinks.length };
    return check;
  }

  checkExternalLinks(externalLinks) {
    const check = {
      name: 'External Links',
      status: 'pass',
      message: '',
      details: {}
    };

    if (externalLinks.length === 0) {
      check.message = 'No external links found';
    } else {
      const opensNewTab = externalLinks.filter(l => l.opensNewTab);
      if (opensNewTab.length < externalLinks.length) {
        check.status = 'warning';
        check.message = `${externalLinks.length - opensNewTab.length} external links open in same tab`;
        check.recommendation = 'Consider opening external links in new tabs (target="_blank") to keep users on your site';
      } else {
        check.message = `${externalLinks.length} external links, all open in new tabs`;
      }
    }

    check.details = { 
      count: externalLinks.length,
      opensNewTab: externalLinks.filter(l => l.opensNewTab).length
    };
    return check;
  }

  checkLinkText(emptyTextLinks, allLinks) {
    const check = {
      name: 'Link Text Quality',
      status: 'pass',
      message: '',
      details: {}
    };

    if (emptyTextLinks.length > 0) {
      check.status = 'warning';
      check.message = `${emptyTextLinks.length} links have no descriptive text`;
      check.recommendation = 'Ensure all links have descriptive anchor text (avoid "click here")';
    } else {
      // Check for generic link text
      const genericText = ['click here', 'read more', 'more', 'here', 'link'];
      const genericLinks = allLinks.filter(l => {
        const text = l.text.toLowerCase().trim();
        return genericText.includes(text);
      });

      if (genericLinks.length > 0) {
        check.status = 'warning';
        check.message = `${genericLinks.length} links use generic text like "click here"`;
        check.recommendation = 'Use descriptive anchor text that indicates where the link leads';
      } else {
        check.message = 'All links have descriptive text';
      }
    }

    check.details = { emptyTextCount: emptyTextLinks.length };
    return check;
  }

  checkForBrokenLinks(links) {
    const check = {
      name: 'Link Integrity',
      status: 'pass',
      message: '',
      details: {}
    };

    const javascriptLinks = links.filter(l => l.href && l.href.startsWith('javascript:'));
    const emptyLinks = links.filter(l => !l.href || l.href === '#' || l.href === '');

    if (emptyLinks.length > 0) {
      check.status = 'warning';
      check.message = `${emptyLinks.length} links have empty or placeholder hrefs`;
      check.recommendation = 'Fix or remove links with empty or placeholder hrefs';
    } else {
      check.message = 'No obviously broken links detected';
      check.recommendation = 'Run a full link checker periodically to find broken links';
    }

    check.details = { emptyLinks: emptyLinks.length };
    return check;
  }

  checkNofollowOnExternal(externalLinks) {
    const check = {
      name: 'External Link Attributes',
      status: 'pass',
      message: '',
      details: {}
    };

    if (externalLinks.length === 0) {
      check.message = 'No external links to check';
    } else {
      const withNofollow = externalLinks.filter(l => l.isNofollow);
      const withSponsored = externalLinks.filter(l => l.isSponsored);
      
      // Check if external links open in new tab have rel="noopener"
      const newTabsWithoutNoopener = externalLinks.filter(l => 
        l.opensNewTab && (!l.hasRel || !l.hasRel.includes('noopener'))
      );

      if (newTabsWithoutNoopener.length > 0) {
        check.status = 'warning';
        check.message = `${newTabsWithoutNoopener.length} external links open in new tab without rel="noopener"`;
        check.recommendation = 'Add rel="noopener" to links with target="_blank" for security';
      } else {
        check.message = 'External links have proper attributes';
      }
    }

    return check;
  }

  checkLinksStructure(internalLinks, externalLinks) {
    const check = {
      name: 'Link Balance',
      status: 'pass',
      message: '',
      details: {}
    };

    const total = internalLinks.length + externalLinks.length;
    
    if (total === 0) {
      check.status = 'warning';
      check.message = 'No links found on the page';
      check.recommendation = 'Add links to improve navigation and SEO';
    } else {
      const internalRatio = internalLinks.length / total;
      
      if (internalRatio < 0.3 && externalLinks.length > 5) {
        check.status = 'warning';
        check.message = 'More external links than internal';
        check.recommendation = 'Consider adding more internal links to improve site structure';
      } else {
        check.message = `Good link balance: ${internalLinks.length} internal, ${externalLinks.length} external`;
      }
    }

    check.details = { internal: internalLinks.length, external: externalLinks.length };
    return check;
  }
}

module.exports = LinksAuditor;
