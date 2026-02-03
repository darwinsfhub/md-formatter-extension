/**
 * Document Exporter - Export formatted content to various document formats
 * Supports: HTML, DOCX (Word/Google Docs), PDF
 */

class DocumentExporter {
  constructor() {
    this.filename = 'exported-document';
  }

  /**
   * Set the filename for exports (without extension)
   */
  setFilename(name) {
    this.filename = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)
      .replace(/^-|-$/g, '') || 'exported-document';
  }

  /**
   * Extract filename from markdown content (first heading)
   */
  extractFilename(markdown) {
    const match = markdown.match(/^#\s+(.+)$/m);
    if (match) {
      this.setFilename(match[1]);
    }
    return this.filename;
  }

  /**
   * Export as HTML file
   */
  exportHtml(htmlContent, markdown = '') {
    if (markdown) {
      this.extractFilename(markdown);
    }

    const fullHtml = this.createHtmlDocument(htmlContent);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    this.downloadBlob(blob, `${this.filename}.html`);

    return { success: true, filename: `${this.filename}.html` };
  }

  /**
   * Export as DOCX file (compatible with Microsoft Word and Google Docs)
   * Uses Office Open XML format
   */
  exportDocx(htmlContent, markdown = '') {
    if (markdown) {
      this.extractFilename(markdown);
    }

    try {
      // Create DOCX document structure
      const docxContent = this.createDocxFromHtml(htmlContent);
      const blob = new Blob([docxContent], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      this.downloadBlob(blob, `${this.filename}.docx`);

      return { success: true, filename: `${this.filename}.docx` };
    } catch (error) {
      console.error('DOCX export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export as RTF file (Rich Text Format - universal compatibility)
   * Better compatibility than DOCX for simpler use cases
   */
  exportRtf(htmlContent, markdown = '') {
    if (markdown) {
      this.extractFilename(markdown);
    }

    try {
      const rtfContent = this.createRtfFromHtml(htmlContent);
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      this.downloadBlob(blob, `${this.filename}.rtf`);

      return { success: true, filename: `${this.filename}.rtf` };
    } catch (error) {
      console.error('RTF export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export as PDF using browser's print functionality
   */
  exportPdf(htmlContent, markdown = '') {
    if (markdown) {
      this.extractFilename(markdown);
    }

    try {
      // Create a print-friendly HTML document
      const printHtml = this.createPrintHtmlDocument(htmlContent);

      // Open in new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        return {
          success: false,
          error: 'Pop-up blocked. Please allow pop-ups for PDF export.'
        };
      }

      printWindow.document.write(printHtml);
      printWindow.document.close();

      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Close after a short delay (user may cancel)
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 250);
      };

      return { success: true, filename: `${this.filename}.pdf`, method: 'print-dialog' };
    } catch (error) {
      console.error('PDF export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a full HTML document from content
   */
  createHtmlDocument(htmlContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="MD Formatter Extension">
  <title>${this.escapeHtml(this.filename.replace(/-/g, ' '))}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    p { margin: 0 0 16px 0; }
    a { color: #1a73e8; text-decoration: underline; }
    a:hover { text-decoration: none; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
    }
    th { background: #f5f5f5; font-weight: bold; }
    blockquote {
      margin: 0 0 16px 0;
      padding: 10px 20px;
      border-left: 4px solid #dfe2e5;
      background: #f6f8fa;
      color: #6a737d;
    }
    code {
      font-family: "SF Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      line-height: 1.45;
    }
    pre code { background: none; padding: 0; }
    ul, ol { padding-left: 2em; margin: 0 0 16px 0; }
    li { margin: 4px 0; }
    mark { background: #fff3cd; padding: 2px 4px; }
    hr { border: none; border-top: 2px solid #eaecef; margin: 24px 0; }
    sup { vertical-align: super; font-size: 0.8em; }
    sub { vertical-align: sub; font-size: 0.8em; }
    img { max-width: 100%; height: auto; }
    .footnotes { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eaecef; font-size: 0.9em; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  }

  /**
   * Create a print-optimized HTML document for PDF export
   */
  createPrintHtmlDocument(htmlContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(this.filename.replace(/-/g, ' '))}</title>
  <style>
    @page {
      size: letter;
      margin: 1in;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a { color: #1a73e8 !important; }
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    h1 { font-size: 24pt; margin: 24pt 0 12pt 0; }
    h2 { font-size: 18pt; margin: 20pt 0 10pt 0; }
    h3 { font-size: 14pt; margin: 16pt 0 8pt 0; }
    h4, h5, h6 { font-size: 12pt; margin: 14pt 0 7pt 0; }
    p { margin: 0 0 12pt 0; text-align: justify; }
    a { color: #1a73e8; text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; page-break-inside: avoid; }
    th, td { border: 1px solid #000; padding: 6pt 8pt; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    blockquote {
      margin: 12pt 0 12pt 24pt;
      padding-left: 12pt;
      border-left: 3pt solid #666;
      font-style: italic;
    }
    code {
      font-family: "Courier New", Courier, monospace;
      font-size: 10pt;
      background: #f5f5f5;
      padding: 1pt 3pt;
    }
    pre {
      font-family: "Courier New", Courier, monospace;
      font-size: 10pt;
      background: #f5f5f5;
      padding: 12pt;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code { background: none; padding: 0; }
    ul, ol { padding-left: 24pt; margin: 0 0 12pt 0; }
    li { margin: 3pt 0; }
    mark { background: #ffff00; padding: 0 2pt; }
    hr { border: none; border-top: 1pt solid #666; margin: 18pt 0; }
    sup { vertical-align: super; font-size: 0.7em; }
    sub { vertical-align: sub; font-size: 0.7em; }
    img { max-width: 100%; height: auto; page-break-inside: avoid; }
    .footnotes { margin-top: 24pt; padding-top: 12pt; border-top: 1pt solid #666; font-size: 10pt; }
  </style>
</head>
<body>
${htmlContent}
<script>
  // Auto-trigger print after load
  window.onload = function() {
    document.title = '${this.escapeHtml(this.filename.replace(/-/g, ' '))}';
  };
</script>
</body>
</html>`;
  }

  /**
   * Create DOCX content from HTML
   * Uses a simplified approach with Word-compatible HTML embedded in XML
   */
  createDocxFromHtml(htmlContent) {
    // Convert HTML to Word-compatible format
    const wordHtml = this.convertHtmlToWordFormat(htmlContent);

    // Create the Word ML document
    const wordDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="Generator" content="MD Formatter Extension">
<!--[if gte mso 9]>
<xml>
<o:DocumentProperties>
  <o:Title>${this.escapeHtml(this.filename.replace(/-/g, ' '))}</o:Title>
</o:DocumentProperties>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 1in; }
  body { font-family: "Calibri", "Arial", sans-serif; font-size: 11pt; line-height: 1.5; }
  h1 { font-size: 24pt; font-weight: bold; margin: 24pt 0 12pt 0; }
  h2 { font-size: 18pt; font-weight: bold; margin: 18pt 0 9pt 0; }
  h3 { font-size: 14pt; font-weight: bold; margin: 14pt 0 7pt 0; }
  h4 { font-size: 12pt; font-weight: bold; margin: 12pt 0 6pt 0; }
  p { margin: 0 0 12pt 0; }
  a { color: #0563C1; text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  th, td { border: 1pt solid #000000; padding: 5pt 7pt; }
  th { background-color: #D9D9D9; font-weight: bold; }
  blockquote { margin: 12pt 0 12pt 36pt; padding: 0; border-left: 3pt solid #CCCCCC; padding-left: 12pt; }
  code { font-family: "Consolas", "Courier New", monospace; font-size: 10pt; background-color: #F2F2F2; }
  pre { font-family: "Consolas", "Courier New", monospace; font-size: 10pt; background-color: #F2F2F2; padding: 10pt; }
  ul, ol { margin: 0 0 12pt 0; padding-left: 36pt; }
  li { margin: 3pt 0; }
  sup { vertical-align: super; font-size: 0.7em; }
  sub { vertical-align: sub; font-size: 0.7em; }
</style>
</head>
<body>
${wordHtml}
</body>
</html>`;

    return wordDoc;
  }

  /**
   * Convert HTML to Word-compatible format
   */
  convertHtmlToWordFormat(html) {
    let wordHtml = html;

    // Ensure tables have proper Word formatting
    wordHtml = wordHtml.replace(/<table([^>]*)>/gi, '<table border="1" cellpadding="5" cellspacing="0"$1>');

    // Convert mark to span with background (Word doesn't support mark)
    wordHtml = wordHtml.replace(/<mark([^>]*)>/gi, '<span style="background-color:#FFFF00;"$1>');
    wordHtml = wordHtml.replace(/<\/mark>/gi, '</span>');

    // Ensure links have Word-compatible styling
    wordHtml = wordHtml.replace(/<a\s+href="([^"]+)"([^>]*)>/gi, (match, url, rest) => {
      if (!rest.includes('style=')) {
        return `<a href="${url}" style="color:#0563C1;text-decoration:underline;"${rest}>`;
      }
      return match;
    });

    // Remove border-radius (not supported in Word)
    wordHtml = wordHtml.replace(/border-radius:[^;]+;/gi, '');

    return wordHtml;
  }

  /**
   * Create RTF content from HTML (for maximum compatibility)
   */
  createRtfFromHtml(htmlContent) {
    // RTF header
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033';
    rtf += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}{\\f1\\fmodern\\fcharset0 Consolas;}}';
    rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red26\\green115\\blue232;\\red128\\green128\\blue128;}';
    rtf += '\\viewkind4\\uc1\\pard\\f0\\fs22 ';

    // Convert HTML to RTF
    rtf += this.htmlToRtf(htmlContent);

    rtf += '}';
    return rtf;
  }

  /**
   * Convert HTML to RTF format
   */
  htmlToRtf(html) {
    let rtf = '';

    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Process nodes recursively
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Escape RTF special characters
        return this.escapeRtf(node.textContent);
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      let result = '';
      let childContent = '';

      // Process children
      for (const child of node.childNodes) {
        childContent += processNode(child);
      }

      switch (tag) {
        case 'h1':
          result = `\\pard\\sb480\\sa240\\b\\fs48 ${childContent}\\b0\\fs22\\par `;
          break;
        case 'h2':
          result = `\\pard\\sb360\\sa180\\b\\fs36 ${childContent}\\b0\\fs22\\par `;
          break;
        case 'h3':
          result = `\\pard\\sb240\\sa120\\b\\fs28 ${childContent}\\b0\\fs22\\par `;
          break;
        case 'h4':
        case 'h5':
        case 'h6':
          result = `\\pard\\sb180\\sa90\\b\\fs24 ${childContent}\\b0\\fs22\\par `;
          break;
        case 'p':
          result = `\\pard\\sa240 ${childContent}\\par `;
          break;
        case 'br':
          result = '\\line ';
          break;
        case 'strong':
        case 'b':
          result = `\\b ${childContent}\\b0 `;
          break;
        case 'em':
        case 'i':
          result = `\\i ${childContent}\\i0 `;
          break;
        case 'u':
          result = `\\ul ${childContent}\\ulnone `;
          break;
        case 'del':
        case 's':
          result = `\\strike ${childContent}\\strike0 `;
          break;
        case 'code':
          result = `\\f1 ${childContent}\\f0 `;
          break;
        case 'a':
          const href = node.getAttribute('href') || '';
          result = `{\\field{\\*\\fldinst HYPERLINK "${this.escapeRtf(href)}"}{\\fldrslt\\cf2\\ul ${childContent}}}`;
          break;
        case 'ul':
        case 'ol':
          result = childContent;
          break;
        case 'li':
          const bullet = node.parentElement?.tagName.toLowerCase() === 'ol' ? '1.' : '\\bullet';
          result = `\\pard\\li720\\fi-360 ${bullet}\\tab ${childContent}\\par `;
          break;
        case 'blockquote':
          result = `\\pard\\li720\\ri720\\cf3\\i ${childContent}\\cf1\\i0\\par `;
          break;
        case 'pre':
          result = `\\pard\\f1\\fs20 ${childContent}\\f0\\fs22\\par `;
          break;
        case 'hr':
          result = '\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par ';
          break;
        case 'sup':
          result = `\\super ${childContent}\\nosupersub `;
          break;
        case 'sub':
          result = `\\sub ${childContent}\\nosupersub `;
          break;
        case 'table':
          result = this.convertTableToRtf(node);
          break;
        case 'div':
        case 'section':
        case 'article':
        case 'span':
        case 'mark':
          result = childContent;
          break;
        default:
          result = childContent;
      }

      return result;
    };

    rtf = processNode(tempDiv);
    return rtf;
  }

  /**
   * Convert HTML table to RTF
   */
  convertTableToRtf(tableNode) {
    let rtf = '';
    const rows = tableNode.querySelectorAll('tr');

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const cellWidth = Math.floor(9000 / cells.length); // Distribute width evenly

      // Row definition
      rtf += '\\trowd\\trgaph108\\trleft0';
      cells.forEach((_, i) => {
        rtf += `\\clbrdrt\\brdrw15\\brdrs\\clbrdrl\\brdrw15\\brdrs\\clbrdrb\\brdrw15\\brdrs\\clbrdrr\\brdrw15\\brdrs`;
        rtf += `\\cellx${cellWidth * (i + 1)}`;
      });
      rtf += ' ';

      // Cell content
      cells.forEach((cell) => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        if (isHeader) {
          rtf += `\\pard\\intbl\\b ${this.escapeRtf(cell.textContent)}\\b0\\cell `;
        } else {
          rtf += `\\pard\\intbl ${this.escapeRtf(cell.textContent)}\\cell `;
        }
      });

      rtf += '\\row ';
    });

    return rtf + '\\pard ';
  }

  /**
   * Escape special characters for RTF
   */
  escapeRtf(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\line ')
      .replace(/[\u0080-\uffff]/g, char => `\\u${char.charCodeAt(0)}?`);
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats() {
    return [
      { id: 'html', name: 'HTML Document', extension: '.html', description: 'Web page format' },
      { id: 'docx', name: 'Word Document', extension: '.docx', description: 'Microsoft Word / Google Docs' },
      { id: 'rtf', name: 'Rich Text Format', extension: '.rtf', description: 'Universal compatibility' },
      { id: 'pdf', name: 'PDF Document', extension: '.pdf', description: 'Print to PDF' }
    ];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentExporter;
}
