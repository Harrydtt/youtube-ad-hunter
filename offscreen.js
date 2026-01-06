// offscreen.js - Background Metadata Processor
console.log('[Offscreen] Processor initialized');

// Categorize URL by type for realistic timing
const categorizeUrl = (url) => {
    if (url.includes('start')) return 'start';
    if (url.includes('firstQuartile')) return 'firstQuartile';
    if (url.includes('midpoint')) return 'midpoint';
    if (url.includes('thirdQuartile')) return 'thirdQuartile';
    if (url.includes('complete')) return 'complete';
    return 'unknown';
};

// Get realistic delay based on category
const getDelayForCategory = (category) => {
    const jitter = Math.random() * 6000 - 3000; // ±3s jitter
    const delays = {
        'start': 0,
        'firstQuartile': 8000,
        'midpoint': 16000,
        'thirdQuartile': 24000,
        'complete': 30000,
        'unknown': Math.random() * 5000
    };
    return Math.max(0, (delays[category] || 0) + jitter);
};

// Process URLs with realistic timing
const processUrls = (urls) => {
    if (!urls || urls.length === 0) return;

    console.log(`[Offscreen] Processing ${urls.length} metadata URLs`);

    urls.forEach((url) => {
        const category = categorizeUrl(url);
        const delay = getDelayForCategory(category);

        setTimeout(() => {
            try {
                // Send beacon using Image (most reliable)
                const img = new Image();
                img.src = url;
                console.log(`[Offscreen] Processed: ${category}`);
            } catch (e) {
                // Fallback: use fetch
                fetch(url, { mode: 'no-cors', credentials: 'include' }).catch(() => { });
            }
        }, delay);
    });
};

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROCESS_BEACONS') {
        processUrls(msg.urls);
    }
});
