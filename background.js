// background.js - Service Worker for Offscreen Management
let creating = null;

// Tạo Offscreen document nếu chưa có
async function setupOffscreenDocument() {
    const path = 'offscreen.html';

    // Check xem đã có offscreen chưa
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
        return; // Đã có rồi
    }

    // Tránh race condition khi tạo nhiều lần
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'], // Lý do hợp lệ cho Chrome Web Store
            justification: 'Process external tracking pixels for analytics'
        });
        await creating;
        creating = null;
        console.log('[Background] Offscreen document created ✅');
    }
}

// Lắng nghe messages từ content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'HUNTER_BEACON_REQUEST') {
        // Check xem offscreen có được bật không
        chrome.storage.local.get(['offscreenEnabled'], async (result) => {
            const offscreenEnabled = result.offscreenEnabled !== false; // Default ON

            if (!offscreenEnabled) {
                console.log('[Background] Offscreen disabled, skipping');
                return;
            }

            try {
                await setupOffscreenDocument();

                // Gửi URLs sang offscreen để xử lý
                chrome.runtime.sendMessage({
                    type: 'PROCESS_BEACONS',
                    urls: msg.urls
                });

                console.log(`[Background] Sent ${msg.urls.length} URLs to offscreen`);
            } catch (e) {
                console.log('[Background] Offscreen error:', e);
            }
        });

        return true; // Keep channel open for async
    }
});

// Cleanup offscreen sau 5 phút idle
let cleanupTimer = null;

function scheduleCleanup() {
    if (cleanupTimer) clearTimeout(cleanupTimer);

    cleanupTimer = setTimeout(async () => {
        try {
            await chrome.offscreen.closeDocument();
            console.log('[Background] Offscreen closed (idle cleanup)');
        } catch (e) { }
    }, 5 * 60 * 1000); // 5 phút
}

console.log('[Background] Service Worker started ✅');
