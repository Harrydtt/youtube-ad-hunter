// inject.js - v44.1: AdBlock Bypass - clientScreen Fake Technique 🎭
(function () {
    console.log('[Inject] AdBlock Bypass v44.1 Ready 🎭');

    // --- STATE ---
    let isEnabled = true;

    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_TOGGLE_JSON') isEnabled = e.data.enabled;
    });

    // --- CONFIG ---
    const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBlockingInfo'];
    const POPUP_KEYS = ['enforcementMessageViewModel', 'reloadContinuationData', 'bannerPromoRenderer',
        'mealbarPromoRenderer', 'statementBannerRenderer', 'promotedSparklesWebRenderer'];

    // --- TECHNIQUE 1: SET CONSTANT (Make ad properties undefined) ---
    const setUndefined = (obj, path) => {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) return;
            current = current[parts[i]];
        }
        if (current[parts[parts.length - 1]] !== undefined) {
            current[parts[parts.length - 1]] = undefined;
        }
    };

    // --- TECHNIQUE 2: JSON PRUNE (Remove ad data from JSON) ---
    const pruneJSON = (data) => {
        if (!data || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(pruneJSON).filter(Boolean);

        const result = {};
        for (const key in data) {
            if (AD_KEYS.includes(key) || POPUP_KEYS.includes(key)) {
                continue; // Skip ad/popup keys
            }
            result[key] = pruneJSON(data[key]);
        }
        return result;
    };

    // --- TECHNIQUE 3: FORCE google_ad_status = 1 ---
    try {
        Object.defineProperty(window, 'google_ad_status', {
            value: 1,
            writable: false,
            configurable: false
        });
    } catch (e) { }

    // --- TECHNIQUE 4: FAKE clientScreen (THE KEY TO BYPASS POPUP!) ---
    const originalStringify = JSON.stringify;
    JSON.stringify = function (value, replacer, space) {
        let result = originalStringify.call(this, value, replacer, space);
        if (isEnabled && result) {
            // Replace clientScreen: WATCH → ADUNIT (YouTube thinks we're in ad unit)
            result = result.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            // Also handle isWebNativeShareAvailable injection
            result = result.replace(
                /isWebNativeShareAvailable":true}}/g,
                'isWebNativeShareAvailable":true},"clientScreen":"ADUNIT"}'
            );
        }
        return result;
    };

    // --- TECHNIQUE 5: JSON.parse HOOK (Prune incoming data) ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        let data = originalParse.call(this, text, reviver);
        if (!isEnabled) return data;

        try {
            // Prune ad data
            if (data && typeof data === 'object') {
                AD_KEYS.forEach(key => {
                    if (data[key]) {
                        console.log(`[Inject] �️ Pruned ${key}`);
                        delete data[key];
                    }
                    if (data.playerResponse?.[key]) {
                        delete data.playerResponse[key];
                    }
                });

                POPUP_KEYS.forEach(key => {
                    if (data[key]) delete data[key];
                    if (data.playerResponse?.[key]) delete data.playerResponse[key];
                });

                // Force isMonetized = false
                if (data.videoDetails) data.videoDetails.isMonetized = false;
                if (data.playerResponse?.videoDetails) data.playerResponse.videoDetails.isMonetized = false;

                // Nuke auxiliaryUi popup
                if (data.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
                    delete data.auxiliaryUi;
                }
                if (data.playerResponse?.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
                    delete data.playerResponse.auxiliaryUi;
                }

                // Force playabilityStatus OK
                if (data.playabilityStatus?.status &&
                    data.playabilityStatus.status !== 'OK' &&
                    data.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                    data.playabilityStatus.status = 'OK';
                    if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
                }
            }
        } catch (e) { }

        return data;
    };

    // --- TECHNIQUE 6: Response.json HOOK ---
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        let data = await originalJson.call(this);
        if (!isEnabled) return data;

        try {
            if (data && typeof data === 'object') {
                AD_KEYS.forEach(key => {
                    if (data[key]) {
                        console.log(`[Inject] �️ Pruned from fetch: ${key}`);
                        delete data[key];
                    }
                });
                POPUP_KEYS.forEach(key => {
                    if (data[key]) delete data[key];
                });
            }
        } catch (e) { }

        return data;
    };

    // --- TECHNIQUE 7: PROPERTY TRAPS ---
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    let _ytInitialData = window.ytInitialData;

    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get() { return _ytInitialPlayerResponse; },
        set(value) {
            if (isEnabled && value) {
                AD_KEYS.forEach(key => { if (value[key]) delete value[key]; });
                if (value.videoDetails) value.videoDetails.isMonetized = false;
                if (value.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
                    delete value.auxiliaryUi;
                }
                console.log('[Inject] 🪤 Trapped ytInitialPlayerResponse');
            }
            _ytInitialPlayerResponse = value;
        }
    });

    Object.defineProperty(window, 'ytInitialData', {
        configurable: true,
        get() { return _ytInitialData; },
        set(value) {
            if (isEnabled && value) {
                POPUP_KEYS.forEach(key => { if (value[key]) delete value[key]; });
            }
            _ytInitialData = value;
        }
    });

    // Process existing data
    if (_ytInitialPlayerResponse) {
        AD_KEYS.forEach(key => { if (_ytInitialPlayerResponse[key]) delete _ytInitialPlayerResponse[key]; });
        if (_ytInitialPlayerResponse.videoDetails) _ytInitialPlayerResponse.videoDetails.isMonetized = false;
    }

    // --- TECHNIQUE 8: XHR HOOK (For older API calls) ---
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (isEnabled && body && typeof body === 'string') {
            try {
                // Replace clientScreen in outgoing XHR requests
                body = body.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            } catch (e) { }
        }
        return originalXHRSend.call(this, body);
    };

    // --- TECHNIQUE 9: Fetch HOOK (Modify outgoing requests) ---
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (isEnabled && init?.body && typeof init.body === 'string') {
            try {
                init.body = init.body.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            } catch (e) { }
        }
        return originalFetch.apply(this, arguments);
    };

    console.log('[Inject] v44.1 Active: clientScreen Bypass ✅');
})();