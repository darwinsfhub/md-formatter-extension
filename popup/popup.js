/**
 * Markdown Formatter - Popup Application
 * Main application controller for the extension popup
 */

class MarkdownFormatterApp {
  constructor() {
    // Initialize managers
    this.parser = new MarkdownParser();
    this.optimizer = new HTMLOptimizer();
    this.clipboard = new ClipboardManager();
    this.storage = new StorageManager();
    this.exporter = new DocumentExporter();
    
    // State
    this.currentHtml = '';
    this.currentPlainText = '';
    this.debounceTimer = null;
    this.settings = {};
    
    // DOM Elements
    this.elements = {};
    
    // Initialize
    this.init();
  }

  async init() {
    // Load settings
    await this.storage.init();
    this.settings = this.storage.getAll();
    
    // Load clipboard history
    await this.clipboard.loadHistory();
    
    // Cache DOM elements
    this.cacheElements();
    
    // Apply theme
    this.applyTheme();
    
    // Bind events
    this.bindEvents();
    
    // Apply settings to UI
    this.applySettingsToUI();
    
    // Load saved draft
    this.loadDraft();
    
    // Set initial format
    this.elements.formatSelect.value = this.settings.defaultFormat || 'google-docs';
    
    // Initial preview state
    if (!this.settings.showPreview) {
      this.elements.previewSection.classList.add('collapsed');
    }
    
    // Focus input
    this.elements.markdownInput.focus();
    
    console.log('Markdown Formatter initialized');
  }

  cacheElements() {
    this.elements = {
      // Main elements
      app: document.getElementById('app'),
      markdownInput: document.getElementById('markdownInput'),
      previewContent: document.getElementById('previewContent'),
      previewSection: document.getElementById('previewSection'),
      formatSelect: document.getElementById('formatSelect'),
      
      // Counters
      wordCount: document.getElementById('wordCount'),
      charCount: document.getElementById('charCount'),
      
      // Buttons
      copyFormattedBtn: document.getElementById('copyFormattedBtn'),
      copyPlainBtn: document.getElementById('copyPlainBtn'),
      clearBtn: document.getElementById('clearBtn'),
      previewToggle: document.getElementById('previewToggle'),
      themeToggle: document.getElementById('themeToggle'),
      settingsBtn: document.getElementById('settingsBtn'),
      templateBtn: document.getElementById('templateBtn'),
      snippetBtn: document.getElementById('snippetBtn'),
      pasteConvertBtn: document.getElementById('pasteConvertBtn'),
      generateTocBtn: document.getElementById('generateTocBtn'),
      exportBtn: document.getElementById('exportBtn'),
      exportMenu: document.getElementById('exportMenu'),
      
      // Status
      status: document.getElementById('status'),
      
      // Settings panel
      settingsPanel: document.getElementById('settingsPanel'),
      settingsClose: document.getElementById('settingsClose'),
      themeSetting: document.getElementById('themeSetting'),
      autoClearSetting: document.getElementById('autoClearSetting'),
      showPreviewSetting: document.getElementById('showPreviewSetting'),
      livePreviewSetting: document.getElementById('livePreviewSetting'),
      includeStylesSetting: document.getElementById('includeStylesSetting'),
      highlightCodeSetting: document.getElementById('highlightCodeSetting'),
      linkifySetting: document.getElementById('linkifySetting'),
      typographerSetting: document.getElementById('typographerSetting'),
      defaultFormatSetting: document.getElementById('defaultFormatSetting'),
      exportSettingsBtn: document.getElementById('exportSettingsBtn'),
      importSettingsBtn: document.getElementById('importSettingsBtn'),
      importSettingsFile: document.getElementById('importSettingsFile'),
      resetSettingsBtn: document.getElementById('resetSettingsBtn'),
      
      // Modals
      templatesModal: document.getElementById('templatesModal'),
      templatesClose: document.getElementById('templatesClose'),
      templatesList: document.getElementById('templatesList'),
      createTemplateBtn: document.getElementById('createTemplateBtn'),
      
      snippetsModal: document.getElementById('snippetsModal'),
      snippetsClose: document.getElementById('snippetsClose'),
      snippetsList: document.getElementById('snippetsList'),
      createSnippetBtn: document.getElementById('createSnippetBtn'),
      
      historyModal: document.getElementById('historyModal'),
      historyClose: document.getElementById('historyClose'),
      historyList: document.getElementById('historyList'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn')
    };
  }

  bindEvents() {
    // Input events
    this.elements.markdownInput.addEventListener('input', () => this.handleInput());
    this.elements.markdownInput.addEventListener('paste', (e) => this.handlePaste(e));
    
    // Format change
    this.elements.formatSelect.addEventListener('change', () => this.handleFormatChange());
    
    // Copy buttons
    this.elements.copyFormattedBtn.addEventListener('click', () => this.copyFormatted());
    this.elements.copyPlainBtn.addEventListener('click', () => this.copyPlain());
    
    // Clear button
    this.elements.clearBtn.addEventListener('click', () => this.clearInput());
    
    // Paste & Convert button
    this.elements.pasteConvertBtn.addEventListener('click', () => this.pasteAndConvert());
    
    // Generate TOC button
    this.elements.generateTocBtn.addEventListener('click', () => this.generateTOC());

    // Export dropdown
    this.elements.exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleExportMenu();
    });

    // Export format options
    this.elements.exportMenu.querySelectorAll('.export-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = option.dataset.format;
        this.exportDocument(format);
        this.closeExportMenu();
      });
    });

    // Close export menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.export-dropdown')) {
        this.closeExportMenu();
      }
    });

    // Preview toggle
    this.elements.previewToggle.addEventListener('click', () => this.togglePreview());
    
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Settings
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    this.elements.settingsClose.addEventListener('click', () => this.closeSettings());
    
    // Templates
    this.elements.templateBtn.addEventListener('click', () => this.openTemplates());
    this.elements.templatesClose.addEventListener('click', () => this.closeTemplates());
    this.elements.createTemplateBtn.addEventListener('click', () => this.createTemplate());
    
    // Snippets
    this.elements.snippetBtn.addEventListener('click', () => this.openSnippets());
    this.elements.snippetsClose.addEventListener('click', () => this.closeSnippets());
    this.elements.createSnippetBtn.addEventListener('click', () => this.createSnippet());
    
    // History
    this.elements.historyClose?.addEventListener('click', () => this.closeHistory());
    this.elements.clearHistoryBtn?.addEventListener('click', () => this.clearHistory());
    
    // Settings controls
    this.elements.themeSetting.addEventListener('change', (e) => this.updateSetting('theme', e.target.value));
    this.elements.autoClearSetting.addEventListener('change', (e) => this.updateSetting('autoClear', e.target.checked));
    this.elements.showPreviewSetting.addEventListener('change', (e) => this.updateSetting('showPreview', e.target.checked));
    this.elements.livePreviewSetting.addEventListener('change', (e) => this.updateSetting('livePreview', e.target.checked));
    this.elements.includeStylesSetting.addEventListener('change', (e) => this.updateSetting('includeStyles', e.target.checked));
    this.elements.highlightCodeSetting.addEventListener('change', (e) => this.updateSetting('highlightCode', e.target.checked));
    this.elements.linkifySetting.addEventListener('change', (e) => this.updateSetting('linkify', e.target.checked));
    this.elements.typographerSetting.addEventListener('change', (e) => this.updateSetting('typographer', e.target.checked));
    this.elements.defaultFormatSetting.addEventListener('change', (e) => this.updateSetting('defaultFormat', e.target.value));
    
    // Settings import/export
    this.elements.exportSettingsBtn.addEventListener('click', () => this.exportSettings());
    this.elements.importSettingsBtn.addEventListener('click', () => this.elements.importSettingsFile.click());
    this.elements.importSettingsFile.addEventListener('change', (e) => this.importSettings(e));
    this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => this.closeAllModals());
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Auto-save draft
    setInterval(() => this.saveDraft(), 30000);
  }

  // ==========================================
  // Input Handling
  // ==========================================

  handleInput() {
    this.updateCounts();
    
    if (this.settings.livePreview) {
      this.debouncePreview();
    }
  }

  handlePaste(e) {
    // Let the paste happen naturally, then process
    setTimeout(() => {
      this.handleInput();
    }, 0);
  }

  updateCounts() {
    const text = this.elements.markdownInput.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    this.elements.wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    this.elements.charCount.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
  }

  debouncePreview() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.updatePreview();
    }, this.settings.previewDebounce || 300);
  }

  updatePreview() {
    const markdown = this.elements.markdownInput.value;
    
    if (!markdown.trim()) {
      this.elements.previewContent.innerHTML = '<div class="preview-placeholder">Preview will appear here...</div>';
      this.currentHtml = '';
      this.currentPlainText = '';
      return;
    }
    
    // Update parser options from settings
    this.parser.options.includeStyles = this.settings.includeStyles;
    this.parser.options.linkify = this.settings.linkify;
    this.parser.options.typographer = this.settings.typographer;
    this.parser.options.highlightCode = this.settings.highlightCode;
    
    // Parse markdown
    const html = this.parser.parse(markdown);
    
    // Optimize for selected platform
    const format = this.elements.formatSelect.value;
    this.currentHtml = this.optimizer.optimize(html, format);
    this.currentPlainText = this.parser.toPlainText(html);
    
    // Display preview (sanitized for display)
    this.elements.previewContent.innerHTML = this.optimizer.sanitize(html);
  }

  handleFormatChange() {
    // Re-process with new format
    if (this.elements.markdownInput.value.trim()) {
      this.updatePreview();
    }
    
    // Save as default if user changes it
    this.storage.set('defaultFormat', this.elements.formatSelect.value);
  }

  // ==========================================
  // Copy Operations
  // ==========================================

  async copyFormatted() {
    const markdown = this.elements.markdownInput.value;
    
    if (!markdown.trim()) {
      this.showStatus('Nothing to copy', 'error');
      return;
    }
    
    // Ensure we have latest conversion
    this.updatePreview();
    
    // Copy to clipboard
    const result = await this.clipboard.copyFormatted(this.currentHtml, this.currentPlainText);
    
    if (result.success) {
      this.showStatus('Copied formatted text!', 'success');
      this.animateCopyButton(this.elements.copyFormattedBtn);
      
      if (this.settings.autoClear) {
        this.clearInput();
      }
    } else {
      this.showStatus(result.error || 'Failed to copy', 'error');
    }
  }

  async copyPlain() {
    const markdown = this.elements.markdownInput.value;
    
    if (!markdown.trim()) {
      this.showStatus('Nothing to copy', 'error');
      return;
    }
    
    // Ensure we have latest conversion
    this.updatePreview();
    
    // Copy plain text
    const result = await this.clipboard.copyPlainText(this.currentPlainText);
    
    if (result.success) {
      this.showStatus('Copied plain text!', 'success');
      this.animateCopyButton(this.elements.copyPlainBtn);
      
      if (this.settings.autoClear) {
        this.clearInput();
      }
    } else {
      this.showStatus(result.error || 'Failed to copy', 'error');
    }
  }

  animateCopyButton(button) {
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>Copied!</span>
    `;
    button.classList.add('success');
    
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove('success');
    }, 1500);
  }

  /**
   * Paste & Convert - Read from clipboard and convert
   */
  async pasteAndConvert() {
    try {
      // Read from clipboard
      const text = await navigator.clipboard.readText();
      
      if (!text || !text.trim()) {
        this.showStatus('Clipboard is empty', 'warning');
        return;
      }
      
      // Set the text in the input
      this.elements.markdownInput.value = text;
      
      // Update preview
      this.updatePreview();
      this.updateCounts();
      
      // Automatically copy the formatted result
      const result = await this.clipboard.copyFormatted(this.currentHtml, this.currentPlainText);
      
      if (result.success) {
        this.showStatus('Pasted, converted, and copied!', 'success');
        this.animateCopyButton(this.elements.copyFormattedBtn);
      } else {
        this.showStatus('Converted! Click Copy to use.', 'success');
      }
      
    } catch (error) {
      console.error('Paste & Convert failed:', error);
      this.showStatus('Could not read clipboard. Try pasting manually.', 'error');
    }
  }

  /**
   * Generate Table of Contents from current markdown
   */
  generateTOC() {
    const markdown = this.elements.markdownInput.value;
    
    if (!markdown.trim()) {
      this.showStatus('Enter some markdown first', 'warning');
      return;
    }
    
    // Extract headings
    const lines = markdown.split('\n');
    const headings = [];
    
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/\*\*|__|\*|_|`/g, ''); // Strip formatting
        headings.push({ level, text });
      }
    });
    
    if (headings.length === 0) {
      this.showStatus('No headings found in markdown', 'warning');
      return;
    }
    
    // Generate TOC markdown
    const minLevel = Math.min(...headings.map(h => h.level));
    const tocLines = ['## Table of Contents', ''];
    
    headings.forEach(h => {
      const indent = '  '.repeat(h.level - minLevel);
      const slug = h.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      tocLines.push(`${indent}- [${h.text}](#${slug})`);
    });
    
    tocLines.push('', '---', '');
    
    // Prepend TOC to the markdown
    this.elements.markdownInput.value = tocLines.join('\n') + markdown;
    
    // Update preview
    this.updatePreview();
    this.updateCounts();
    
    this.showStatus('Table of Contents generated!', 'success');
  }

  /**
   * Toggle export menu visibility
   */
  toggleExportMenu() {
    this.elements.exportMenu.classList.toggle('active');
  }

  /**
   * Close export menu
   */
  closeExportMenu() {
    this.elements.exportMenu.classList.remove('active');
  }

  /**
   * Export document in the specified format
   */
  exportDocument(format) {
    const markdown = this.elements.markdownInput.value;

    if (!markdown.trim()) {
      this.showStatus('Nothing to export', 'error');
      return;
    }

    // Ensure we have latest conversion
    this.updatePreview();

    let result;

    switch (format) {
      case 'html':
        result = this.exporter.exportHtml(this.currentHtml, markdown);
        break;
      case 'docx':
        result = this.exporter.exportDocx(this.currentHtml, markdown);
        break;
      case 'rtf':
        result = this.exporter.exportRtf(this.currentHtml, markdown);
        break;
      case 'pdf':
        result = this.exporter.exportPdf(this.currentHtml, markdown);
        break;
      default:
        result = this.exporter.exportHtml(this.currentHtml, markdown);
    }

    if (result.success) {
      if (result.method === 'print-dialog') {
        this.showStatus('Opening print dialog for PDF...', 'success');
      } else {
        this.showStatus(`Exported as ${result.filename}`, 'success');
      }
    } else {
      this.showStatus(result.error || 'Export failed', 'error');
    }
  }

  /**
   * Export as HTML file (legacy method, kept for compatibility)
   */
  exportHtml() {
    this.exportDocument('html');
  }

  // ==========================================
  // UI Controls
  // ==========================================

  clearInput() {
    this.elements.markdownInput.value = '';
    this.elements.previewContent.innerHTML = '<div class="preview-placeholder">Preview will appear here...</div>';
    this.currentHtml = '';
    this.currentPlainText = '';
    this.updateCounts();
    this.elements.markdownInput.focus();
    this.storage.clearDraft();
  }

  togglePreview() {
    this.elements.previewSection.classList.toggle('collapsed');
    const isCollapsed = this.elements.previewSection.classList.contains('collapsed');
    this.storage.set('showPreview', !isCollapsed);
  }

  showStatus(message, type = '') {
    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;
    
    // Clear after 3 seconds
    setTimeout(() => {
      this.elements.status.textContent = '';
      this.elements.status.className = 'status';
    }, 3000);
  }

  // ==========================================
  // Theme
  // ==========================================

  applyTheme() {
    const theme = this.settings.theme || 'system';
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    this.storage.set('theme', newTheme);
    this.settings.theme = newTheme;
    this.elements.themeSetting.value = newTheme;
  }

  // ==========================================
  // Settings
  // ==========================================

  openSettings() {
    this.elements.settingsPanel.classList.add('active');
  }

  closeSettings() {
    this.elements.settingsPanel.classList.remove('active');
  }

  applySettingsToUI() {
    this.elements.themeSetting.value = this.settings.theme || 'system';
    this.elements.autoClearSetting.checked = this.settings.autoClear || false;
    this.elements.showPreviewSetting.checked = this.settings.showPreview !== false;
    this.elements.livePreviewSetting.checked = this.settings.livePreview !== false;
    this.elements.includeStylesSetting.checked = this.settings.includeStyles !== false;
    this.elements.highlightCodeSetting.checked = this.settings.highlightCode !== false;
    this.elements.linkifySetting.checked = this.settings.linkify !== false;
    this.elements.typographerSetting.checked = this.settings.typographer !== false;
    this.elements.defaultFormatSetting.value = this.settings.defaultFormat || 'google-docs';
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.storage.set(key, value);
    
    // Apply theme change immediately
    if (key === 'theme') {
      this.applyTheme();
    }
    
    // Re-render preview if output settings changed
    if (['includeStyles', 'highlightCode', 'linkify', 'typographer'].includes(key)) {
      if (this.elements.markdownInput.value.trim()) {
        this.updatePreview();
      }
    }
  }

  exportSettings() {
    const json = this.storage.exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-formatter-settings.json';
    a.click();
    
    URL.revokeObjectURL(url);
    this.showStatus('Settings exported', 'success');
  }

  async importSettings(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const result = await this.storage.importSettings(text);
      
      if (result.success) {
        this.settings = this.storage.getAll();
        this.applySettingsToUI();
        this.applyTheme();
        this.showStatus('Settings imported', 'success');
      } else {
        this.showStatus(result.error, 'error');
      }
    } catch (error) {
      this.showStatus('Invalid settings file', 'error');
    }
    
    // Reset file input
    e.target.value = '';
  }

  async resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      await this.storage.reset();
      this.settings = this.storage.getAll();
      this.applySettingsToUI();
      this.applyTheme();
      this.showStatus('Settings reset', 'success');
    }
  }

  // ==========================================
  // Templates
  // ==========================================

  openTemplates() {
    this.renderTemplates();
    this.elements.templatesModal.classList.add('active');
  }

  closeTemplates() {
    this.elements.templatesModal.classList.remove('active');
  }

  renderTemplates() {
    // Combine default and user templates
    const defaultTemplates = this.storage.getDefaultTemplates();
    const userTemplates = this.storage.getTemplates();
    const allTemplates = [...defaultTemplates, ...userTemplates];
    
    if (allTemplates.length === 0) {
      this.elements.templatesList.innerHTML = '<div class="empty-state">No templates available</div>';
      return;
    }
    
    this.elements.templatesList.innerHTML = allTemplates.map(template => `
      <div class="template-item" data-id="${template.id}">
        <div>
          <div class="template-name">${this.escapeHtml(template.name)}</div>
          <div class="template-category">${template.category || 'custom'}</div>
        </div>
        ${!template.id.startsWith('default_') ? `
          <button class="mini-btn template-delete" data-id="${template.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `).join('');
    
    // Bind click events
    this.elements.templatesList.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.template-delete')) {
          e.stopPropagation();
          this.deleteTemplate(item.dataset.id);
          return;
        }
        this.insertTemplate(item.dataset.id);
      });
    });
  }

  insertTemplate(id) {
    const defaultTemplates = this.storage.getDefaultTemplates();
    const userTemplates = this.storage.getTemplates();
    const template = [...defaultTemplates, ...userTemplates].find(t => t.id === id);
    
    if (template) {
      this.elements.markdownInput.value = template.content;
      this.handleInput();
      this.closeTemplates();
      this.showStatus('Template inserted', 'success');
    }
  }

  async createTemplate() {
    const name = prompt('Template name:');
    if (!name) return;
    
    const content = this.elements.markdownInput.value;
    if (!content.trim()) {
      this.showStatus('Enter some content first', 'error');
      return;
    }
    
    await this.storage.addTemplate({ name, content });
    this.renderTemplates();
    this.showStatus('Template created', 'success');
  }

  async deleteTemplate(id) {
    if (confirm('Delete this template?')) {
      await this.storage.deleteTemplate(id);
      this.renderTemplates();
      this.showStatus('Template deleted', 'success');
    }
  }

  // ==========================================
  // Snippets
  // ==========================================

  openSnippets() {
    this.renderSnippets();
    this.elements.snippetsModal.classList.add('active');
  }

  closeSnippets() {
    this.elements.snippetsModal.classList.remove('active');
  }

  renderSnippets() {
    // Default snippets
    const defaultSnippets = [
      { id: 'snippet_bold', name: 'Bold', content: '**text**', trigger: '/b' },
      { id: 'snippet_italic', name: 'Italic', content: '*text*', trigger: '/i' },
      { id: 'snippet_link', name: 'Link', content: '[text](url)', trigger: '/link' },
      { id: 'snippet_image', name: 'Image', content: '![alt](url)', trigger: '/img' },
      { id: 'snippet_code', name: 'Code Block', content: '```\ncode\n```', trigger: '/code' },
      { id: 'snippet_table', name: 'Table', content: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |', trigger: '/table' },
      { id: 'snippet_task', name: 'Task List', content: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3', trigger: '/task' },
      { id: 'snippet_quote', name: 'Blockquote', content: '> Quote text', trigger: '/quote' }
    ];
    
    const userSnippets = this.storage.getSnippets();
    const allSnippets = [...defaultSnippets, ...userSnippets];
    
    this.elements.snippetsList.innerHTML = allSnippets.map(snippet => `
      <div class="snippet-item" data-id="${snippet.id}">
        <div>
          <div class="snippet-name">${this.escapeHtml(snippet.name)}</div>
          <div class="snippet-trigger">${snippet.trigger || ''}</div>
        </div>
        ${!snippet.id.startsWith('snippet_') || snippet.id.includes('user') ? `
          <button class="mini-btn snippet-delete" data-id="${snippet.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `).join('');
    
    // Bind click events
    this.elements.snippetsList.querySelectorAll('.snippet-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.snippet-delete')) {
          e.stopPropagation();
          this.deleteSnippet(item.dataset.id);
          return;
        }
        this.insertSnippet(item.dataset.id);
      });
    });
  }

  insertSnippet(id) {
    const defaultSnippets = [
      { id: 'snippet_bold', content: '**text**' },
      { id: 'snippet_italic', content: '*text*' },
      { id: 'snippet_link', content: '[text](url)' },
      { id: 'snippet_image', content: '![alt](url)' },
      { id: 'snippet_code', content: '```\ncode\n```' },
      { id: 'snippet_table', content: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |' },
      { id: 'snippet_task', content: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3' },
      { id: 'snippet_quote', content: '> Quote text' }
    ];
    
    const userSnippets = this.storage.getSnippets();
    const snippet = [...defaultSnippets, ...userSnippets].find(s => s.id === id);
    
    if (snippet) {
      // Insert at cursor position
      const textarea = this.elements.markdownInput;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      textarea.value = text.substring(0, start) + snippet.content + text.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + snippet.content.length;
      
      this.handleInput();
      this.closeSnippets();
      textarea.focus();
    }
  }

  async createSnippet() {
    const name = prompt('Snippet name:');
    if (!name) return;
    
    const content = prompt('Snippet content:');
    if (!content) return;
    
    const trigger = prompt('Trigger (optional, e.g., /mysnippet):');
    
    await this.storage.addSnippet({ name, content, trigger });
    this.renderSnippets();
    this.showStatus('Snippet created', 'success');
  }

  async deleteSnippet(id) {
    if (confirm('Delete this snippet?')) {
      await this.storage.deleteSnippet(id);
      this.renderSnippets();
      this.showStatus('Snippet deleted', 'success');
    }
  }

  // ==========================================
  // History
  // ==========================================

  openHistory() {
    this.renderHistory();
    this.elements.historyModal.classList.add('active');
  }

  closeHistory() {
    this.elements.historyModal.classList.remove('active');
  }

  renderHistory() {
    const history = this.clipboard.getHistory();
    
    if (history.length === 0) {
      this.elements.historyList.innerHTML = '<div class="empty-state">No copy history</div>';
      return;
    }
    
    this.elements.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div>
          <div class="history-preview">${this.escapeHtml(item.text?.substring(0, 50) || 'No preview')}</div>
          <div class="history-time">${this.formatTime(item.timestamp)}</div>
        </div>
      </div>
    `).join('');
    
    // Bind click events
    this.elements.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => this.reCopy(item.dataset.id));
    });
  }

  async reCopy(id) {
    const result = await this.clipboard.reCopy(id);
    
    if (result.success) {
      this.showStatus('Copied from history', 'success');
      this.closeHistory();
    } else {
      this.showStatus(result.error, 'error');
    }
  }

  async clearHistory() {
    if (confirm('Clear all copy history?')) {
      this.clipboard.clearHistory();
      this.renderHistory();
      this.showStatus('History cleared', 'success');
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  // ==========================================
  // Draft Management
  // ==========================================

  loadDraft() {
    const draft = this.storage.getDraft();
    if (draft.content) {
      this.elements.markdownInput.value = draft.content;
      this.handleInput();
    }
  }

  saveDraft() {
    const content = this.elements.markdownInput.value;
    if (content.trim()) {
      this.storage.saveDraft(content);
    }
  }

  // ==========================================
  // Utilities
  // ==========================================

  closeAllModals() {
    this.elements.templatesModal.classList.remove('active');
    this.elements.snippetsModal.classList.remove('active');
    this.elements.historyModal?.classList.remove('active');
    this.elements.settingsPanel.classList.remove('active');
  }

  handleKeyboard(e) {
    // Escape closes modals
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
    
    // Ctrl/Cmd + Enter to copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.copyFormatted();
    }
    
    // Ctrl/Cmd + Shift + Enter to copy plain
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      this.copyPlain();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MarkdownFormatterApp();
});
