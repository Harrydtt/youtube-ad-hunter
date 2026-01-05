// popup.js - v31.1: Auto-toggle + Warning
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

    // JSON Cut - Auto-toggle Offscreen
    toggles.jsoncut.addEventListener('change', () => {
        const isOn = toggles.jsoncut.checked;
        chrome.storage.local.set({ jsonCutEnabled: isOn });
        console.log('JSON Cut:', isOn ? 'ON' : 'OFF');

        // Auto-toggle Offscreen to match
        if (isOn && !toggles.offscreen.checked) {
            toggles.offscreen.checked = true;
            chrome.storage.local.set({ offscreenEnabled: true });
            console.log('Offscreen auto-enabled with JSON Cut');
        }
    });

    // Offscreen - Warning if manually disabled
    toggles.offscreen.addEventListener('change', () => {
        const isOn = toggles.offscreen.checked;

        if (!isOn) {
            // Show warning
            const confirmed = confirm(
                '⚠️ CẢNH BÁO!\n\n' +
                'Tắt Offscreen Beacon sẽ KHÔNG gửi fake view ads.\n' +
                'Điều này có thể khiến YouTube phát hiện bạn đang dùng adblocker!\n\n' +
                'Bạn có chắc chắn muốn tắt?'
            );

            if (!confirmed) {
                // User cancelled, revert toggle
                toggles.offscreen.checked = true;
                return;
            }
        }

        chrome.storage.local.set({ offscreenEnabled: isOn });
        console.log('Offscreen:', isOn ? 'ON' : 'OFF');
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
