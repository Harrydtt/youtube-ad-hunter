// inject.js - v21: The Popup Killer (Anti-Popup + Data Traps)
(function () {
    console.log('[Hunter] Stealth Engine v21: The Popup Killer �️');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: ['upsellDialogRenderer', 'promoMessageRenderer', 'tvAppUpsellDialogRenderer'] // Đám Popup khó chịu
    };
    let jsonCutEnabled = true;

    // Load Config (Backup)
    try {
        const configEl = document.getElementById('hunter-config-data');
        if (configEl) {
            const dynamicConfig = JSON.parse(configEl.textContent);
            CONFIG = { ...CONFIG, ...dynamicConfig };
            configEl.remove();
        }
    } catch (e) { }

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
        }
    });

    // --- 2. BEACON SYSTEM ---
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({ type: 'HUNTER_SEND_TO_BACKGROUND', urls: urls }, '*');
    };

    const fireBeacon = (url) => {
        if (!url || !url.startsWith('http')) return;
        const img = new Image();
        img.style.display = 'none';
        img.src = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    };

    const fakeAdViewing = (adData) => {
        if (!adData) return;
        try {
            const findUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        if (CONFIG.tracking_keys.includes(key)) {
                            const val = obj[key];
                            if (Array.isArray(val)) val.forEach(v => urls.push(v.baseUrl || v));
                            else if (typeof val === 'string') urls.push(val);
                        } else {
                            urls = urls.concat(findUrls(obj[key]));
                        }
                    }
                }
                return urls;
            };

            const urls = findUrls(adData);
            if (urls.length > 0) {
                sendToOffscreen(urls);
                urls.forEach((url, i) => setTimeout(() => fireBeacon(url), i * 150));
            }
        } catch (e) { }
    };

    // --- 3. CORE LOGIC ---

    // A. Xóa Popup (Anti-Adblock Dialog)
    // Thay vì lừa Player video không kiếm tiền (bị lộ), ta tìm chính cái Popup đó và xóa nó đi.
    const stripPopups = (data) => {
        if (data.auxiliaryUi && data.auxiliaryUi.messageRenderers) {
            const renderers = data.auxiliaryUi.messageRenderers;
            for (let key of CONFIG.popup_keys) {
                if (renderers[key]) {
                    delete renderers[key];
                    console.log(`%c[Hunter] 🚫 Removed Popup: ${key}`, 'color: red; font-weight: bold;');
                }
            }
        }
        // Xóa Upsell trong overlay
        if (data.overlay && data.overlay.upsellDialogRenderer) {
            delete data.overlay.upsellDialogRenderer;
        }
    };

    // B. Xử lý Dữ liệu
    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // 1. Fake View
            const adClone = {};
            if (data.adPlacements) adClone.adPlacements = data.adPlacements;
            if (data.playerResponse?.adPlacements) adClone.nestedAds = data.playerResponse.adPlacements;
            if (data.playerAds) adClone.playerAds = data.playerAds;
            if (Object.keys(adClone).length > 0) fakeAdViewing(adClone);

            // 2. Xóa sạch Ads (Không De-Monetize nữa, chỉ xóa Ads)
            if (data.adPlacements) data.adPlacements = [];
            if (data.playerAds) data.playerAds = [];
            if (data.adSlots) data.adSlots = [];
            if (data.playerResponse) {
                if (data.playerResponse.adPlacements) data.playerResponse.adPlacements = [];
                if (data.playerResponse.playerAds) data.playerResponse.playerAds = [];
            }

            // 3. Xóa Popup thực thi
            stripPopups(data);
            if (data.playerResponse) stripPopups(data.playerResponse);

        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 4. DOUBLE TRAP (ytInitialPlayerResponse + ytInitialData) ---
    // Trap cả 2 biến global quan trọng nhất
    const trapVariable = (varName) => {
        let internalValue = window[varName];
        Object.defineProperty(window, varName, {
            get: function () { return internalValue; },
            set: function (val) {
                console.log(`[Hunter] 🪝 Trapped ${varName}`);
                internalValue = processYoutubeData(val);
            },
            configurable: true
        });
    };

    try {
        trapVariable('ytInitialPlayerResponse');
        trapVariable('ytInitialData'); // Thêm cái này để bắt Overlay Ads
    } catch (e) {
        console.log('[Hunter] Trap failed (Conflict):', e);
    }

    // --- 5. STANDARD HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    // --- 6. CLEANUP INITIAL ---
    if (window.ytInitialPlayerResponse) processYoutubeData(window.ytInitialPlayerResponse);
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    // History Patch
    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
