/**
 * Content Quality Auditor
 * Analyzes content for SEO best practices
 */

class ContentAuditor {
  constructor() {
    this.name = 'Content Quality';
    this.weight = 9;
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

    const contentData = await page.evaluate(() => {
      // Get all text content
      const bodyText = document.body.innerText;
      const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
      
      // Get text to HTML ratio
      const htmlSize = document.documentElement.outerHTML.length;
      const textSize = bodyText.length;
      const textToHtmlRatio = (textSize / htmlSize) * 100;

      // Check for keywords in important places
      const title = document.querySelector('title')?.textContent || '';
      const h1 = document.querySelector('h1')?.textContent || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const firstParagraph = document.querySelector('p')?.textContent || '';

      // Check content structure
      const paragraphs = document.querySelectorAll('p').length;
      const lists = document.querySelectorAll('ul, ol').length;
      const tables = document.querySelectorAll('table').length;
      const blockquotes = document.querySelectorAll('blockquote').length;

      // Check for duplicate content indicators
      const allText = [];
      document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6').forEach(el => {
        allText.push(el.textContent.trim());
      });

      // Check reading level indicators
      const sentenceCount = (bodyText.match(/[.!?]+/g) || []).length;
      const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

      // Check for multimedia
      const images = document.querySelectorAll('img').length;
      const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

      // Check for schema markup
      const jsonLd = document.querySelectorAll('script[type="application/ld+json"]').length;

      return {
        wordCount,
        textToHtmlRatio,
        title,
        h1,
        metaDesc,
        firstParagraph,
        structure: {
          paragraphs,
          lists,
          tables,
          blockquotes
        },
        sentenceCount,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        multimedia: {
          images,
          videos
        },
        jsonLd,
        bodyText: bodyText.substring(0, 500)
      };
    });

    // Check 1: Word Count
    const wordCountCheck = this.checkWordCount(contentData.wordCount);
    results.checks.push(wordCountCheck);

    // Check 2: Text to HTML Ratio
    const ratioCheck = this.checkTextToHtmlRatio(contentData.textToHtmlRatio);
    results.checks.push(ratioCheck);

    // Check 3: Content Structure
    const structureCheck = this.checkContentStructure(contentData.structure);
    results.checks.push(structureCheck);

    // Check 4: Paragraph Distribution
    const paragraphCheck = this.checkParagraphs(contentData.structure.paragraphs, contentData.wordCount);
    results.checks.push(paragraphCheck);

    // Check 5: Readability
    const readabilityCheck = this.checkReadability(contentData.avgWordsPerSentence);
    results.checks.push(readabilityCheck);

    // Check 6: Multimedia
    const multimediaCheck = this.checkMultimedia(contentData.multimedia);
    results.checks.push(multimediaCheck);

    // Check 7: Schema Markup
    const schemaCheck = this.checkSchemaMarkup(contentData.jsonLd);
    results.checks.push(schemaCheck);

    // Calculate final score
    results.checks.forEach(check => {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    });

    results.score = Math.round((results.passed / results.checks.length) * 100);
    results.details = contentData;

    return results;
  }

  checkWordCount(wordCount) {
    const check = {
      name: 'Word Count',
      status: 'pass',
      message: '',
      details: {}
    };

    if (wordCount < 100) {
      check.status = 'fail';
      check.message = `Very low word count: ${wordCount} words`;
      check.recommendation = 'Add more content. Aim for at least 300 words for SEO value';
    } else if (wordCount < 300) {
      check.status = 'warning';
      check.message = `Low word count: ${wordCount} words`;
      check.recommendation = 'Consider expanding content to at least 300 words';
    } else if (wordCount < 600) {
      check.message = `Decent word count: ${wordCount} words`;
      check.recommendation = 'Consider adding more in-depth content';
    } else {
      check.message = `Good word count: ${wordCount} words`;
    }

    check.details = { wordCount };
    return check;
  }

  checkTextToHtmlRatio(ratio) {
    const check = {
      name: 'Text to HTML Ratio',
      status: 'pass',
      message: '',
      details: {}
    };

    if (ratio < 10) {
      check.status = 'warning';
      check.message = `Low text-to-HTML ratio: ${ratio.toFixed(1)}%`;
      check.recommendation = 'Increase content density, reduce HTML bloat';
    } else if (ratio < 25) {
      check.message = `Text-to-HTML ratio: ${ratio.toFixed(1)}%`;
    } else {
      check.message = `Good text-to-HTML ratio: ${ratio.toFixed(1)}%`;
    }

    check.details = { ratio: ratio.toFixed(1) + '%' };
    return check;
  }

  checkContentStructure(structure) {
    const check = {
      name: 'Content Structure',
      status: 'pass',
      message: '',
      details: {}
    };

    const elements = structure.paragraphs + structure.lists + structure.tables + structure.blockquotes;
    
    if (elements === 0) {
      check.status = 'warning';
      check.message = 'No structured content elements found';
      check.recommendation = 'Add paragraphs, lists, or tables to structure your content';
    } else if (structure.lists > 0) {
      check.message = `Good structure: ${structure.paragraphs} paragraphs, ${structure.lists} lists`;
    } else {
      check.message = `${structure.paragraphs} paragraphs found`;
      check.recommendation = 'Consider using lists or tables to improve content structure';
    }

    check.details = structure;
    return check;
  }

  checkParagraphs(paragraphCount, wordCount) {
    const check = {
      name: 'Content Distribution',
      status: 'pass',
      message: '',
      details: {}
    };

    if (wordCount > 0 && paragraphCount === 0) {
      check.status = 'warning';
      check.message = 'Content without proper paragraph structure';
      check.recommendation = 'Break content into paragraphs using <p> tags';
    } else if (wordCount > 300 && paragraphCount < 3) {
      check.status = 'warning';
      check.message = 'Content could be better structured';
      check.recommendation = 'Break long content into more paragraphs';
    } else {
      check.message = `${paragraphCount} paragraphs found`;
    }

    check.details = { paragraphCount };
    return check;
  }

  checkReadability(avgWordsPerSentence) {
    const check = {
      name: 'Readability',
      status: 'pass',
      message: '',
      details: {}
    };

    if (avgWordsPerSentence === 0) {
      check.message = 'Could not analyze readability';
    } else if (avgWordsPerSentence > 25) {
      check.status = 'warning';
      check.message = `Long sentences: avg ${avgWordsPerSentence} words/sentence`;
      check.recommendation = 'Break up long sentences for better readability (aim for 15-20 words)';
    } else if (avgWordsPerSentence > 20) {
      check.message = `Acceptable readability: ${avgWordsPerSentence} words/sentence`;
    } else {
      check.message = `Good readability: ${avgWordsPerSentence} words/sentence`;
    }

    check.details = { avgWordsPerSentence };
    return check;
  }

  checkMultimedia(multimedia) {
    const check = {
      name: 'Multimedia Content',
      status: 'pass',
      message: '',
      details: {}
    };

    if (multimedia.images === 0 && multimedia.videos === 0) {
      check.status = 'warning';
      check.message = 'No multimedia content found';
      check.recommendation = 'Add images or videos to enhance engagement';
    } else if (multimedia.videos > 0) {
      check.message = `Rich content: ${multimedia.images} images, ${multimedia.videos} videos`;
    } else {
      check.message = `${multimedia.images} images found`;
    }

    check.details = multimedia;
    return check;
  }

  checkSchemaMarkup(jsonLd) {
    const check = {
      name: 'Schema Markup',
      status: 'pass',
      message: '',
      details: {}
    };

    if (jsonLd === 0) {
      check.status = 'warning';
      check.message = 'No Schema.org structured data found';
      check.recommendation = 'Add JSON-LD structured data to help search engines understand your content';
    } else {
      check.message = `${jsonLd} Schema markup blocks found`;
    }

    check.details = { jsonLd };
    return check;
  }
}

module.exports = ContentAuditor;
