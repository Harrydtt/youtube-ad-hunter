// popup.js - Handle 4 toggles
document.addEventListener('DOMContentLoaded', () => {
    const toggles = {
        jsoncut: document.getElementById('toggle-jsoncut'),
        offscreen: document.getElementById('toggle-offscreen'),
        logic2: document.getElementById('toggle-logic2'),
        static: document.getElementById('toggle-static')
    };

    // Load saved settings
    chrome.storage.local.get([
        'jsonCutEnabled',
        'offscreenEnabled',
        'logic2Enabled',
        'staticAdsEnabled'
    ], (result) => {
        toggles.jsoncut.checked = result.jsonCutEnabled !== false; // Default ON
        toggles.offscreen.checked = result.offscreenEnabled !== false; // Default ON
        toggles.logic2.checked = result.logic2Enabled !== false; // Default ON
        toggles.static.checked = result.staticAdsEnabled === true; // Default OFF
    });

    // Save on change - JSON Cut
    toggles.jsoncut.addEventListener('change', () => {
        chrome.storage.local.set({ jsonCutEnabled: toggles.jsoncut.checked });
        console.log('JSON Cut:', toggles.jsoncut.checked ? 'ON' : 'OFF');
    });

    // Save on change - Offscreen
    toggles.offscreen.addEventListener('change', () => {
        chrome.storage.local.set({ offscreenEnabled: toggles.offscreen.checked });
        console.log('Offscreen:', toggles.offscreen.checked ? 'ON' : 'OFF');
    });

    // Save on change - Logic 2
    toggles.logic2.addEventListener('change', () => {
        chrome.storage.local.set({ logic2Enabled: toggles.logic2.checked });
        console.log('Logic 2:', toggles.logic2.checked ? 'ON' : 'OFF');
    });

    // Save on change - Static Ads
    toggles.static.addEventListener('change', () => {
        chrome.storage.local.set({ staticAdsEnabled: toggles.static.checked });
        console.log('Static Ads Block:', toggles.static.checked ? 'ON' : 'OFF');
    });
});
