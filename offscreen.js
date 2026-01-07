// offscreen.js - v44.0
const refineUrl = (url) => {
    if (!url || !url.startsWith('http')) return null;
    if (url.includes('&sig=') || url.includes('&s=')) return url;

    const now = Date.now();
    return url
        .replace(/\[TIMESTAMP\]/gi, String(now))
        .replace(/%5BTIMESTAMP%5D/gi, String(now))
        .replace(/\[CLICK_MS\]/gi, String(Math.floor(Math.random() * 5000) + 1000));
};

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROCESS_BEACONS') {
        const uniqueUrls = [...new Set(msg.urls)];
        uniqueUrls.forEach((raw, i) => {
            const url = refineUrl(raw);
            if (url) {
                setTimeout(() => {
                    const img = new Image();
                    img.src = url;
                }, i * 100);
            }
        });
    }
});