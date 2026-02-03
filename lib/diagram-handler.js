/**
 * Diagram Handler - ASCII art preservation, Mermaid support, and format conversion
 *
 * Key Features:
 * - Detect ASCII diagrams in text
 * - Convert ASCII diagrams to SVG for perfect preservation
 * - Render Mermaid diagrams to SVG
 * - Convert between ASCII and Mermaid formats
 */

class DiagramHandler {
  constructor() {
    // Monospace font settings for ASCII rendering
    this.fontFamily = '"SF Mono", "Fira Code", "Consolas", "Monaco", "Courier New", monospace';
    this.fontSize = 14;
    this.lineHeight = 1.2;
    this.charWidth = 8.4; // Approximate width of monospace character at 14px
    this.charHeight = this.fontSize * this.lineHeight;

    // ASCII art detection patterns
    this.asciiPatterns = {
      boxDrawing: /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/,
      simpleBox: /[\+\-\|]/,
      arrows: /[←→↑↓↔↕⇐⇒⇑⇓<>^v]/,
      corners: /[\/\\]/,
      decorative: /[*#@=~`'"]/
    };

    // Mermaid initialization flag
    this.mermaidInitialized = false;
  }

  // ==========================================
  // ASCII Diagram Detection
  // ==========================================

  /**
   * Detect if a code block contains ASCII art/diagram
   */
  isAsciiDiagram(text) {
    if (!text || text.trim().length === 0) return false;

    const lines = text.split('\n');

    // Heuristics for ASCII diagram detection
    let score = 0;
    let hasMultipleLines = lines.length >= 3;
    let hasConsistentWidth = this.hasConsistentLineWidth(lines);
    let hasBoxCharacters = this.asciiPatterns.boxDrawing.test(text) ||
                          this.asciiPatterns.simpleBox.test(text);
    let hasArrows = this.asciiPatterns.arrows.test(text);
    let hasRepeatedPatterns = this.hasRepeatedStructure(text);
    let hasAlignedElements = this.hasAlignedElements(lines);

    // Score the likelihood of being a diagram
    if (hasMultipleLines) score += 1;
    if (hasConsistentWidth) score += 2;
    if (hasBoxCharacters) score += 3;
    if (hasArrows) score += 2;
    if (hasRepeatedPatterns) score += 2;
    if (hasAlignedElements) score += 2;

    // Check for common diagram indicators
    if (text.includes('+--') || text.includes('|  ')) score += 2;
    if (text.includes('-->') || text.includes('<--')) score += 2;
    if (text.includes('===') || text.includes('---')) score += 1;

    return score >= 4;
  }

  /**
   * Check if lines have consistent width (common in diagrams)
   */
  hasConsistentLineWidth(lines) {
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    if (nonEmptyLines.length < 2) return false;

    const lengths = nonEmptyLines.map(l => l.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

    // Low variance indicates consistent width
    return variance < avgLength * 0.5;
  }

  /**
   * Check for repeated structural patterns
   */
  hasRepeatedStructure(text) {
    // Look for repeated box characters in sequence
    const patterns = [
      /[-]{3,}/g,    // Horizontal lines
      /[=]{3,}/g,    // Double horizontal lines
      /[|]\s*[|]/g,  // Vertical alignment
      /\+[-]+\+/g,   // Box corners
      /[─]{3,}/g,    // Unicode horizontal
      /[│]/g         // Unicode vertical
    ];

    let matches = 0;
    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found && found.length >= 2) matches++;
    }

    return matches >= 2;
  }

  /**
   * Check if elements are vertically aligned
   */
  hasAlignedElements(lines) {
    if (lines.length < 3) return false;

    // Find positions of pipe characters or other vertical elements
    const pipePositions = lines.map(line => {
      const positions = [];
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '|' || line[i] === '│') {
          positions.push(i);
        }
      }
      return positions;
    }).filter(p => p.length > 0);

    if (pipePositions.length < 2) return false;

    // Check if pipe positions align across lines
    const firstLinePositions = pipePositions[0];
    let alignedCount = 0;

    for (let i = 1; i < pipePositions.length; i++) {
      for (const pos of firstLinePositions) {
        if (pipePositions[i].includes(pos)) {
          alignedCount++;
        }
      }
    }

    return alignedCount >= 2;
  }

  // ==========================================
  // ASCII to SVG Conversion
  // ==========================================

  /**
   * Convert ASCII diagram to SVG image
   * This is the key function for preserving ASCII art appearance
   */
  asciiToSvg(asciiText, options = {}) {
    const {
      fontFamily = this.fontFamily,
      fontSize = this.fontSize,
      backgroundColor = '#ffffff',
      textColor = '#000000',
      padding = 16,
      includeBackground = true
    } = options;

    const lines = asciiText.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));

    // Calculate dimensions
    const charWidth = fontSize * 0.6; // Monospace character width ratio
    const lineHeight = fontSize * 1.2;
    const width = (maxLineLength * charWidth) + (padding * 2);
    const height = (lines.length * lineHeight) + (padding * 2);

    // Build SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Add styles
    svg += `<style>
      .ascii-text {
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        fill: ${textColor};
        white-space: pre;
        dominant-baseline: hanging;
      }
    </style>`;

    // Add background
    if (includeBackground) {
      svg += `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;
    }

    // Add text lines
    lines.forEach((line, index) => {
      const y = padding + (index * lineHeight);
      // Escape special XML characters
      const escapedLine = this.escapeXml(line);
      svg += `<text x="${padding}" y="${y}" class="ascii-text">${escapedLine}</text>`;
    });

    svg += '</svg>';

    return svg;
  }

  /**
   * Convert ASCII to SVG data URL for embedding in HTML
   */
  asciiToSvgDataUrl(asciiText, options = {}) {
    const svg = this.asciiToSvg(asciiText, options);
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Convert ASCII to base64 SVG for maximum compatibility
   */
  asciiToBase64Svg(asciiText, options = {}) {
    const svg = this.asciiToSvg(asciiText, options);
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Create an HTML img element with the ASCII diagram as SVG
   */
  asciiToImgTag(asciiText, options = {}) {
    const dataUrl = this.asciiToBase64Svg(asciiText, options);
    const lines = asciiText.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));
    const width = (maxLength * this.fontSize * 0.6) + 32;
    const height = (lines.length * this.fontSize * 1.2) + 32;

    return `<img src="${dataUrl}" alt="ASCII Diagram" style="max-width:100%;height:auto;" width="${width}" height="${height}">`;
  }

  // ==========================================
  // Mermaid Diagram Support
  // ==========================================

  /**
   * Check if text is a Mermaid diagram
   */
  isMermaidDiagram(text) {
    const mermaidKeywords = [
      'graph ', 'graph\n', 'flowchart ', 'flowchart\n',
      'sequenceDiagram', 'classDiagram', 'stateDiagram',
      'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph',
      'mindmap', 'timeline', 'quadrantChart', 'sankey',
      'xychart', 'block-beta'
    ];

    const trimmed = text.trim();
    return mermaidKeywords.some(kw => trimmed.startsWith(kw));
  }

  /**
   * Render Mermaid diagram to SVG
   * Note: This requires the Mermaid library to be loaded
   */
  async mermaidToSvg(mermaidCode, options = {}) {
    const {
      theme = 'default',
      backgroundColor = '#ffffff'
    } = options;

    // Check if Mermaid is available
    if (typeof mermaid === 'undefined') {
      // Try to load Mermaid dynamically
      await this.loadMermaid();
    }

    if (typeof mermaid === 'undefined') {
      // Fallback: return error message as SVG
      return this.createErrorSvg('Mermaid library not available', mermaidCode);
    }

    try {
      // Initialize Mermaid if not done
      if (!this.mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme,
          securityLevel: 'strict',
          fontFamily: this.fontFamily
        });
        this.mermaidInitialized = true;
      }

      // Generate unique ID for this diagram
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Render the diagram
      const { svg } = await mermaid.render(id, mermaidCode);

      return svg;
    } catch (error) {
      console.error('Mermaid rendering failed:', error);
      return this.createErrorSvg(`Mermaid error: ${error.message}`, mermaidCode);
    }
  }

  /**
   * Load Mermaid library dynamically
   */
  async loadMermaid() {
    return new Promise((resolve, reject) => {
      if (typeof mermaid !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.onload = () => {
        this.mermaidInitialized = false; // Reset to allow initialization
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Mermaid'));
      document.head.appendChild(script);
    });
  }

  /**
   * Create error placeholder SVG
   */
  createErrorSvg(message, code) {
    const lines = code.split('\n');
    const width = 400;
    const height = 100 + (lines.length * 16);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#fff3cd"/>
      <text x="10" y="24" fill="#856404" font-family="sans-serif" font-size="14" font-weight="bold">${this.escapeXml(message)}</text>
      <text x="10" y="48" fill="#856404" font-family="monospace" font-size="12">
        ${lines.slice(0, 5).map((l, i) => `<tspan x="10" dy="${i === 0 ? 0 : 16}">${this.escapeXml(l.substring(0, 50))}</tspan>`).join('')}
      </text>
    </svg>`;
  }

  // ==========================================
  // ASCII to Mermaid Conversion
  // ==========================================

  /**
   * Attempt to convert ASCII flowchart to Mermaid syntax
   * This handles common patterns like boxes and arrows
   */
  asciiToMermaid(asciiText) {
    const lines = asciiText.split('\n');
    const nodes = [];
    const connections = [];

    // Parse ASCII for nodes (boxes) and connections (arrows)
    const boxPattern = /\[([^\]]+)\]|\(([^)]+)\)|<([^>]+)>|\{([^}]+)\}/g;
    const arrowPatterns = [
      { pattern: /--?>/, direction: '-->' },
      { pattern: /<--?/, direction: '<--' },
      { pattern: /==>/, direction: '==>' },
      { pattern: /<==/, direction: '<==' },
      { pattern: /-\.->/, direction: '-.->' },
      { pattern: /<-\.-/, direction: '<-.-' }
    ];

    // Extract nodes from ASCII
    let nodeId = 0;
    const nodeMap = new Map();

    for (const line of lines) {
      let match;
      const regex = /\+[-]+\+|[\[\(\{<]([^\]\)\}>]+)[\]\)\}>]/g;

      while ((match = regex.exec(line)) !== null) {
        const text = match[1] || match[0];
        const cleanText = text.replace(/[-+|]/g, '').trim();

        if (cleanText && !nodeMap.has(cleanText)) {
          const id = `node${nodeId++}`;
          nodeMap.set(cleanText, id);
          nodes.push({ id, text: cleanText });
        }
      }
    }

    // Try to detect connections
    const fullText = asciiText;

    // Look for arrow patterns between node texts
    for (const [text1, id1] of nodeMap) {
      for (const [text2, id2] of nodeMap) {
        if (text1 !== text2) {
          // Check if there's an arrow between these nodes
          for (const arrow of arrowPatterns) {
            const pattern1 = new RegExp(
              text1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
              '.*?' +
              arrow.pattern.source +
              '.*?' +
              text2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              's'
            );

            if (pattern1.test(fullText)) {
              connections.push({ from: id1, to: id2, type: arrow.direction });
            }
          }
        }
      }
    }

    // Build Mermaid syntax
    if (nodes.length === 0) {
      return null; // Cannot convert
    }

    let mermaid = 'flowchart TD\n';

    // Add nodes
    for (const node of nodes) {
      mermaid += `    ${node.id}["${node.text}"]\n`;
    }

    // Add connections
    for (const conn of connections) {
      mermaid += `    ${conn.from} ${conn.type} ${conn.to}\n`;
    }

    // If no connections found, try to create linear flow
    if (connections.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        mermaid += `    ${nodes[i].id} --> ${nodes[i + 1].id}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Convert Mermaid flowchart to ASCII art
   */
  mermaidToAscii(mermaidCode) {
    // Parse Mermaid syntax
    const lines = mermaidCode.split('\n');
    const nodes = [];
    const connections = [];

    // Extract nodes and connections
    const nodePattern = /(\w+)\[["']?([^\]"']+)["']?\]/;
    const connPattern = /(\w+)\s*(-->|--\>|==>|-.->)\s*(\w+)/;
    const nodeTexts = new Map();

    for (const line of lines) {
      // Parse nodes
      const nodeMatch = line.match(nodePattern);
      if (nodeMatch) {
        nodeTexts.set(nodeMatch[1], nodeMatch[2]);
      }

      // Parse connections
      const connMatch = line.match(connPattern);
      if (connMatch) {
        connections.push({
          from: connMatch[1],
          to: connMatch[3],
          type: connMatch[2]
        });
      }
    }

    // Build ASCII representation
    if (nodeTexts.size === 0) return null;

    const boxWidth = Math.max(...[...nodeTexts.values()].map(t => t.length)) + 4;
    let ascii = '';

    const nodeIds = [...nodeTexts.keys()];

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const text = nodeTexts.get(nodeId) || nodeId;
      const paddedText = text.padStart((boxWidth - 2 + text.length) / 2).padEnd(boxWidth - 2);

      // Draw box
      ascii += '+' + '-'.repeat(boxWidth - 2) + '+\n';
      ascii += '|' + paddedText + '|\n';
      ascii += '+' + '-'.repeat(boxWidth - 2) + '+\n';

      // Draw arrow to next node if connected
      const conn = connections.find(c => c.from === nodeId);
      if (conn && i < nodeIds.length - 1) {
        const arrowPadding = Math.floor(boxWidth / 2);
        ascii += ' '.repeat(arrowPadding) + '|\n';
        ascii += ' '.repeat(arrowPadding) + 'v\n';
      }
    }

    return ascii;
  }

  // ==========================================
  // Process Markdown for Diagrams
  // ==========================================

  /**
   * Process markdown and convert diagrams to images
   * This is the main entry point for diagram handling
   */
  processMarkdown(markdown, options = {}) {
    const {
      convertAsciiToSvg = true,
      renderMermaid = true,
      preserveOriginal = false
    } = options;

    let processed = markdown;

    // Process fenced code blocks
    processed = processed.replace(
      /```(ascii|diagram|art|box)?\n([\s\S]*?)```/g,
      (match, lang, content) => {
        if (this.isAsciiDiagram(content)) {
          if (convertAsciiToSvg) {
            const imgTag = this.asciiToImgTag(content.trimEnd());
            return preserveOriginal ? match + '\n\n' + imgTag : imgTag;
          }
        }
        return match;
      }
    );

    // Process Mermaid blocks
    if (renderMermaid) {
      processed = processed.replace(
        /```mermaid\n([\s\S]*?)```/g,
        (match, content) => {
          // Mark for async rendering
          const placeholder = `<!--MERMAID:${btoa(content.trim())}-->`;
          return placeholder;
        }
      );
    }

    return processed;
  }

  /**
   * Render all Mermaid placeholders in HTML
   * Call this after initial markdown processing
   */
  async renderMermaidPlaceholders(html) {
    const placeholderPattern = /<!--MERMAID:([A-Za-z0-9+/=]+)-->/g;
    let match;
    let result = html;

    while ((match = placeholderPattern.exec(html)) !== null) {
      const mermaidCode = atob(match[1]);
      try {
        const svg = await this.mermaidToSvg(mermaidCode);
        result = result.replace(match[0], svg);
      } catch (error) {
        console.error('Failed to render Mermaid:', error);
        // Keep placeholder or show error
        result = result.replace(match[0], this.createErrorSvg('Mermaid rendering failed', mermaidCode));
      }
    }

    return result;
  }

  // ==========================================
  // Utility Functions
  // ==========================================

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Download SVG as file
   */
  downloadSvg(svg, filename = 'diagram.svg') {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Convert SVG to PNG using canvas
   */
  async svgToPng(svg, scale = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(url);

        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };

      img.src = url;
    });
  }

  /**
   * Copy diagram to clipboard as image
   */
  async copyDiagramToClipboard(diagramText, type = 'auto') {
    let svg;

    if (type === 'auto') {
      type = this.isMermaidDiagram(diagramText) ? 'mermaid' : 'ascii';
    }

    if (type === 'mermaid') {
      svg = await this.mermaidToSvg(diagramText);
    } else {
      svg = this.asciiToSvg(diagramText);
    }

    // Convert to PNG blob for clipboard
    const pngBlob = await this.svgToPng(svg);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob
        })
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagramHandler;
}
