// offscreen.js - v44.0: Template URL Processor with Placeholders
console.log('[Offscreen] Processor v44.0 initialized');

// Fill placeholder values in tracking URLs
const fillPlaceholders = (url) => {
    const now = Date.now();
    const viewability = 'sv%3D400%26v%3D20241201%26cb%3D1';

    return url
        // Timestamps
        .replace(/\[TIMESTAMP\]/gi, String(now))
        .replace(/%5BTIMESTAMP%5D/gi, String(now))
        // Viewability
        .replace(/\[VIEWABILITY\]/gi, viewability)
        .replace(/%5BVIEWABILITY%5D/gi, viewability)
        .replace(/\[GOOGLE_VIEWABILITY\]/gi, viewability)
        .replace(/%5BGOOGLE_VIEWABILITY%5D/gi, viewability)
        // Click timing
        .replace(/\[CLICK_MS\]/gi, String(Math.floor(Math.random() * 5000) + 1000))
        .replace(/%5BCLICK_MS%5D/gi, String(Math.floor(Math.random() * 5000) + 1000))
        // Ad params
        .replace(/\[AD_CPN\]/gi, 'hunter')
        .replace(/%5BAD_CPN%5D/gi, 'hunter')
        .replace(/\[AD_MT\]/gi, String(Math.floor(Math.random() * 30000)))
        .replace(/%5BAD_MT%5D/gi, String(Math.floor(Math.random() * 30000)))
        // User agent hints
        .replace(/\[UACH\]/gi, '')
        .replace(/%5BUACH%5D/gi, '')
        .replace(/\[UACH_M\]/gi, '')
        .replace(/%5BUACH_M%5D/gi, '')
        // Click source
        .replace(/\[CLICK_SOURCE\]/gi, '1')
        .replace(/%5BCLICK_SOURCE%5D/gi, '1')
        // Last action time
        .replace(/\[LACT\]/gi, String(now))
        .replace(/%5BLACT%5D/gi, String(now))
        // Error code
        .replace(/\[ERRORCODE\]/gi, '0')
        .replace(/%5BERRORCODE%5D/gi, '0');
};

// Categorize URL for logging
const categorizeUrl = (url) => {
    if (url.includes('start')) return 'start';
    if (url.includes('firstQuartile') || url.includes('first_quartile')) return 'firstQuartile';
    if (url.includes('midpoint')) return 'midpoint';
    if (url.includes('thirdQuartile') || url.includes('third_quartile')) return 'thirdQuartile';
    if (url.includes('complete')) return 'complete';
    if (url.includes('impression')) return 'impression';
    return 'tracking';
};

// Validate URL before processing
const isValidTrackingUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http') && !url.startsWith('//')) return false;
    return url.includes('ptracking') ||
        url.includes('/pagead/') ||
        url.includes('/api/stats/') ||
        url.includes('doubleclick.net') ||
        url.includes('googlevideo.com/ptracking');
};

// Process URLs with realistic timing
const processUrls = (urls) => {
    if (!urls || urls.length === 0) return;

    console.log(`[Offscreen] 📥 Received ${urls.length} template URLs`);

    const validUrls = urls.filter(isValidTrackingUrl);
    console.log(`[Offscreen] ✅ ${validUrls.length} valid tracking URLs`);

    if (validUrls.length === 0) return;

    validUrls.forEach((originalUrl, index) => {
        const url = fillPlaceholders(originalUrl);
        const fullUrl = url.startsWith('//') ? 'https:' + url : url;

        const category = categorizeUrl(url);
        const baseDelay = index * 200;
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;

        setTimeout(() => {
            try {
                const img = new Image();
                img.onload = () => console.log(`[Offscreen] ✅ Ping OK: ${category}`);
                img.onerror = () => console.log(`[Offscreen] 📡 Ping sent: ${category}`);
                img.src = fullUrl;
            } catch (e) {
                console.log(`[Offscreen] ❌ Error: ${e.message}`);
            }
        }, delay);
    });

    console.log(`[Offscreen] ⏳ Queued ${validUrls.length} pings`);
};

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PROCESS_BEACONS') {
        console.log('[Offscreen] 🎯 Received PROCESS_BEACONS');
        processUrls(msg.urls);
        sendResponse({ received: true, count: msg.urls?.length || 0 });
    }
    return true;
});

console.log('[Offscreen] v44.0 Ready ✅');