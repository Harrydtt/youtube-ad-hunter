// background.js - Service Worker for Background Processing
let creating = null;

// Create offscreen document if needed
async function setupOffscreenDocument() {
    const path = 'offscreen.html';

    // Check if already exists
    try {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });

        if (existingContexts.length > 0) {
            return; // Already exists
        }
    } catch (e) {
        // getContexts might fail, continue anyway
    }

    // Wait for any pending creation
    if (creating) {
        await creating;
        return; // After waiting, document should exist
    }

    // Create new document
    try {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'],
            justification: 'Process video metadata for enhanced playback experience'
        });
        await creating;
        console.log('[Background] Offscreen document created ✅');
    } catch (e) {
        // Ignore "already exists" error
        if (!e.message.includes('single offscreen')) {
            console.log('[Background] Offscreen create error:', e.message);
        }
    } finally {
        creating = null;
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Handle template URLs from JSON extraction
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

    // Handle REAL URLs captured from outgoing requests - replay immediately!
    if (msg.type === 'REPLAY_REAL_URL') {
        console.log(`[Background] 🎯 REAL URL received via ${msg.method}:`, msg.url.substring(0, 100) + '...');

        chrome.storage.local.get(['offscreenEnabled'], async (result) => {
            const offscreenEnabled = result.offscreenEnabled !== false;
            if (!offscreenEnabled) return;

            try {
                await setupOffscreenDocument();

                chrome.runtime.sendMessage({
                    type: 'REPLAY_SINGLE_URL',
                    method: msg.method,
                    url: msg.url
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('[Background] ❌ Replay error:', chrome.runtime.lastError.message);
                    } else {
                        console.log('[Background] ✅ URL replayed:', response);
                    }
                });
            } catch (e) {
                console.log('[Background] Replay error:', e);
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
