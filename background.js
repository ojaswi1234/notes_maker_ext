// Background script for handling tab capture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureTab") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (imageUrl) => {
            if (chrome.runtime.lastError) {
                console.error("Capture failed:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, imageUrl: imageUrl });
            }
        });
        return true; // Keep the message channel open for async response
    }
});
