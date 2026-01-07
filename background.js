// background.js - v44.5: Network Blocking Only (inject.js handles scriptlets)
console.log('[Background] v44.5 Initializing...');

// --- NETWORK BLOCKING RULES ---
const NETWORK_RULES = [
    { id: 1, urlFilter: '||youtube.com/pagead/' },
    { id: 2, urlFilter: '||youtube.com/youtubei/v1/player/ad_break' },
    { id: 3, urlFilter: '||youtube.com/get_midroll_' },
    { id: 4, urlFilter: '||youtube.com/api/stats/ads' },
    { id: 5, urlFilter: '||googlesyndication.com' },
    { id: 6, urlFilter: '||googleads.g.doubleclick.net' },
    { id: 7, urlFilter: '||doubleclick.net/pagead/' },
    { id: 8, urlFilter: '||youtube.com/ptracking' },
    { id: 9, urlFilter: '||youtube.com/pagead/interaction/' },
    { id: 10, urlFilter: '||static.doubleclick.net/instream/ad_status.js' },
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

console.log('[Background] v44.5 Ready ✅');