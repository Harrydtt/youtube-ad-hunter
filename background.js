// background.js - v44.3: Dynamic Scriptlet Injection + Network Blocking
console.log('[Background] v44.3 Initializing...');

// --- SCRIPTLET CODE (from sample extension) ---
const SCRIPTLET_CODE = `
// ====== SCRIPTLET 1: SET-CONSTANT ======
try { Object.defineProperty(window, 'google_ad_status', { value: 1, writable: false }); } catch(e){}
try { 
    let _ytPlayer = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get() { return _ytPlayer; },
        set(v) {
            if (v) {
                if (v.adPlacements) v.adPlacements = undefined;
                if (v.adSlots) v.adSlots = undefined;
                if (v.playerAds) v.playerAds = undefined;
                if (v.videoDetails) v.videoDetails.isMonetized = false;
            }
            _ytPlayer = v;
        }
    });
} catch(e){}

// ====== SCRIPTLET 2: JSON-PRUNE ======
const AD_KEYS = ['adPlacements','adSlots','playerAds','adBreakHeartbeatParams','adBlockingInfo'];
const POPUP_KEYS = ['enforcementMessageViewModel','reloadContinuationData'];
const nativeParse = JSON.parse;
JSON.parse = function(text, reviver) {
    let data = nativeParse.call(this, text, reviver);
    try {
        if (data && typeof data === 'object') {
            AD_KEYS.forEach(k => { if(data[k]) delete data[k]; if(data.playerResponse?.[k]) delete data.playerResponse[k]; });
            POPUP_KEYS.forEach(k => { if(data[k]) delete data[k]; });
            if (data.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) delete data.auxiliaryUi;
        }
    } catch(e){}
    return data;
};

// ====== SCRIPTLET 3: JSON-PRUNE-FETCH-RESPONSE ======
const nativeJson = Response.prototype.json;
Response.prototype.json = async function() {
    let data = await nativeJson.call(this);
    try {
        if (data && typeof data === 'object') {
            AD_KEYS.forEach(k => { if(data[k]) delete data[k]; });
            POPUP_KEYS.forEach(k => { if(data[k]) delete data[k]; });
        }
    } catch(e){}
    return data;
};

// ====== SCRIPTLET 4: ADJUST-SETTIMEOUT (CRITICAL!) ======
const nativeSetTimeout = window.setTimeout;
window.setTimeout = function(cb, delay, ...args) {
    if (delay >= 15000 && delay <= 20000) delay = 1;
    return nativeSetTimeout.call(this, cb, delay, ...args);
};

// ====== SCRIPTLET 5: TRUSTED-REPLACE-OUTBOUND-TEXT ======
const nativeStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
    let result = nativeStringify.call(this, value, replacer, space);
    if (result) {
        result = result.replace(/"clientScreen":"WATCH"/g, '"clientScreen":"ADUNIT"');
    }
    return result;
};

console.log('[Inject] v44.3 Scriptlets Active ✅');
`;

// Inject scriptlets into page
async function injectScriptlets(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (code) => {
                const script = document.createElement('script');
                script.textContent = code;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
            },
            args: [SCRIPTLET_CODE],
            injectImmediately: true,
            world: 'MAIN'
        });
        console.log(`[Background] ✅ Injected scriptlets into tab ${tabId}`);
    } catch (e) {
        // Tab may not be ready or accessible
    }
}

// Listen for YouTube tab navigation
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) { // Main frame only
        injectScriptlets(details.tabId);
    }
}, { url: [{ hostContains: 'youtube.com' }] });

// Also inject when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url?.includes('youtube.com')) {
        injectScriptlets(tabId);
    }
});

// --- NETWORK BLOCKING RULES ---
const NETWORK_RULES = [
    { id: 1, urlFilter: '||youtube.com/pagead/', action: 'block' },
    { id: 2, urlFilter: '||youtube.com/youtubei/v1/player/ad_break', action: 'block' },
    { id: 3, urlFilter: '||youtube.com/get_midroll_', action: 'block' },
    { id: 4, urlFilter: '||youtube.com/api/stats/ads', action: 'block' },
    { id: 5, urlFilter: '||googlesyndication.com', action: 'block' },
    { id: 6, urlFilter: '||googleads.g.doubleclick.net', action: 'block' },
    { id: 7, urlFilter: '||doubleclick.net/pagead/', action: 'block' },
    { id: 8, urlFilter: '||youtube.com/ptracking', action: 'block' },
    { id: 9, urlFilter: '||youtube.com/pagead/interaction/', action: 'block' },
    { id: 10, urlFilter: '||static.doubleclick.net/instream/ad_status.js', action: 'block' },
];

async function setupBlockingRules() {
    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const removeRuleIds = existingRules.map(r => r.id);

        const addRules = NETWORK_RULES.map(rule => ({
            id: rule.id,
            priority: 1,
            action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
            condition: {
                urlFilter: rule.urlFilter,
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                    chrome.declarativeNetRequest.ResourceType.SCRIPT,
                    chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                    chrome.declarativeNetRequest.ResourceType.IMAGE,
                    chrome.declarativeNetRequest.ResourceType.PING,
                ]
            }
        }));

        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
        console.log(`[Background] ✅ Blocking ${addRules.length} ad URLs`);
    } catch (e) {
        console.log('[Background] ❌ Failed to setup blocking rules:', e.message);
    }
}

// Initialize
setupBlockingRules();

chrome.runtime.onInstalled.addListener(() => {
    setupBlockingRules();
    console.log('[Background] 🔄 Rules updated after install/update');
});

// --- OFFSCREEN DOCUMENT ---
let creating = null;

async function setupOffscreenDocument() {
    const path = 'offscreen.html';
    if (creating) { await creating; return; }
    try {
        const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        if (contexts.length > 0) return;

        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'],
            justification: 'Ping verification'
        });
        await creating;
        creating = null;
    } catch (e) { creating = null; }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'HUNTER_BEACON_REQUEST') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({ type: 'PROCESS_BEACONS', urls: msg.urls });
        });
    }
});

console.log('[Background] v44.3 Ready ✅');