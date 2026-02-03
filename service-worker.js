/**
 * Service Worker - Handles context menus, keyboard shortcuts, and background tasks
 * Chrome Extension Manifest V3 compatible
 */

// Context menu IDs
const MENU_CONVERT_SELECTION = 'convert-selection';
const MENU_CONVERT_PAGE = 'convert-page-markdown';

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Markdown Formatter installed/updated:', details.reason);
  
  // Create context menus
  createContextMenus();
  
  // Set default settings if first install
  if (details.reason === 'install') {
    initializeDefaultSettings();
  }
});

/**
 * Create context menu items
 */
function createContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Convert selected text
    chrome.contextMenus.create({
      id: MENU_CONVERT_SELECTION,
      title: 'Convert Markdown to Formatted Text',
      contexts: ['selection']
    });

    // Paste & Convert (available on editable fields)
    chrome.contextMenus.create({
      id: 'paste-convert',
      title: 'Paste & Convert Markdown',
      contexts: ['editable']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'separator-1',
      type: 'separator',
      contexts: ['selection']
    });

    // Copy as plain text
    chrome.contextMenus.create({
      id: 'copy-plain',
      title: 'Copy as Plain Text',
      contexts: ['selection']
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_CONVERT_SELECTION) {
    handleConvertSelection(info.selectionText, tab);
  } else if (info.menuItemId === 'copy-plain') {
    handleCopyPlain(info.selectionText, tab);
  } else if (info.menuItemId === 'paste-convert') {
    handlePasteAndConvert(tab);
  }
});

/**
 * Handle Paste & Convert action
 */
async function handlePasteAndConvert(tab) {
  try {
    // Read from clipboard and convert
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const text = await navigator.clipboard.readText();
          return { success: true, text };
        } catch (err) {
          return { success: false, error: err.message };
        }
      }
    });

    if (result?.result?.success && result.result.text) {
      const markdown = result.result.text;
      const html = parseMarkdown(markdown);
      
      // Paste the converted HTML into the active element
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (html) => {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.isContentEditable || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
            // For contenteditable, insert HTML
            if (activeEl.isContentEditable) {
              document.execCommand('insertHTML', false, html);
            } else {
              // For inputs/textareas, strip HTML and insert text
              const temp = document.createElement('div');
              temp.innerHTML = html;
              const plainText = temp.textContent || temp.innerText;
              const start = activeEl.selectionStart;
              const end = activeEl.selectionEnd;
              activeEl.value = activeEl.value.substring(0, start) + plainText + activeEl.value.substring(end);
              activeEl.selectionStart = activeEl.selectionEnd = start + plainText.length;
            }
          }
        },
        args: [html]
      });

      showNotification('Pasted!', 'Markdown converted and pasted.');
    } else {
      showNotification('Error', 'Could not read clipboard. Make sure you have text copied.');
    }
  } catch (error) {
    console.error('Paste & Convert failed:', error);
    showNotification('Error', 'Failed to paste and convert.');
  }
}

/**
 * Handle convert selection action
 */
async function handleConvertSelection(text, tab) {
  if (!text) {
    showNotification('No text selected', 'Please select some markdown text first.');
    return;
  }

  try {
    // Parse markdown
    const html = parseMarkdown(text);
    
    // Copy to clipboard using offscreen document (MV3 requirement)
    await copyToClipboard(html, text);
    
    // Show success notification
    showNotification('Copied!', 'Formatted text copied to clipboard.');
    
  } catch (error) {
    console.error('Convert selection failed:', error);
    showNotification('Error', 'Failed to convert selection.');
  }
}

/**
 * Handle copy plain text
 */
async function handleCopyPlain(text, tab) {
  if (!text) return;
  
  try {
    await copyPlainText(text);
    showNotification('Copied!', 'Plain text copied to clipboard.');
  } catch (error) {
    console.error('Copy plain failed:', error);
  }
}

/**
 * Simple markdown parser for service worker context
 * (Lightweight version for quick conversions)
 */
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^###### (.+)$/gm, '<h6 style="font-size:11px;font-weight:bold;margin:10px 0 5px 0;">$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5 style="font-size:12px;font-weight:bold;margin:12px 0 6px 0;">$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:14px;font-weight:bold;margin:14px 0 7px 0;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:bold;margin:16px 0 8px 0;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:20px;font-weight:bold;margin:18px 0 9px 0;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:24px;font-weight:bold;margin:20px 0 10px 0;">$1</h1>');
  
  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="font-family:monospace;background:#f4f4f4;padding:2px 6px;border-radius:3px;">$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#1a73e8;text-decoration:underline;">$1</a>');
  
  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr style="border:none;border-top:2px solid #e0e0e0;margin:24px 0;">');
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote style="margin:0 0 12px 0;padding:10px 20px;border-left:4px solid #e0e0e0;background:#f9f9f9;">$1</blockquote>');
  
  // Unordered lists (basic)
  html = html.replace(/^[-*+] (.+)$/gm, '<li style="margin:0 0 4px 0;">$1</li>');
  
  // Ordered lists (basic)
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:0 0 4px 0;">$1</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:0 0 12px 0;padding-left:24px;">$&</ul>');
  
  // Paragraphs (lines that aren't already tagged)
  html = html.split('\n').map(line => {
    if (line.trim() === '') return '';
    if (line.match(/^<[a-z]/i)) return line;
    return `<p style="margin:0 0 12px 0;line-height:1.6;">${line}</p>`;
  }).join('\n');
  
  // Clean up double-wrapped paragraphs
  html = html.replace(/<p[^>]*>(<[hpuolbq])/gi, '$1');
  html = html.replace(/(<\/[hpuolbq][^>]*>)<\/p>/gi, '$1');
  
  return html;
}

/**
 * Copy to clipboard using offscreen document (MV3 approach)
 */
async function copyToClipboard(html, plainText) {
  // For MV3, we need to use an offscreen document or inject a content script
  // Here we'll use a simpler approach via content script injection
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    throw new Error('No active tab');
  }

  // Inject and execute copy script
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: performClipboardCopy,
    args: [html, plainText]
  });
}

/**
 * Function to be injected for clipboard copy
 */
function performClipboardCopy(html, plainText) {
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([plainText], { type: 'text/plain' });

  navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob
    })
  ]).catch(err => {
    // Fallback
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(container);
    
    const range = document.createRange();
    range.selectNodeContents(container);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    document.body.removeChild(container);
  });
}

/**
 * Copy plain text to clipboard
 */
async function copyPlainText(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    throw new Error('No active tab');
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (text) => navigator.clipboard.writeText(text),
    args: [text]
  });
}

/**
 * Show notification
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: title,
    message: message
  });
}

/**
 * Initialize default settings
 */
async function initializeDefaultSettings() {
  const defaults = {
    theme: 'system',
    autoClear: false,
    showPreview: true,
    livePreview: true,
    includeStyles: true,
    convertLineBreaks: false,
    linkify: true,
    typographer: true,
    highlightCode: true,
    defaultFormat: 'google-docs',
    showWordCount: true,
    keyboardShortcutsEnabled: true
  };

  await chrome.storage.sync.set(defaults);
  console.log('Default settings initialized');
}

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  if (command === 'quick-copy') {
    handleQuickCopy();
  }
});

/**
 * Handle quick copy command
 */
async function handleQuickCopy() {
  try {
    // Get last conversion from storage
    const result = await chrome.storage.local.get(['copyHistory']);
    const history = result.copyHistory || [];
    
    if (history.length > 0) {
      const lastItem = history[0];
      if (lastItem.html && lastItem.text) {
        await copyToClipboard(lastItem.html, lastItem.text);
        showNotification('Copied!', 'Last conversion copied to clipboard.');
      }
    } else {
      showNotification('Nothing to copy', 'No previous conversions found.');
    }
  } catch (error) {
    console.error('Quick copy failed:', error);
  }
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    // Get selected text from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => window.getSelection().toString()
        }).then(results => {
          sendResponse({ selection: results[0]?.result || '' });
        }).catch(err => {
          sendResponse({ selection: '', error: err.message });
        });
      } else {
        sendResponse({ selection: '' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'copyFormatted') {
    copyToClipboard(request.html, request.text)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Log service worker activation
console.log('Markdown Formatter service worker activated');
