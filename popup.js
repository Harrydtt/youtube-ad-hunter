// popup.js - Xử lý toggle switches
document.addEventListener('DOMContentLoaded', () => {
    const toggleDecoy = document.getElementById('toggle-decoy');
    const toggleLogic2 = document.getElementById('toggle-logic2');

    // Load saved settings
    chrome.storage.local.get(['decoyEnabled', 'logic2Enabled'], (result) => {
        toggleDecoy.checked = result.decoyEnabled !== false; // Default ON
        toggleLogic2.checked = result.logic2Enabled !== false; // Default ON
    });

    // Save on change
    toggleDecoy.addEventListener('change', () => {
        chrome.storage.local.set({ decoyEnabled: toggleDecoy.checked });
        console.log('Decoy:', toggleDecoy.checked ? 'ON' : 'OFF');
    });

    toggleLogic2.addEventListener('change', () => {
        chrome.storage.local.set({ logic2Enabled: toggleLogic2.checked });
        console.log('Logic 2:', toggleLogic2.checked ? 'ON' : 'OFF');
    });
});
