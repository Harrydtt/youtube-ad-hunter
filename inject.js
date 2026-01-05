// inject.js - v25: The Nuclear Option (Clean Slate)
(function () {
    console.log('[Hunter] Stealth Engine v25: The Nuclear Option ☢️');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: ['upsellDialogRenderer', 'promoMessageRenderer', 'tvAppUpsellDialogRenderer', 'playerErrorMessageRenderer']
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
            console.log(`%c[Nuclear] ⚙️ Cut Mode: ${jsonCutEnabled}`, 'color: orange');
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

    // --- 3. CORE LOGIC: NUCLEAR WIPE ---
    // Không lọc, không tuyển chọn. Gặp là XÓA SẠCH.
    const nukeAds = (data) => {
        let adsFound = 0;

        // 1. Array-based Ads
        if (data.adPlacements) {
            if (data.adPlacements.length > 0) {
                fakeAdViewing(data.adPlacements);
                data.adPlacements = [];
                adsFound++;
            }
        }
        if (data.playerResponse?.adPlacements) {
            if (data.playerResponse.adPlacements.length > 0) {
                fakeAdViewing(data.playerResponse.adPlacements);
                data.playerResponse.adPlacements = [];
                adsFound++;
            }
        }

        // 2. Object/Other Ads
        if (data.playerAds) { fakeAdViewing(data.playerAds); data.playerAds = []; adsFound++; }
        if (data.playerResponse?.playerAds) { fakeAdViewing(data.playerResponse.playerAds); data.playerResponse.playerAds = []; adsFound++; }
        if (data.adSlots) { fakeAdViewing(data.adSlots); data.adSlots = []; adsFound++; }
        if (data.playerResponse?.adSlots) { fakeAdViewing(data.playerResponse.adSlots); data.playerResponse.adSlots = []; adsFound++; }

        if (adsFound > 0) console.log(`%c[Nuclear] ☢️ Wiped ${adsFound} ad sources`, 'color: red; font-weight: bold; font-size: 12px;');
    };

    const stripPopups = (data) => {
        if (data.auxiliaryUi?.messageRenderers) {
            for (let key of CONFIG.popup_keys) {
                if (data.auxiliaryUi.messageRenderers[key]) {
                    delete data.auxiliaryUi.messageRenderers[key];
                    console.log(`%c[Hunter] 🚫 Blocked Popup: ${key}`, 'color: red; font-weight: bold;');
                }
            }
        }
        if (data.overlay?.upsellDialogRenderer) {
            delete data.overlay.upsellDialogRenderer;
            console.log(`%c[Hunter] 🚫 Blocked Upsell Overlay`, 'color: red; font-weight: bold;');
        }
    };

    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;
        try {
            nukeAds(data);
            stripPopups(data);
            if (data.playerResponse) stripPopups(data.playerResponse);
        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 4. DATA TRAPS ---
    // Bẫy cả Playability Status để tránh bị Soft Block
    const ensurePlayability = (data) => {
        if (data.playabilityStatus) {
            if (data.playabilityStatus.status === 'LOGIN_REQUIRED') return; // Không can thiệp login
            if (data.playabilityStatus.status !== 'OK') {
                console.log(`[Hunter] 🔓 Fixed Playability: ${data.playabilityStatus.status} -> OK`);
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
            }
        }
    };

    const trapVariable = (varName) => {
        let internalValue = window[varName];
        Object.defineProperty(window, varName, {
            get: function () { return internalValue; },
            set: function (val) {
                // Pre-process before assigning
                if (val && val.playabilityStatus) ensurePlayability(val);
                internalValue = processYoutubeData(val);
            },
            configurable: true
        });
    };

    try {
        trapVariable('ytInitialPlayerResponse');
        trapVariable('ytInitialData');
    } catch (e) { }

    // --- 5. HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            if (data) {
                processYoutubeData(data);
                if (data.playabilityStatus) ensurePlayability(data); // Double check logic block
            }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data) {
                processYoutubeData(data); // Process in place
                if (data.playabilityStatus) ensurePlayability(data);
            }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    if (window.ytInitialPlayerResponse) {
        processYoutubeData(window.ytInitialPlayerResponse);
        ensurePlayability(window.ytInitialPlayerResponse);
    }
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
