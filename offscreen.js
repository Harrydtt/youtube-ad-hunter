// offscreen.js - Background Beacon Processor v33.4
console.log('[Offscreen] Processor initialized v33.4');

// Fill in placeholder values in tracking URLs
const fillPlaceholders = (url) => {
    const now = Date.now();
    const viewability = 'sv%3D400%26v%3D20241201%26cb%3D1'; // Viewability params

    return url
        .replace(/\[VIEWABILITY\]/gi, viewability)
        .replace(/%5BVIEWABILITY%5D/gi, viewability)
        .replace(/\[GOOGLE_VIEWABILITY\]/gi, viewability)
        .replace(/%5BGOOGLE_VIEWABILITY%5D/gi, viewability)
        .replace(/\[CLICK_MS\]/gi, String(Math.floor(Math.random() * 5000) + 1000))
        .replace(/%5BCLICK_MS%5D/gi, String(Math.floor(Math.random() * 5000) + 1000))
        .replace(/\[AD_CPN\]/gi, 'focusMode')
        .replace(/%5BAD_CPN%5D/gi, 'focusMode')
        .replace(/\[AD_MT\]/gi, String(Math.floor(Math.random() * 30000)))
        .replace(/%5BAD_MT%5D/gi, String(Math.floor(Math.random() * 30000)))
        .replace(/\[UACH\]/gi, '')
        .replace(/%5BUACH%5D/gi, '')
        .replace(/\[CLICK_SOURCE\]/gi, '1')
        .replace(/%5BCLICK_SOURCE%5D/gi, '1');
};

// Filter URLs that are valid for tracking
const isValidTrackingUrl = (url) => {
    // Skip URLs that still have unfillable placeholders
    if (url.includes('[') && url.includes(']')) return false;
    if (url.includes('%5B') && url.includes('%5D')) return false;

    // Must be a tracking URL
    return url.includes('pagead') ||
        url.includes('ptracking') ||
        url.includes('doubleclick') ||
        url.includes('googleads') ||
        url.includes('googlevideo');
};

// Categorize URL for timing
const categorizeUrl = (url) => {
    if (url.includes('start')) return 'start';
    if (url.includes('firstQuartile')) return 'firstQuartile';
    if (url.includes('midpoint')) return 'midpoint';
    if (url.includes('thirdQuartile')) return 'thirdQuartile';
    if (url.includes('complete')) return 'complete';
    if (url.includes('impression')) return 'impression';
    if (url.includes('view')) return 'view';
    return 'unknown';
};

// Get delay based on category
const getDelayForCategory = (category, index) => {
    const jitter = Math.random() * 2000;
    const baseDelay = index * 100; // Stagger URLs
    const categoryDelay = {
        'start': 0,
        'impression': 500,
        'view': 1000,
        'firstQuartile': 8000,
        'midpoint': 16000,
        'thirdQuartile': 24000,
        'complete': 30000,
        'unknown': Math.random() * 3000
    };
    return baseDelay + (categoryDelay[category] || 0) + jitter;
};

// Process URLs
const processUrls = (urls) => {
    if (!urls || urls.length === 0) return;

    console.log(`[Offscreen] Received ${urls.length} URLs to process`);

    let processedCount = 0;
    let skippedCount = 0;

    urls.forEach((originalUrl, index) => {
        // Fill in placeholders
        const url = fillPlaceholders(originalUrl);

        // Skip invalid URLs
        if (!isValidTrackingUrl(url)) {
            skippedCount++;
            return;
        }

        const category = categorizeUrl(url);
        const delay = getDelayForCategory(category, index);

        processedCount++;

        setTimeout(() => {
            try {
                // Send using Image (most reliable for tracking pixels)
                const img = new Image();
                img.onload = () => console.log(`[Offscreen] ✅ Sent: ${category}`);
                img.onerror = () => {
                    // Try fetch as fallback
                    fetch(url, { mode: 'no-cors', credentials: 'include' })
                        .then(() => console.log(`[Offscreen] ✅ Sent (fetch): ${category}`))
                        .catch(() => console.log(`[Offscreen] ❌ Failed: ${category}`));
                };
                img.src = url;
            } catch (e) {
                console.log(`[Offscreen] ❌ Error: ${e.message}`);
            }
        }, delay);
    });

    console.log(`[Offscreen] Queued ${processedCount} URLs, skipped ${skippedCount}`);
};

// Listen for messages
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROCESS_BEACONS') {
        processUrls(msg.urls);
    }
});
