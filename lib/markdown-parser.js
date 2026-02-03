/**
 * Markdown Parser - Comprehensive markdown to HTML converter
 * Optimized for Google Docs and rich text platform compatibility
 */

class MarkdownParser {
  constructor(options = {}) {
    this.options = {
      breaks: options.breaks ?? false,
      linkify: options.linkify ?? true,
      typographer: options.typographer ?? true,
      includeStyles: options.includeStyles ?? true,
      highlightCode: options.highlightCode ?? false,
      ...options
    };
    
    // Style definitions for Google Docs compatibility
    this.styles = {
      h1: 'font-size:24px;font-weight:bold;margin:20px 0 10px 0;line-height:1.3;',
      h2: 'font-size:20px;font-weight:bold;margin:18px 0 9px 0;line-height:1.3;',
      h3: 'font-size:16px;font-weight:bold;margin:16px 0 8px 0;line-height:1.3;',
      h4: 'font-size:14px;font-weight:bold;margin:14px 0 7px 0;line-height:1.3;',
      h5: 'font-size:12px;font-weight:bold;margin:12px 0 6px 0;line-height:1.3;',
      h6: 'font-size:11px;font-weight:bold;margin:10px 0 5px 0;line-height:1.3;',
      p: 'margin:0 0 12px 0;line-height:1.6;',
      ul: 'margin:0 0 12px 0;padding-left:24px;',
      ol: 'margin:0 0 12px 0;padding-left:24px;',
      li: 'margin:0 0 4px 0;line-height:1.5;',
      blockquote: 'margin:0 0 12px 0;padding:10px 20px;border-left:4px solid #e0e0e0;background:#f9f9f9;color:#555;',
      code: 'font-family:"SF Mono","Fira Code","Consolas",monospace;font-size:0.9em;background:#f4f4f4;padding:2px 6px;border-radius:3px;',
      pre: 'font-family:"SF Mono","Fira Code","Consolas",monospace;font-size:0.9em;background:#f4f4f4;padding:16px;border-radius:6px;overflow-x:auto;margin:0 0 12px 0;line-height:1.4;',
      table: 'border-collapse:collapse;margin:0 0 12px 0;width:100%;',
      th: 'border:1px solid #ddd;padding:10px 12px;background:#f5f5f5;font-weight:bold;text-align:left;',
      td: 'border:1px solid #ddd;padding:10px 12px;',
      hr: 'border:none;border-top:2px solid #e0e0e0;margin:24px 0;',
      a: 'color:#1a73e8;text-decoration:underline;',
      img: 'max-width:100%;height:auto;margin:8px 0;',
      taskUnchecked: 'margin-right:8px;',
      taskChecked: 'margin-right:8px;'
    };
  }

  /**
   * Main parsing method
   */
  parse(markdown, options = {}) {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    // Store headings for TOC generation
    this.headings = [];
    this.footnotes = {};

    // Normalize line endings
    let text = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Extract footnote definitions first
    text = this.extractFootnotes(text);
    
    // Process block elements
    text = this.parseBlocks(text);
    
    // Append footnotes section if any exist
    if (Object.keys(this.footnotes).length > 0) {
      text += this.renderFootnotes();
    }
    
    return text.trim();
  }

  /**
   * Extract footnote definitions from text
   */
  extractFootnotes(text) {
    const lines = text.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^\[\^(\w+)\]:\s*(.+)$/);
      if (match) {
        this.footnotes[match[1]] = match[2];
      } else {
        newLines.push(lines[i]);
      }
    }
    
    return newLines.join('\n');
  }

  /**
   * Render footnotes section
   */
  renderFootnotes() {
    const style = this.options.includeStyles 
      ? ' style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:0.9em;"'
      : '';
    
    let html = `<div${style}>`;
    html += '<h4 style="margin:0 0 12px 0;font-size:14px;">Footnotes</h4>';
    html += '<ol style="margin:0;padding-left:24px;">';
    
    for (const [id, content] of Object.entries(this.footnotes)) {
      html += `<li id="fn-${id}" style="margin-bottom:8px;">${this.parseInline(content)} <a href="#fnref-${id}" style="color:#1a73e8;">\u21a9</a></li>`;
    }
    
    html += '</ol></div>';
    return html;
  }

  /**
   * Generate Table of Contents from headings
   */
  generateTOC() {
    if (this.headings.length === 0) return '';
    
    const style = this.options.includeStyles
      ? ' style="background:#f8f9fa;padding:16px 24px;border-radius:6px;margin:0 0 24px 0;"'
      : '';
    
    let html = `<nav${style}>`;
    html += '<h4 style="margin:0 0 12px 0;font-size:14px;font-weight:bold;">Table of Contents</h4>';
    html += '<ul style="margin:0;padding-left:20px;list-style:none;">';
    
    for (const heading of this.headings) {
      const indent = (heading.level - 1) * 16;
      const indentStyle = indent > 0 ? ` style="margin-left:${indent}px;"` : '';
      html += `<li${indentStyle}><a href="#${heading.id}" style="color:#1a73e8;text-decoration:none;">${heading.text}</a></li>`;
    }
    
    html += '</ul></nav>';
    return html;
  }

  /**
   * Generate Table of Contents from headings
   */
  generateTOC(markdown) {
    const lines = markdown.split('\n');
    const toc = [];
    
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/\*\*|__|\*|_|`/g, ''); // Strip formatting
        const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        toc.push({ level, text, slug });
      }
    });
    
    if (toc.length === 0) return '';
    
    const minLevel = Math.min(...toc.map(h => h.level));
    let html = '<nav class="toc" style="margin:0 0 24px 0;padding:16px;background:#f8f9fa;border-radius:6px;">';
    html += '<strong style="display:block;margin-bottom:12px;">Table of Contents</strong>';
    html += '<ul style="margin:0;padding-left:20px;list-style:none;">';
    
    toc.forEach(h => {
      const indent = (h.level - minLevel) * 16;
      html += `<li style="margin:4px 0;padding-left:${indent}px;">`;
      html += `<a href="#${h.slug}" style="color:#1a73e8;text-decoration:none;">${this.escapeHtml(h.text)}</a>`;
      html += '</li>';
    });
    
    html += '</ul></nav>';
    return html;
  }

  /**
   * Parse block-level elements
   */
  parseBlocks(text) {
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    
    // Collect footnotes first
    this.footnotes = {};
    lines.forEach(line => {
      const fnMatch = line.match(/^\[\^(\w+)\]:\s*(.+)$/);
      if (fnMatch) {
        this.footnotes[fnMatch[1]] = fnMatch[2];
      }
    });

    while (i < lines.length) {
      const line = lines[i];
      
      // Skip footnote definitions (we collected them above)
      if (line.match(/^\[\^(\w+)\]:\s*.+$/)) {
        i++;
        continue;
      }
      
      // Definition list
      if (i + 1 < lines.length && lines[i + 1].match(/^:\s+.+/)) {
        const result = this.parseDefinitionList(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }
      
      // Code block (fenced)
      if (line.match(/^```/)) {
        const result = this.parseCodeBlock(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Table
      if (this.isTableStart(lines, i)) {
        const result = this.parseTable(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Definition list (term followed by : definition)
      if (this.isDefinitionList(lines, i)) {
        const result = this.parseDefinitionList(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const rawText = headingMatch[2];
        const content = this.parseInline(rawText);
        const id = this.slugify(rawText);
        
        // Store heading for TOC
        this.headings.push({ level, text: rawText, id });
        
        const style = this.options.includeStyles ? ` style="${this.styles[`h${level}`]}"` : '';
        blocks.push(`<h${level} id="${id}"${style}>${content}</h${level}>`);
        i++;
        continue;
      }

      // Horizontal rule
      if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
        blocks.push(this.wrapTag('hr', '', true));
        i++;
        continue;
      }

      // Blockquote
      if (line.match(/^>\s*/)) {
        const result = this.parseBlockquote(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Unordered list
      if (line.match(/^(\s*)[-*+]\s+/)) {
        const result = this.parseList(lines, i, 'ul');
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Ordered list
      if (line.match(/^(\s*)\d+\.\s+/)) {
        const result = this.parseList(lines, i, 'ol');
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Task list
      if (line.match(/^(\s*)[-*+]\s+\[[ xX]\]\s+/)) {
        const result = this.parseTaskList(lines, i);
        blocks.push(result.html);
        i = result.endIndex + 1;
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph
      const result = this.parseParagraph(lines, i);
      blocks.push(result.html);
      i = result.endIndex + 1;
    }

    return blocks.join('\n');
  }

  /**
   * Parse fenced code blocks
   */
  parseCodeBlock(lines, startIndex) {
    const startLine = lines[startIndex];
    const langMatch = startLine.match(/^```(\w+)?/);
    const language = langMatch ? langMatch[1] || '' : '';
    
    let endIndex = startIndex + 1;
    const codeLines = [];

    while (endIndex < lines.length && !lines[endIndex].match(/^```$/)) {
      codeLines.push(lines[endIndex]);
      endIndex++;
    }

    const code = this.escapeHtml(codeLines.join('\n'));
    const langAttr = language ? ` data-language="${language}"` : '';
    
    let html;
    if (this.options.highlightCode && language) {
      html = this.wrapTag('pre', `<code${langAttr}>${this.highlightSyntax(code, language)}</code>`);
    } else {
      html = this.wrapTag('pre', `<code${langAttr}>${code}</code>`);
    }

    return { html, endIndex };
  }

  /**
   * Syntax highlighting for code blocks
   */
  highlightSyntax(code, language) {
    const keywords = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'null', 'undefined', 'true', 'false'],
      python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'raise', 'with', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is'],
      css: ['@media', '@import', '@keyframes', '@font-face', '!important'],
      html: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'script', 'style', 'link', 'meta']
    };

    const langKeywords = keywords[language.toLowerCase()] || [];
    
    // Highlight strings
    code = code.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span style="color:#22863a;">$&</span>');
    
    // Highlight comments
    code = code.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, '<span style="color:#6a737d;">$&</span>');
    
    // Highlight numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#005cc5;">$1</span>');
    
    // Highlight keywords
    if (langKeywords.length > 0) {
      const keywordRegex = new RegExp(`\\b(${langKeywords.join('|')})\\b`, 'g');
      code = code.replace(keywordRegex, '<span style="color:#d73a49;">$1</span>');
    }

    return code;
  }

  /**
   * Check if current position is start of a table
   */
  isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    const line = lines[index];
    const nextLine = lines[index + 1];
    
    // Hyphen must be first in character class to be treated as literal
    return line.includes('|') && nextLine && nextLine.match(/^\|?[-:\s]+\|[-:\s|]+\|?$/);
  }

  /**
   * Parse markdown tables
   */
  parseTable(lines, startIndex) {
    const rows = [];
    let endIndex = startIndex;

    // Get header row
    const headerLine = lines[startIndex];
    const headers = this.parseTableRow(headerLine);
    
    // Skip separator row
    endIndex = startIndex + 1;
    const separatorLine = lines[endIndex];
    const alignments = this.parseTableAlignments(separatorLine);
    
    endIndex++;

    // Get data rows
    while (endIndex < lines.length && lines[endIndex].includes('|')) {
      const cells = this.parseTableRow(lines[endIndex]);
      if (cells.length > 0) {
        rows.push(cells);
      }
      endIndex++;
    }

    // Build table HTML
    let html = this.options.includeStyles 
      ? `<table style="${this.styles.table}">`
      : '<table>';
    
    // Header
    html += '<thead><tr>';
    headers.forEach((header, i) => {
      const align = alignments[i] || 'left';
      const style = this.options.includeStyles 
        ? `${this.styles.th}text-align:${align};`
        : `text-align:${align};`;
      html += `<th style="${style}">${this.parseInline(header)}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach((cell, i) => {
        const align = alignments[i] || 'left';
        const style = this.options.includeStyles
          ? `${this.styles.td}text-align:${align};`
          : `text-align:${align};`;
        html += `<td style="${style}">${this.parseInline(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    return { html, endIndex: endIndex - 1 };
  }

  /**
   * Parse a table row into cells
   */
  parseTableRow(line) {
    return line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => cell.trim());
  }

  /**
   * Parse table separator for alignments
   */
  parseTableAlignments(line) {
    return line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => {
        cell = cell.trim();
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });
  }

  /**
   * Parse blockquotes
   */
  parseBlockquote(lines, startIndex) {
    const quoteLines = [];
    let endIndex = startIndex;

    while (endIndex < lines.length && lines[endIndex].match(/^>\s*/)) {
      quoteLines.push(lines[endIndex].replace(/^>\s?/, ''));
      endIndex++;
    }

    const content = this.parseBlocks(quoteLines.join('\n'));
    const html = this.wrapTag('blockquote', content);

    return { html, endIndex: endIndex - 1 };
  }

  /**
   * Parse unordered and ordered lists
   */
  parseList(lines, startIndex, type) {
    const items = [];
    let endIndex = startIndex;
    const baseIndent = lines[startIndex].match(/^(\s*)/)[1].length;
    const pattern = type === 'ul' ? /^(\s*)[-*+]\s+(.*)$/ : /^(\s*)\d+\.\s+(.*)$/;

    while (endIndex < lines.length) {
      const line = lines[endIndex];
      const match = line.match(pattern);
      
      if (!match) {
        // Check for task list item
        const taskMatch = line.match(/^(\s*)[-*+]\s+\[[ xX]\]\s+(.*)$/);
        if (taskMatch && type === 'ul') {
          const indent = taskMatch[1].length;
          if (indent >= baseIndent) {
            const isChecked = line.includes('[x]') || line.includes('[X]');
            const content = taskMatch[2];
            const checkbox = isChecked 
              ? '<input type="checkbox" checked disabled style="margin-right:8px;">'
              : '<input type="checkbox" disabled style="margin-right:8px;">';
            items.push({ content: checkbox + this.parseInline(content), indent });
            endIndex++;
            continue;
          }
        }
        
        // Check for continuation or blank line
        if (line.trim() === '' || line.match(/^\s{2,}/)) {
          endIndex++;
          continue;
        }
        break;
      }

      const indent = match[1].length;
      const content = match[2];

      if (indent < baseIndent) break;

      items.push({ content: this.parseInline(content), indent });
      endIndex++;
    }

    // Build list HTML with nesting
    const html = this.buildListHtml(items, type, baseIndent);
    return { html, endIndex: endIndex - 1 };
  }

  /**
   * Build nested list HTML
   */
  buildListHtml(items, type, baseIndent) {
    if (items.length === 0) return '';

    const tag = type;
    const style = this.options.includeStyles ? this.styles[type] : '';
    let html = style ? `<${tag} style="${style}">` : `<${tag}>`;

    items.forEach(item => {
      const liStyle = this.options.includeStyles ? ` style="${this.styles.li}"` : '';
      html += `<li${liStyle}>${item.content}</li>`;
    });

    html += `</${tag}>`;
    return html;
  }

  /**
   * Parse task lists specifically
   */
  parseTaskList(lines, startIndex) {
    return this.parseList(lines, startIndex, 'ul');
  }

  /**
   * Parse paragraphs
   */
  parseParagraph(lines, startIndex) {
    const paraLines = [];
    let endIndex = startIndex;

    while (endIndex < lines.length) {
      const line = lines[endIndex];
      
      // Stop at block-level elements
      if (line.match(/^#{1,6}\s/) || 
          line.match(/^[-*+]\s/) || 
          line.match(/^\d+\.\s/) ||
          line.match(/^>\s/) ||
          line.match(/^```/) ||
          line.match(/^(-{3,}|\*{3,}|_{3,})$/) ||
          line.trim() === '') {
        break;
      }

      paraLines.push(line);
      endIndex++;
    }

    const content = this.parseInline(paraLines.join(this.options.breaks ? '<br>' : ' '));
    const html = this.wrapTag('p', content);

    return { html, endIndex: endIndex - 1 };
  }

  /**
   * Parse inline elements
   */
  parseInline(text) {
    if (!text) return '';

    // Escape HTML first (but preserve already processed tags)
    text = this.escapeHtml(text);

    // Images ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const style = this.options.includeStyles ? ` style="${this.styles.img}"` : '';
      return `<img src="${url}" alt="${alt}"${style}>`;
    });

    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
      const style = this.options.includeStyles ? ` style="${this.styles.a}"` : '';
      return `<a href="${url}"${style}>${linkText}</a>`;
    });

    // Auto-link URLs if enabled (but not URLs already inside anchor tags)
    if (this.options.linkify) {
      text = text.replace(
        /(?<!["=>])(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/g,
        (url) => {
          // Don't linkify if this URL is already part of an anchor tag
          const style = this.options.includeStyles ? ` style="${this.styles.a}"` : '';
          return `<a href="${url}"${style}>${url}</a>`;
        }
      );
    }

    // Highlight ==text== → <mark>
    text = text.replace(/==([^=]+)==/g, (_, content) => {
      const style = this.options.includeStyles ? ' style="background:#fff3cd;padding:2px 4px;"' : '';
      return `<mark${style}>${content}</mark>`;
    });

    // Footnote references [^1] → superscript link
    text = text.replace(/\[\^(\w+)\]/g, (_, id) => {
      const style = this.options.includeStyles ? ' style="color:#1a73e8;font-size:0.8em;vertical-align:super;"' : '';
      return `<sup${style}><a href="#fn-${id}" id="fnref-${id}">[${id}]</a></sup>`;
    });

    // Superscript ^text^
    text = text.replace(/\^([^\^]+)\^/g, '<sup>$1</sup>');

    // Subscript ~text~ (single tilde, not double for strikethrough)
    text = text.replace(/(?<!~)~([^~]+)~(?!~)/g, '<sub>$1</sub>');

    // Bold + Italic ***text*** or ___text___
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // Bold **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic *text* or _text_
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough ~~text~~
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code `code`
    text = text.replace(/`([^`]+)`/g, (_, code) => {
      const style = this.options.includeStyles ? ` style="${this.styles.code}"` : '';
      return `<code${style}>${code}</code>`;
    });

    // Typographer replacements
    if (this.options.typographer) {
      text = text.replace(/---/g, '\u2014'); // em dash
      text = text.replace(/--/g, '\u2013');  // en dash
      text = text.replace(/\.\.\./g, '\u2026'); // ellipsis
      text = text.replace(/"([^"]+)"/g, '\u201c$1\u201d'); // smart quotes
      text = text.replace(/'([^']+)'/g, '\u2018$1\u2019'); // smart single quotes
    }

    return text;
  }

  /**
   * Wrap content in a tag with optional styles
   */
  wrapTag(tag, content, selfClosing = false) {
    if (selfClosing) {
      const style = this.options.includeStyles && this.styles[tag] 
        ? ` style="${this.styles[tag]}"` 
        : '';
      return `<${tag}${style}>`;
    }

    const style = this.options.includeStyles && this.styles[tag] 
      ? ` style="${this.styles[tag]}"` 
      : '';
    return `<${tag}${style}>${content}</${tag}>`;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Convert HTML back to plain text (for clipboard)
   */
  toPlainText(html) {
    let text = html;
    
    // Convert block elements to line breaks
    text = text.replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
    
    // Convert lists
    text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
    
    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    
    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
  }

  /**
   * Check if current position starts a definition list
   */
  isDefinitionList(lines, index) {
    if (index + 1 >= lines.length) return false;
    const currentLine = lines[index].trim();
    const nextLine = lines[index + 1];
    // Definition list: term on one line, followed by : definition
    return currentLine !== '' && !currentLine.startsWith('#') && nextLine && nextLine.match(/^:\s+.+/);
  }

  /**
   * Parse definition lists (term followed by : definition)
   */
  parseDefinitionList(lines, startIndex) {
    const items = [];
    let i = startIndex;

    while (i < lines.length) {
      const termLine = lines[i].trim();
      
      // Check if this is a term (non-empty, not a heading)
      if (termLine === '' || termLine.startsWith('#')) break;
      
      // Check if next line is a definition
      if (i + 1 >= lines.length || !lines[i + 1].match(/^:\s+/)) break;
      
      const term = this.parseInline(termLine);
      const definitions = [];
      i++;
      
      // Collect all definitions for this term
      while (i < lines.length && lines[i].match(/^:\s+/)) {
        const def = lines[i].replace(/^:\s+/, '');
        definitions.push(this.parseInline(def));
        i++;
      }
      
      items.push({ term, definitions });
      
      // Skip blank lines between items
      while (i < lines.length && lines[i].trim() === '') i++;
      
      // Check if next non-blank line could be another term
      if (i >= lines.length || i + 1 >= lines.length || !lines[i + 1].match(/^:\s+/)) break;
    }

    // Build HTML
    const style = this.options.includeStyles ? ' style="margin:0 0 16px 0;"' : '';
    let html = `<dl${style}>`;
    
    items.forEach(item => {
      const dtStyle = this.options.includeStyles ? ' style="font-weight:bold;margin:8px 0 4px 0;"' : '';
      const ddStyle = this.options.includeStyles ? ' style="margin:0 0 8px 24px;color:#555;"' : '';
      html += `<dt${dtStyle}>${item.term}</dt>`;
      item.definitions.forEach(def => {
        html += `<dd${ddStyle}>${def}</dd>`;
      });
    });
    
    html += '</dl>';
    return { html, endIndex: i - 1 };
  }

  /**
   * Generate slug from text for heading IDs
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Render collected footnotes at the end
   */
  renderFootnotes() {
    if (!this.footnotes || Object.keys(this.footnotes).length === 0) return '';
    
    const style = this.options.includeStyles 
      ? ' style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:0.9em;"' 
      : '';
    
    let html = `<section class="footnotes"${style}>`;
    html += '<h4 style="margin:0 0 12px 0;font-size:14px;font-weight:bold;">Footnotes</h4>';
    html += '<ol style="margin:0;padding-left:24px;">';
    
    for (const [id, content] of Object.entries(this.footnotes)) {
      html += `<li id="fn-${id}" style="margin-bottom:8px;">`;
      html += this.parseInline(content);
      html += ` <a href="#fnref-${id}" style="color:#1a73e8;text-decoration:none;">\u21a9</a>`;
      html += '</li>';
    }
    
    html += '</ol></section>';
    return html;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownParser;
}
