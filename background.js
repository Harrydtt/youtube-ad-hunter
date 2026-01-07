// background.js - v44.0
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