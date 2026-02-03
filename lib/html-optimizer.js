/**
 * HTML Optimizer - Platform-specific HTML optimization
 * Ensures compatibility with Google Docs, Word, Notion, etc.
 */

class HTMLOptimizer {
  constructor() {
    this.platforms = {
      'google-docs': this.optimizeForGoogleDocs.bind(this),
      'microsoft-word': this.optimizeForWord.bind(this),
      'notion': this.optimizeForNotion.bind(this),
      'slack': this.optimizeForSlack.bind(this),
      'universal': this.optimizeUniversal.bind(this)
    };
  }

  /**
   * Optimize HTML for a specific platform
   */
  optimize(html, platform = 'universal') {
    const optimizer = this.platforms[platform] || this.platforms.universal;
    return optimizer(html);
  }

  /**
   * Universal optimization - works across most platforms
   */
  optimizeUniversal(html) {
    let optimized = html;
    
    // Remove class and id attributes
    optimized = optimized.replace(/\s+(class|id)="[^"]*"/gi, '');
    
    // Ensure proper HTML structure
    optimized = this.ensureProperNesting(optimized);
    
    // Clean up whitespace
    optimized = this.cleanWhitespace(optimized);
    
    return optimized;
  }

  /**
   * Optimize for Google Docs
   * Google Docs is very particular about HTML formatting
   */
  optimizeForGoogleDocs(html) {
    let optimized = html;
    
    // Remove class and id attributes
    optimized = optimized.replace(/\s+(class|id)="[^"]*"/gi, '');
    
    // Google Docs prefers specific font families
    optimized = optimized.replace(
      /font-family:[^;]+;/gi,
      'font-family:Arial,sans-serif;'
    );
    
    // Ensure all font sizes use px
    optimized = optimized.replace(
      /font-size:\s*(\d+(?:\.\d+)?)(em|rem|%)/gi,
      (_, size, unit) => {
        let px = parseFloat(size);
        if (unit === 'em' || unit === 'rem') px *= 16;
        if (unit === '%') px = (px / 100) * 16;
        return `font-size:${Math.round(px)}px`;
      }
    );
    
    // Google Docs doesn't support certain CSS properties well
    optimized = optimized.replace(/box-shadow:[^;]+;/gi, '');
    optimized = optimized.replace(/text-shadow:[^;]+;/gi, '');
    optimized = optimized.replace(/transform:[^;]+;/gi, '');
    optimized = optimized.replace(/transition:[^;]+;/gi, '');
    
    // Simplify borders for tables
    optimized = optimized.replace(
      /border:[^;]*solid[^;]*;/gi,
      'border:1px solid #000000;'
    );
    
    // Ensure blockquotes render properly
    optimized = optimized.replace(
      /<blockquote([^>]*)>/gi,
      '<blockquote$1><div style="padding-left:16px;border-left:4px solid #cccccc;">'
    );
    optimized = optimized.replace(/<\/blockquote>/gi, '</div></blockquote>');
    
    // Clean up empty paragraphs
    optimized = optimized.replace(/<p[^>]*>\s*<\/p>/gi, '');
    
    // Ensure proper nesting
    optimized = this.ensureProperNesting(optimized);
    
    return optimized;
  }

  /**
   * Optimize for Microsoft Word
   */
  optimizeForWord(html) {
    let optimized = html;
    
    // Word uses mso-* properties
    // Add Word-specific namespace and meta tags
    const wordWrapper = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          @page { mso-page-orientation: portrait; }
          table { border-collapse: collapse; }
        </style>
      </head>
      <body>
        ${optimized}
      </body>
      </html>
    `;
    
    // For simple copy/paste, just return optimized HTML without wrapper
    // The wrapper is more for file export
    
    // Remove unsupported CSS
    optimized = optimized.replace(/border-radius:[^;]+;/gi, '');
    
    // Convert code blocks to Word-friendly format
    optimized = optimized.replace(
      /<pre([^>]*)><code([^>]*)>/gi,
      '<pre$1 style="font-family:Consolas,monospace;background-color:#f0f0f0;padding:10px;"><code$2>'
    );
    
    // Ensure tables work
    optimized = optimized.replace(
      /<table([^>]*)>/gi,
      '<table$1 border="1" cellpadding="5" cellspacing="0">'
    );
    
    return optimized;
  }

  /**
   * Optimize for Notion
   */
  optimizeForNotion(html) {
    let optimized = html;
    
    // Notion handles most HTML well
    // Remove complex styles that might not transfer
    optimized = optimized.replace(/background:[^;]+;/gi, '');
    optimized = optimized.replace(/background-color:[^;]+;/gi, '');
    
    // Keep semantic structure
    optimized = this.ensureProperNesting(optimized);
    
    return optimized;
  }

  /**
   * Optimize for Slack (converts to plain text with markdown-like formatting)
   */
  optimizeForSlack(html) {
    let text = html;
    
    // Slack uses its own markup, not HTML
    // Convert to Slack-compatible format
    
    // Bold
    text = text.replace(/<strong>([^<]+)<\/strong>/gi, '*$1*');
    text = text.replace(/<b>([^<]+)<\/b>/gi, '*$1*');
    
    // Italic
    text = text.replace(/<em>([^<]+)<\/em>/gi, '_$1_');
    text = text.replace(/<i>([^<]+)<\/i>/gi, '_$1_');
    
    // Strikethrough
    text = text.replace(/<del>([^<]+)<\/del>/gi, '~$1~');
    text = text.replace(/<s>([^<]+)<\/s>/gi, '~$1~');
    
    // Code
    text = text.replace(/<code>([^<]+)<\/code>/gi, '`$1`');
    
    // Code blocks
    text = text.replace(/<pre[^>]*><code[^>]*>([^<]+)<\/code><\/pre>/gi, '```$1```');
    
    // Links
    text = text.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '<$1|$2>');
    
    // Block elements to newlines
    text = text.replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Lists
    text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
    
    // Remove remaining tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode entities
    text = this.decodeEntities(text);
    
    // Clean whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    
    return text;
  }

  /**
   * Ensure proper HTML nesting
   */
  ensureProperNesting(html) {
    // Basic nesting fixes
    // This is a simple implementation - a full HTML parser would be more robust
    
    // Fix unclosed tags (basic)
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    selfClosingTags.forEach(tag => {
      const regex = new RegExp(`<${tag}([^>]*[^/])>`, 'gi');
      html = html.replace(regex, `<${tag}$1 />`);
    });
    
    return html;
  }

  /**
   * Clean up whitespace in HTML
   */
  cleanWhitespace(html) {
    // Remove excessive whitespace between tags
    html = html.replace(/>\s+</g, '><');
    
    // But preserve whitespace in pre/code blocks
    // This is handled by the parser, so we're safe here
    
    return html;
  }

  /**
   * Decode HTML entities
   */
  decodeEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&mdash;': '\u2014',
      '&ndash;': '\u2013',
      '&hellip;': '\u2026',
      '&ldquo;': '\u201c',
      '&rdquo;': '\u201d',
      '&lsquo;': '\u2018',
      '&rsquo;': '\u2019'
    };
    
    Object.entries(entities).forEach(([entity, char]) => {
      text = text.replace(new RegExp(entity, 'g'), char);
    });
    
    return text;
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitize(html) {
    // Remove script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');
    
    // Remove javascript: URLs
    html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    
    // Remove data: URLs in images (potential XSS vector)
    // But allow them if they're legitimate images
    html = html.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');
    
    return html;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLOptimizer;
}
