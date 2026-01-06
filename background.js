// background.js - Service Worker for Background Processing
let creating = null;

// Create offscreen document if needed
async function setupOffscreenDocument() {
    const path = 'offscreen.html';

    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
        return;
    }

    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'],
            justification: 'Process video metadata for enhanced playback experience'
        });
        await creating;
        creating = null;
        console.log('[Background] Offscreen document created ✅');
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'HUNTER_BEACON_REQUEST') {
        chrome.storage.local.get(['offscreenEnabled'], async (result) => {
            const offscreenEnabled = result.offscreenEnabled !== false;

            if (!offscreenEnabled) {
                console.log('[Background] Background processing disabled');
                return;
            }

            try {
                await setupOffscreenDocument();

                console.log('[Background] Offscreen document ready, sending message...');

                chrome.runtime.sendMessage({
                    type: 'PROCESS_BEACONS',
                    urls: msg.urls
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('[Background] ❌ Message error:', chrome.runtime.lastError.message);
                    } else {
                        console.log('[Background] ✅ Message delivered, response:', response);
                    }
                });

                console.log(`[Background] Sent ${msg.urls.length} URLs for processing`);
            } catch (e) {
                console.log('[Background] Processing error:', e);
            }
        });

        return true;
    }
});

// Cleanup idle offscreen document
let cleanupTimer = null;

function scheduleCleanup() {
    if (cleanupTimer) clearTimeout(cleanupTimer);

    cleanupTimer = setTimeout(async () => {
        try {
            await chrome.offscreen.closeDocument();
            console.log('[Background] Offscreen closed (idle cleanup)');
        } catch (e) { }
    }, 5 * 60 * 1000);
}

console.log('[Background] Service Worker started ✅');
