// background.js - v44.1: Network-Level Blocking + Offscreen
console.log('[Background] v44.1 Initializing...');

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
    { id: 10, urlFilter: '||youtube.com/api/stats/playback', action: 'block' },
];

// Setup dynamic blocking rules
async function setupBlockingRules() {
    try {
        // Get existing rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const removeRuleIds = existingRules.map(r => r.id);

        // Create new rules
        const addRules = NETWORK_RULES.map(rule => ({
            id: rule.id,
            priority: 1,
            action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
            condition: {
                urlFilter: rule.urlFilter,
                initiatorDomains: ['youtube.com', 'www.youtube.com'],
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                    chrome.declarativeNetRequest.ResourceType.SCRIPT,
                    chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                    chrome.declarativeNetRequest.ResourceType.IMAGE,
                    chrome.declarativeNetRequest.ResourceType.PING,
                ]
            }
        }));

        // Update rules
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: addRules
        });

        console.log(`[Background] ✅ Blocking ${addRules.length} ad URLs at network level`);
    } catch (e) {
        console.log('[Background] ❌ Failed to setup blocking rules:', e.message);
    }
}

// Initialize - Setup blocking rules
setupBlockingRules();

// Re-setup on install/update
chrome.runtime.onInstalled.addListener(() => {
    setupBlockingRules();
    console.log('[Background] 🔄 Rules updated after install/update');
});

// --- OFFSCREEN DOCUMENT (kept for compatibility) ---
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

console.log('[Background] v44.1 Ready ✅');