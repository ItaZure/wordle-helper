// Content script for handling screen capture and area selection
// This runs in the context of web pages

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'startAreaSelection') {
    // The area selection is handled in the imageRecognition service
    // This file is kept minimal as most logic is in the service
    sendResponse({ success: true });
  }
});

export {};