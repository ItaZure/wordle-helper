// Background service worker for Chrome extension
// Note: Tesseract.js cannot be used in Service Workers due to lack of Worker support
// OCR functionality has been moved to content script or simplified

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'captureScreen') {
    chrome.tabs.captureVisibleTab(
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl });
        }
      }
    );
    return true;
  }
});