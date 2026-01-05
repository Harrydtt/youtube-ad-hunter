// offscreen.js - Hidden Beacon Processor
console.log('[Offscreen] Sandbox ready 👻');

// Lắng nghe messages từ background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROCESS_BEACONS') {
        processBeaconUrls(msg.urls);
    }
});

function processBeaconUrls(urls) {
    if (!urls || !Array.isArray(urls)) return;

    const container = document.getElementById('beacon-container');

    // Cleanup nếu quá nhiều iframes (tránh memory leak)
    while (container.children.length > 20) {
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

    urls.forEach((url, index) => {
        // Kiểm tra blacklist
        if (!url || typeof url !== 'string') return;
        if (blacklist.some(b => url.includes(b))) {
            console.log('[Offscreen] Skipped video stream:', url.slice(0, 50));
            return;
        }

        // Delay ngẫu nhiên để tránh flood detection
        const delay = index * 200 + Math.random() * 500;

        setTimeout(() => {
            try {
                // Phương pháp 1: Image beacon (nhẹ nhất)
                const img = new Image();
                img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();

                // Phương pháp 2: Iframe (authentic nhất) - cho tracking links quan trọng
                if (url.includes('impression') || url.includes('view')) {
                    const iframe = document.createElement('iframe');
                    iframe.src = url;
                    iframe.style.cssText = 'width:1px;height:1px;opacity:0;border:none;position:absolute;';
                    iframe.referrerPolicy = 'no-referrer-when-downgrade';
                    container.appendChild(iframe);

                    // Tự hủy sau 15s
                    setTimeout(() => {
                        if (iframe.parentNode) iframe.remove();
                    }, 15000);
                }

                console.log(`[Offscreen] 📡 Beacon: ...${url.slice(-40)}`);
            } catch (e) { }
        }, delay);
    });

    console.log(`[Offscreen] Processing ${urls.length} beacons...`);
}
