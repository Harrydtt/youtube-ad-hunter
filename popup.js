// popup.js - Xử lý toggle switches
document.addEventListener('DOMContentLoaded', () => {
    const toggleJsonCut = document.getElementById('toggle-jsoncut');
    const toggleLogic2 = document.getElementById('toggle-logic2');

    // Load saved settings
    chrome.storage.local.get(['jsonCutEnabled', 'logic2Enabled'], (result) => {
        toggleJsonCut.checked = result.jsonCutEnabled !== false; // Default ON
        toggleLogic2.checked = result.logic2Enabled !== false; // Default ON
    });

    // Save on change
    toggleJsonCut.addEventListener('change', () => {
        chrome.storage.local.set({ jsonCutEnabled: toggleJsonCut.checked });
        console.log('JSON Cut:', toggleJsonCut.checked ? 'ON' : 'OFF');
    });

    toggleLogic2.addEventListener('change', () => {
        chrome.storage.local.set({ logic2Enabled: toggleLogic2.checked });
        console.log('Logic 2:', toggleLogic2.checked ? 'ON' : 'OFF');
    });
});
