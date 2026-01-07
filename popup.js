// popup.js - v44.0
document.addEventListener('DOMContentLoaded', () => {
    const toggles = {
        hunterActive: document.getElementById('toggle-hunter'), // ID này tùy html của ông
        jsonCutEnabled: document.getElementById('toggle-jsoncut'),
        offscreenEnabled: document.getElementById('toggle-offscreen'),
        logic2Enabled: document.getElementById('toggle-logic2'), // Speed/Skip
        staticAdsEnabled: document.getElementById('toggle-static')
    };

    // Load
    chrome.storage.local.get(Object.keys(toggles), (res) => {
        for (const [key, el] of Object.entries(toggles)) {
            if (el) el.checked = res[key] !== false; // Default ON (trừ static có thể default off tùy ông)
        }
        // Fix riêng static default off nếu chưa set
        if (res.staticAdsEnabled === undefined && toggles.staticAdsEnabled) toggles.staticAdsEnabled.checked = false;
    });

    // Save Listeners
    for (const [key, el] of Object.entries(toggles)) {
        if (el) {
            el.addEventListener('change', () => {
                chrome.storage.local.set({ [key]: el.checked });
            });
        }
    }
});