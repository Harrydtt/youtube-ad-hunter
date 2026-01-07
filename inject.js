// inject.js - v44.3: AdBlock Bypass with Scriptlet Techniques 🎭
(function () {
    console.log('[Inject] AdBlock Bypass v44.3 Ready 🎭');

    // --- STATE ---
    let isEnabled = true;

    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_TOGGLE_JSON') isEnabled = e.data.enabled;
    });

    // --- CONFIG ---
    const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBlockingInfo'];
    const POPUP_KEYS = ['enforcementMessageViewModel', 'reloadContinuationData', 'bannerPromoRenderer',
        'mealbarPromoRenderer', 'statementBannerRenderer', 'promotedSparklesWebRenderer'];

    // ====== SCRIPTLET 1: SET-CONSTANT ======
    // Force ad properties to undefined/1
    try {
        Object.defineProperty(window, 'google_ad_status', { value: 1, writable: false, configurable: false });
    } catch (e) { }

    // ====== SCRIPTLET 2: ADJUST-SETTIMEOUT (CRITICAL!) ======
    // Speed up ad-related timeouts so they fail immediately
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
        if (isEnabled && delay >= 15000 && delay <= 20000) {
            // This is likely an ad verification timeout - make it instant
            delay = 1;
            console.log('[Inject] ⚡ Accelerated ad timeout');
        }
        return nativeSetTimeout.call(this, callback, delay, ...args);
    };

    // ====== SCRIPTLET 3: TRUSTED-REPLACE-OUTBOUND-TEXT ======
    // Replace clientScreen in JSON.stringify output
    const originalStringify = JSON.stringify;
    JSON.stringify = function (value, replacer, space) {
        let result = originalStringify.call(this, value, replacer, space);
        if (isEnabled && result) {
            // Make YouTube think we're in ad unit mode
            result = result.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            result = result.replace(
                /isWebNativeShareAvailable":true}}/g,
                'isWebNativeShareAvailable":true},"clientScreen":"ADUNIT"}'
            );
        }
        return result;
    };

    // ====== SCRIPTLET 4: JSON-PRUNE (JSON.parse hook) ======
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        let data = originalParse.call(this, text, reviver);
        if (!isEnabled) return data;

        try {
            if (data && typeof data === 'object') {
                // Prune ad keys
                AD_KEYS.forEach(key => {
                    if (data[key]) {
                        console.log(`[Inject] 🗑️ Pruned ${key}`);
                        delete data[key];
                    }
                    if (data.playerResponse?.[key]) delete data.playerResponse[key];
                });

                // Prune popup keys
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

    // ====== SCRIPTLET 5: JSON-PRUNE-FETCH-RESPONSE ======
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        let data = await originalJson.call(this);
        if (!isEnabled) return data;

        try {
            if (data && typeof data === 'object') {
                AD_KEYS.forEach(key => {
                    if (data[key]) {
                        console.log(`[Inject] 🗑️ Pruned from fetch: ${key}`);
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

    // ====== SCRIPTLET 6: SET-CONSTANT via Property Traps ======
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    let _ytInitialData = window.ytInitialData;

    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get() { return _ytInitialPlayerResponse; },
        set(value) {
            if (isEnabled && value) {
                // Force undefined for ad properties (like set-constant scriptlet)
                AD_KEYS.forEach(key => { if (value[key]) value[key] = undefined; });
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
        AD_KEYS.forEach(key => { if (_ytInitialPlayerResponse[key]) _ytInitialPlayerResponse[key] = undefined; });
        if (_ytInitialPlayerResponse.videoDetails) _ytInitialPlayerResponse.videoDetails.isMonetized = false;
    }

    // ====== SCRIPTLET 7: JSON-PRUNE-XHR-RESPONSE ======
    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;

    XHR.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XHR.send = function (body) {
        // Replace clientScreen in outgoing requests
        if (isEnabled && body && typeof body === 'string') {
            try {
                body = body.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            } catch (e) { }
        }

        // Hook response for XHR
        const self = this;
        const originalOnReady = this.onreadystatechange;
        this.onreadystatechange = function () {
            if (self.readyState === 4 && isEnabled) {
                try {
                    const url = self._url || '';
                    // Only process player/watch requests
                    if (url.includes('/player') || url.includes('watch?') || url.includes('get_watch')) {
                        const text = self.responseText;
                        if (text) {
                            let data = JSON.parse(text);
                            AD_KEYS.forEach(key => {
                                if (data[key]) delete data[key];
                                if (data.playerResponse?.[key]) delete data.playerResponse[key];
                            });
                            // Override responseText
                            Object.defineProperty(self, 'responseText', { value: JSON.stringify(data) });
                        }
                    }
                } catch (e) { }
            }
            if (originalOnReady) originalOnReady.apply(this, arguments);
        };

        return originalSend.call(this, body);
    };

    // ====== SCRIPTLET 8: Fetch Hook for outgoing requests ======
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (isEnabled && init?.body && typeof init.body === 'string') {
            try {
                init.body = init.body.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
            } catch (e) { }
        }
        return originalFetch.apply(this, arguments);
    };

    console.log('[Inject] v44.3 Active: All Scriptlets Loaded ✅');
})();