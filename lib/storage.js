/**
 * Storage Manager - Handles settings and data persistence
 * Uses Chrome storage API with fallback to localStorage
 */

class StorageManager {
  constructor() {
    this.defaults = {
      // Appearance
      theme: 'system', // 'system', 'light', 'dark'
      
      // Behavior
      autoClear: false,
      showPreview: true,
      livePreview: true,
      previewDebounce: 300,
      
      // Output
      includeStyles: true,
      convertLineBreaks: false,
      linkify: true,
      typographer: true,
      highlightCode: true,
      defaultFormat: 'google-docs', // 'google-docs', 'microsoft-word', 'notion', 'slack', 'universal'
      
      // Templates
      templates: [],
      
      // Snippets
      snippets: [],
      
      // Draft
      savedDraft: '',
      draftSavedAt: null,
      
      // Misc
      showWordCount: true,
      compactMode: false,
      keyboardShortcutsEnabled: true
    };

    this.settings = { ...this.defaults };
    this.listeners = [];
  }

  /**
   * Initialize storage and load settings
   */
  async init() {
    await this.load();
    this.setupStorageListener();
    return this.settings;
  }

  /**
   * Load settings from storage
   */
  async load() {
    try {
      if (this.isChromeExtension()) {
        const result = await chrome.storage.sync.get(Object.keys(this.defaults));
        this.settings = { ...this.defaults, ...result };
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('mdFormatter_settings');
        if (stored) {
          this.settings = { ...this.defaults, ...JSON.parse(stored) };
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      this.settings = { ...this.defaults };
    }

    return this.settings;
  }

  /**
   * Save settings to storage
   */
  async save(newSettings = {}) {
    try {
      this.settings = { ...this.settings, ...newSettings };

      if (this.isChromeExtension()) {
        await chrome.storage.sync.set(this.settings);
      } else {
        localStorage.setItem('mdFormatter_settings', JSON.stringify(this.settings));
      }

      this.notifyListeners('settingsChanged', this.settings);
      return { success: true };
    } catch (e) {
      console.error('Failed to save settings:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Get a specific setting
   */
  get(key) {
    return this.settings[key] ?? this.defaults[key];
  }

  /**
   * Set a specific setting
   */
  async set(key, value) {
    return this.save({ [key]: value });
  }

  /**
   * Reset settings to defaults
   */
  async reset() {
    this.settings = { ...this.defaults };
    return this.save();
  }

  /**
   * Get all settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Save draft content
   */
  async saveDraft(content) {
    return this.save({
      savedDraft: content,
      draftSavedAt: Date.now()
    });
  }

  /**
   * Get saved draft
   */
  getDraft() {
    return {
      content: this.settings.savedDraft,
      savedAt: this.settings.draftSavedAt
    };
  }

  /**
   * Clear draft
   */
  async clearDraft() {
    return this.save({
      savedDraft: '',
      draftSavedAt: null
    });
  }

  // ========== Templates ==========

  /**
   * Get all templates
   */
  getTemplates() {
    return this.settings.templates || [];
  }

  /**
   * Add a template
   */
  async addTemplate(template) {
    const templates = [...(this.settings.templates || [])];
    templates.push({
      id: `template_${Date.now()}`,
      name: template.name,
      content: template.content,
      category: template.category || 'custom',
      createdAt: Date.now()
    });
    return this.save({ templates });
  }

  /**
   * Update a template
   */
  async updateTemplate(id, updates) {
    const templates = (this.settings.templates || []).map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    );
    return this.save({ templates });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id) {
    const templates = (this.settings.templates || []).filter(t => t.id !== id);
    return this.save({ templates });
  }

  // ========== Snippets ==========

  /**
   * Get all snippets
   */
  getSnippets() {
    return this.settings.snippets || [];
  }

  /**
   * Add a snippet
   */
  async addSnippet(snippet) {
    const snippets = [...(this.settings.snippets || [])];
    snippets.push({
      id: `snippet_${Date.now()}`,
      name: snippet.name,
      content: snippet.content,
      trigger: snippet.trigger || '',
      createdAt: Date.now()
    });
    return this.save({ snippets });
  }

  /**
   * Update a snippet
   */
  async updateSnippet(id, updates) {
    const snippets = (this.settings.snippets || []).map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    return this.save({ snippets });
  }

  /**
   * Delete a snippet
   */
  async deleteSnippet(id) {
    const snippets = (this.settings.snippets || []).filter(s => s.id !== id);
    return this.save({ snippets });
  }

  // ========== Default Templates ==========

  /**
   * Get default built-in templates
   */
  getDefaultTemplates() {
    return [
      {
        id: 'default_meeting_notes',
        name: 'Meeting Notes',
        category: 'business',
        content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda

1. 
2. 
3. 

## Discussion

### Topic 1



### Topic 2



## Action Items

- [ ] 
- [ ] 
- [ ] 

## Next Steps

`
      },
      {
        id: 'default_project_brief',
        name: 'Project Brief',
        category: 'business',
        content: `# Project Brief: [Project Name]

## Overview

Brief description of the project.

## Objectives

- 
- 
- 

## Scope

### In Scope

- 
- 

### Out of Scope

- 
- 

## Timeline

| Phase | Duration | Dates |
|-------|----------|-------|
| Discovery | | |
| Development | | |
| Testing | | |
| Launch | | |

## Team

| Role | Name |
|------|------|
| Project Lead | |
| Designer | |
| Developer | |

## Success Metrics

- 
- 

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| | | | |

`
      },
      {
        id: 'default_bug_report',
        name: 'Bug Report',
        category: 'technical',
        content: `# Bug Report

## Summary

Brief description of the bug.

## Environment

- **Browser:** 
- **OS:** 
- **Version:** 

## Steps to Reproduce

1. 
2. 
3. 

## Expected Behavior



## Actual Behavior



## Screenshots

[Attach screenshots if applicable]

## Additional Context

`
      },
      {
        id: 'default_blog_post',
        name: 'Blog Post',
        category: 'content',
        content: `# [Blog Post Title]

*By [Author Name] | ${new Date().toLocaleDateString()}*

## Introduction

Hook your readers with an engaging opening.

## [Main Section 1]

Your first main point.

## [Main Section 2]

Your second main point.

## [Main Section 3]

Your third main point.

## Conclusion

Wrap up and call to action.

---

*Tags: tag1, tag2, tag3*
`
      },
      {
        id: 'default_case_study',
        name: 'Case Study',
        category: 'content',
        content: `# Case Study: [Client/Project Name]

## Overview

| | |
|---|---|
| **Client** | |
| **Industry** | |
| **Timeline** | |
| **Services** | |

## Challenge

Describe the problem or challenge faced.

## Solution

Explain the approach and solution implemented.

## Results

### Key Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| | | | |
| | | | |
| | | | |

### Highlights

- 
- 
- 

## Testimonial

> "Quote from the client."
> 
> — Name, Title, Company

## Conclusion

Summary and key takeaways.
`
      }
    ];
  }

  // ========== Listeners ==========

  /**
   * Add change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  /**
   * Setup Chrome storage change listener
   */
  setupStorageListener() {
    if (this.isChromeExtension()) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          Object.keys(changes).forEach(key => {
            this.settings[key] = changes[key].newValue;
          });
          this.notifyListeners('storageChanged', changes);
        }
      });
    }
  }

  /**
   * Check if running as Chrome extension
   */
  isChromeExtension() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  }

  /**
   * Export settings for backup
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from backup
   */
  async importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      return this.save(imported);
    } catch (e) {
      return { success: false, error: 'Invalid settings format' };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
