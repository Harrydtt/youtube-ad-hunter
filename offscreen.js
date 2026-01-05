// offscreen.js - v31: Realistic Beacon Timing
console.log('[Offscreen] Sandbox v31 ready 👻');

// Lắng nghe messages từ background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROCESS_BEACONS') {
        processBeaconUrls(msg.urls);
    }
});

// --- URL Categorization ---
function categorizeUrl(url) {
    const lowerUrl = url.toLowerCase();

    // Complete/View events - should come LAST (end of ad)
    if (lowerUrl.includes('complete') || lowerUrl.includes('finish') || lowerUrl.includes('end')) {
        return 'complete';
    }
    // Third Quartile - 75% of ad
    if (lowerUrl.includes('thirdquartile') || lowerUrl.includes('third_quartile') || lowerUrl.includes('75')) {
        return 'thirdQuartile';
    }
    // Midpoint - 50% of ad
    if (lowerUrl.includes('midpoint') || lowerUrl.includes('mid_point') || lowerUrl.includes('50')) {
        return 'midpoint';
    }
    // First Quartile - 25% of ad
    if (lowerUrl.includes('firstquartile') || lowerUrl.includes('first_quartile') || lowerUrl.includes('25')) {
        return 'firstQuartile';
    }
    // Start/Impression - should come FIRST (beginning of ad)
    if (lowerUrl.includes('start') || lowerUrl.includes('impression') || lowerUrl.includes('view') || lowerUrl.includes('begin')) {
        return 'start';
    }
    // Default: treat as impression (send early)
    return 'start';
}

// --- Delay Calculation (Realistic Timing) ---
function getDelayForCategory(category) {
    // Base delays in milliseconds (assuming ~20-30s ad)
    const baseDelays = {
        'start': 0,              // Immediately
        'firstQuartile': 6000,   // ~6s (25% of 24s)
        'midpoint': 12000,       // ~12s (50% of 24s)
        'thirdQuartile': 18000,  // ~18s (75% of 24s)
        'complete': 24000        // ~24s (end of ad)
    };

    const base = baseDelays[category] || 0;

    // Add random jitter: ±3 seconds (to avoid pattern detection)
    const jitter = (Math.random() - 0.5) * 6000; // -3000 to +3000

    return Math.max(0, base + jitter);
}

function processBeaconUrls(urls) {
    if (!urls || !Array.isArray(urls)) return;

    const container = document.getElementById('beacon-container');

    // Cleanup nếu quá nhiều iframes (tránh memory leak)
    while (container && container.children.length > 20) {
        container.removeChild(container.firstChild);
    }

    // Danh sách blacklist - KHÔNG load video streams
    const blacklist = [
        'googlevideo.com',
        'videoplayback',
        'initplayback',
        '.mp4',
        '.webm',
        '.m3u8'
    ];

    // Categorize and schedule
    const scheduled = [];

    urls.forEach((url) => {
        // Validate
        if (!url || typeof url !== 'string') return;
        if (blacklist.some(b => url.includes(b))) {
            console.log('[Offscreen] ⏭️ Skipped video stream:', url.slice(0, 50));
            return;
        }

        const category = categorizeUrl(url);
        const delay = getDelayForCategory(category);

        scheduled.push({ url, category, delay });
    });

    // Sort by delay (ensure proper order)
    scheduled.sort((a, b) => a.delay - b.delay);

    // Execute with delays
    scheduled.forEach(({ url, category, delay }) => {
        setTimeout(() => {
            try {
                // Image beacon (lightweight)
                const img = new Image();
                img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();

                // Iframe for important events (more authentic)
                if (category === 'start' || category === 'complete') {
                    const iframe = document.createElement('iframe');
                    iframe.src = url;
                    iframe.style.cssText = 'width:1px;height:1px;opacity:0;border:none;position:absolute;';
                    iframe.referrerPolicy = 'no-referrer-when-downgrade';
                    if (container) container.appendChild(iframe);

                    // Self-destruct after 15s
                    setTimeout(() => {
                        if (iframe.parentNode) iframe.remove();
                    }, 15000);
                }

                console.log(`[Offscreen] 📡 [${category}] @ ${(delay / 1000).toFixed(1)}s: ...${url.slice(-35)}`);
            } catch (e) {
                console.warn('[Offscreen] Beacon error:', e);
            }
        }, delay);
    });

    console.log(`[Offscreen] 📊 Scheduled ${scheduled.length} beacons with realistic timing`);
}
