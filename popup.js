// popup.js - v45.0: Connect to sample extension's toggle system
document.addEventListener('DOMContentLoaded', () => {
    // All checkboxes with class="setting" form
    const settingsForms = document.querySelectorAll('.setting');

    settingsForms.forEach(form => {
        const input = form.querySelector('input');
        if (!input) return;

        const name = input.name;

        // Load saved state
        chrome.storage.local.get([name], (result) => {
            // Default to true (ON) if not set
            input.checked = result[name] !== false;
        });

        // Save on change
        form.addEventListener('change', () => {
            chrome.storage.local.set({ [name]: input.checked });
            console.log(`[Popup] ${name} = ${input.checked}`);
        });
    });
});