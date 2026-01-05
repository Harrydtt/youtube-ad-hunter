// popup.js - v31.2: Removed popup warning, simplified
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
        toggles.jsoncut.checked = result.jsonCutEnabled !== false;
        toggles.offscreen.checked = result.offscreenEnabled !== false;
        toggles.logic2.checked = result.logic2Enabled !== false;
        toggles.static.checked = result.staticAdsEnabled === true;
    });

    // JSON Cut - Auto-toggle Offscreen
    toggles.jsoncut.addEventListener('change', () => {
        const isOn = toggles.jsoncut.checked;
        chrome.storage.local.set({ jsonCutEnabled: isOn });
        console.log('JSON Cut:', isOn ? 'ON' : 'OFF');

        // Auto-enable Offscreen when JSON Cut is on
        if (isOn && !toggles.offscreen.checked) {
            toggles.offscreen.checked = true;
            chrome.storage.local.set({ offscreenEnabled: true });
            console.log('Offscreen auto-enabled with JSON Cut');
        }
    });

    // Offscreen - No popup, just save
    toggles.offscreen.addEventListener('change', () => {
        chrome.storage.local.set({ offscreenEnabled: toggles.offscreen.checked });
        console.log('Offscreen:', toggles.offscreen.checked ? 'ON' : 'OFF');
    });

    // Logic Speed/Skip
    toggles.logic2.addEventListener('change', () => {
        chrome.storage.local.set({ logic2Enabled: toggles.logic2.checked });
        console.log('Logic Speed/Skip:', toggles.logic2.checked ? 'ON' : 'OFF');
    });

    // Static Ads
    toggles.static.addEventListener('change', () => {
        chrome.storage.local.set({ staticAdsEnabled: toggles.static.checked });
        console.log('Static Ads Block:', toggles.static.checked ? 'ON' : 'OFF');
    });
});
