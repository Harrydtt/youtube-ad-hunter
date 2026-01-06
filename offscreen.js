// offscreen.js - Background Beacon Processor v33.5
console.log('[Offscreen] Processor initialized v33.5');

// Fill in placeholder values in tracking URLs
const fillPlaceholders = (url) => {
    const now = Date.now();
    const viewability = 'sv%3D400%26v%3D20241201%26cb%3D1';

    return url
        // Viewability
        .replace(/\[VIEWABILITY\]/gi, viewability)
        .replace(/%5BVIEWABILITY%5D/gi, viewability)
        .replace(/\[GOOGLE_VIEWABILITY\]/gi, viewability)
        .replace(/%5BGOOGLE_VIEWABILITY%5D/gi, viewability)
        // Click timing
        .replace(/\[CLICK_MS\]/gi, String(Math.floor(Math.random() * 5000) + 1000))
        .replace(/%5BCLICK_MS%5D/gi, String(Math.floor(Math.random() * 5000) + 1000))
        // Campaign/ad params
        .replace(/\[AD_CPN\]/gi, 'focus')
        .replace(/%5BAD_CPN%5D/gi, 'focus')
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
        // Last click time
        .replace(/\[LACT\]/gi, String(now))
        .replace(/%5BLACT%5D/gi, String(now))
        // Error code (use 0 for no error)
        .replace(/\[ERRORCODE\]/gi, '0')
        .replace(/%5BERRORCODE%5D/gi, '0')
        // Timestamps
        .replace(/\[TIMESTAMP\]/gi, String(now))
        .replace(/%5BTIMESTAMP%5D/gi, String(now));
};

// All pagead/tracking URLs are valid - don't filter too strictly
const isTrackingUrl = (url) => {
    return url.includes('pagead') ||
        url.includes('ptracking') ||
        url.includes('doubleclick') ||
        url.includes('googleads') ||
        url.includes('googlevideo') ||
        url.includes('api/stats');
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

        // Skip non-tracking URLs
        if (!isTrackingUrl(url)) {
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
