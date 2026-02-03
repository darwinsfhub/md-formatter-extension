/**
 * Markdown Formatter - Options Page Controller
 */

class OptionsController {
  constructor() {
    this.storage = new StorageManager();
    this.settings = {};
    this.init();
  }

  async init() {
    await this.storage.init();
    this.settings = this.storage.getAll();
    
    this.cacheElements();
    this.applyTheme();
    this.loadSettings();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      // Appearance
      theme: document.getElementById('theme'),
      
      // Behavior
      autoClear: document.getElementById('autoClear'),
      showPreview: document.getElementById('showPreview'),
      livePreview: document.getElementById('livePreview'),
      
      // Output
      defaultFormat: document.getElementById('defaultFormat'),
      includeStyles: document.getElementById('includeStyles'),
      highlightCode: document.getElementById('highlightCode'),
      linkify: document.getElementById('linkify'),
      typographer: document.getElementById('typographer'),
      
      // Data
      exportBtn: document.getElementById('exportBtn'),
      importBtn: document.getElementById('importBtn'),
      importFile: document.getElementById('importFile'),
      resetBtn: document.getElementById('resetBtn'),
      
      // Shortcuts link
      shortcutsLink: document.getElementById('shortcutsLink'),
      
      // Status
      saveStatus: document.getElementById('saveStatus')
    };
  }

  applyTheme() {
    const theme = this.settings.theme || 'system';
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  loadSettings() {
    // Appearance
    this.elements.theme.value = this.settings.theme || 'system';
    
    // Behavior
    this.elements.autoClear.checked = this.settings.autoClear || false;
    this.elements.showPreview.checked = this.settings.showPreview !== false;
    this.elements.livePreview.checked = this.settings.livePreview !== false;
    
    // Output
    this.elements.defaultFormat.value = this.settings.defaultFormat || 'google-docs';
    this.elements.includeStyles.checked = this.settings.includeStyles !== false;
    this.elements.highlightCode.checked = this.settings.highlightCode !== false;
    this.elements.linkify.checked = this.settings.linkify !== false;
    this.elements.typographer.checked = this.settings.typographer !== false;
  }

  bindEvents() {
    // Appearance
    this.elements.theme.addEventListener('change', (e) => {
      this.saveSetting('theme', e.target.value);
      this.applyTheme();
    });
    
    // Behavior
    this.elements.autoClear.addEventListener('change', (e) => {
      this.saveSetting('autoClear', e.target.checked);
    });
    this.elements.showPreview.addEventListener('change', (e) => {
      this.saveSetting('showPreview', e.target.checked);
    });
    this.elements.livePreview.addEventListener('change', (e) => {
      this.saveSetting('livePreview', e.target.checked);
    });
    
    // Output
    this.elements.defaultFormat.addEventListener('change', (e) => {
      this.saveSetting('defaultFormat', e.target.value);
    });
    this.elements.includeStyles.addEventListener('change', (e) => {
      this.saveSetting('includeStyles', e.target.checked);
    });
    this.elements.highlightCode.addEventListener('change', (e) => {
      this.saveSetting('highlightCode', e.target.checked);
    });
    this.elements.linkify.addEventListener('change', (e) => {
      this.saveSetting('linkify', e.target.checked);
    });
    this.elements.typographer.addEventListener('change', (e) => {
      this.saveSetting('typographer', e.target.checked);
    });
    
    // Data
    this.elements.exportBtn.addEventListener('click', () => this.exportSettings());
    this.elements.importBtn.addEventListener('click', () => this.elements.importFile.click());
    this.elements.importFile.addEventListener('change', (e) => this.importSettings(e));
    this.elements.resetBtn.addEventListener('click', () => this.resetSettings());
    
    // Shortcuts link
    this.elements.shortcutsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  async saveSetting(key, value) {
    this.settings[key] = value;
    await this.storage.set(key, value);
    this.showSaveStatus();
  }

  showSaveStatus() {
    this.elements.saveStatus.textContent = 'Settings saved';
    this.elements.saveStatus.classList.add('visible');
    
    setTimeout(() => {
      this.elements.saveStatus.classList.remove('visible');
    }, 2000);
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
    
    this.elements.saveStatus.textContent = 'Settings exported';
    this.elements.saveStatus.classList.add('visible');
    setTimeout(() => {
      this.elements.saveStatus.classList.remove('visible');
    }, 2000);
  }

  async importSettings(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const result = await this.storage.importSettings(text);
      
      if (result.success) {
        this.settings = this.storage.getAll();
        this.loadSettings();
        this.applyTheme();
        
        this.elements.saveStatus.textContent = 'Settings imported';
        this.elements.saveStatus.classList.add('visible');
      } else {
        this.elements.saveStatus.textContent = 'Import failed: ' + result.error;
        this.elements.saveStatus.style.color = '#d93025';
        this.elements.saveStatus.classList.add('visible');
      }
    } catch (error) {
      this.elements.saveStatus.textContent = 'Invalid settings file';
      this.elements.saveStatus.style.color = '#d93025';
      this.elements.saveStatus.classList.add('visible');
    }
    
    setTimeout(() => {
      this.elements.saveStatus.classList.remove('visible');
      this.elements.saveStatus.style.color = '';
    }, 3000);
    
    e.target.value = '';
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      await this.storage.reset();
      this.settings = this.storage.getAll();
      this.loadSettings();
      this.applyTheme();
      
      this.elements.saveStatus.textContent = 'Settings reset to defaults';
      this.elements.saveStatus.classList.add('visible');
      setTimeout(() => {
        this.elements.saveStatus.classList.remove('visible');
      }, 2000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
