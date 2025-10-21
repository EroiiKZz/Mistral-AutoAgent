
// ==UserScript==
// @name         Mistral AI - AutoAgent
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically selects the desired Mistral AI agent
// @author       EroiiKZz
// @match        https://chat.mistral.ai/chat
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      chat.mistral.ai
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js
// @downloadURL  https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Default settings
    const defaultSettings = {
        agentName: 'Mistral',
        maxAttempts: 3,
        attemptDelay: 500,
        initialDelay: 500,
        menuCheckInterval: 150,
        menuCheckMaxTries: 5,
        menuOpenDelay: 400,
        preSelectionDelay: 200,
    };

    // Load settings
    let settings = {};
    Object.keys(defaultSettings).forEach(key => {
        settings[key] = GM_getValue(key, defaultSettings[key]);
    });

    let selectionDone = false;
    let selectionInProgress = false;

    // Apply styling using Mistral's CSS variables
    GM_addStyle(`
        /* Banner styling */
        #mistralAgentBanner {
            position: fixed;
            top: 1rem;
            left: 10rem;
            right: 10rem;
            background: var(--brand-500);
            color: var(--zinc-00);
            text-align: center;
            padding: 0.75rem;
            z-index: 999999;
            font-family: var(--font-sans);
            box-shadow: var(--drop-shadow-md);
            border-radius: var(--radius-md);
            font-weight: var(--font-weight-semibold);
            transition: opacity 0.3s ease;
        }
        #mistralAgentBanner.error {
            background: var(--red-500) !important;
        }
        #mistralAgentBanner.waiting {
            background: var(--blue-500) !important;
        }

        /* Popup styling */
        #mistralSettingsPopup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-color-card);
            border-radius: var(--radius-card-md);
            padding: 1.5rem;
            z-index: 9999999;
            box-shadow: var(--drop-shadow-xl);
            width: 600px; /* Larger width for 2 columns */
            max-width: 95%;
            font-family: var(--font-sans);
            border: 1px solid var(--border-color-default);
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -40%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        #mistralSettingsPopup .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
            border-bottom: 1px solid var(--border-color-default);
            padding-bottom: 0.75rem;
        }
        #mistralSettingsPopup .popup-header h2 {
            margin: 0;
            color: var(--text-color-default);
            font-size: var(--text-lg);
            font-weight: var(--font-weight-semibold);
        }
        #mistralSettingsPopup .close-btn {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            color: var(--text-color-muted);
            transition: color 0.2s;
        }
        #mistralSettingsPopup .close-btn:hover {
            color: var(--text-color-default);
        }
        #mistralSettingsPopup .popup-body {
            display: grid;
            grid-template-columns: 1fr 1fr; /* 2 columns */
            gap: 1.5rem; /* Larger gap between columns */
        }
        #mistralSettingsPopup .popup-column {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        #mistralSettingsPopup label {
            display: block;
            color: var(--text-color-default);
            font-weight: var(--font-weight-medium);
            font-size: var(--text-sm);
            margin-bottom: 0.375rem;
        }
        #mistralSettingsPopup input {
            width: 100%;
            padding: 0.625rem 0.75rem;
            background: var(--background-color-input);
            border: 1px solid var(--border-color-default);
            border-radius: var(--radius-sm);
            font-size: var(--text-sm);
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            color: var(--text-color-default);
        }
        #mistralSettingsPopup input:focus {
            outline: none;
            border-color: var(--brand-500);
            box-shadow: 0 0 0 3px var(--transparent-brand-20);
        }
        #mistralSettingsPopup .popup-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.625rem;
            margin-top: 1.25rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color-default);
            grid-column: 1 / -1; /* Span both columns */
        }
        #mistralSettingsPopup button {
            padding: 0.625rem 1rem;
            border-radius: var(--radius-sm);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all 0.2s;
            font-size: var(--text-sm);
        }
        #mistralSettingsPopup .save-btn {
            background: var(--brand-500);
            color: var(--zinc-00);
            border: none;
        }
        #mistralSettingsPopup .save-btn:hover {
            background: var(--brand-600);
        }
        #mistralSettingsPopup .cancel-btn {
            background: var(--background-color-input);
            color: var(--text-color-default);
            border: 1px solid var(--border-color-default);
        }
        #mistralSettingsPopup .cancel-btn:hover {
            background: var(--background-color-input-soft);
        }
        .popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--transparent-dark-30);
            z-index: 9999998;
            backdrop-filter: blur(4px);
            animation: fadeInOverlay 0.2s ease-out;
        }
        @keyframes fadeInOverlay {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `);

    function showBanner(message, type = 'success') {
        const existing = document.getElementById('mistralAgentBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'mistralAgentBanner';
        banner.textContent = message;

        if (type === 'error') banner.classList.add('error');
        else if (type === 'waiting') banner.classList.add('waiting');

        document.body.prepend(banner);

        if (type !== 'waiting') {
            setTimeout(() => {
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }, 3000);
        }
    }

    function saveSettings(newSettings) {
        Object.keys(newSettings).forEach(key => {
            GM_setValue(key, newSettings[key]);
        });
        // Reload settings to ensure consistency
        Object.keys(newSettings).forEach(key => {
            settings[key] = newSettings[key];
        });
        showBanner('Settings saved! Reload the page to apply changes.');
    }

    function closePopup() {
        const popup = document.getElementById('mistralSettingsPopup');
        const overlay = document.querySelector('.popup-overlay');
        if (popup) popup.remove();
        if (overlay) overlay.remove();
    }

    function openSettingsPopup() {
        // Remove existing popup if any
        const existingPopup = document.getElementById('mistralSettingsPopup');
        if (existingPopup) existingPopup.remove();
        const existingOverlay = document.querySelector('.popup-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.onclick = closePopup;
        document.body.appendChild(overlay);

        // Create popup
        const popup = document.createElement('div');
        popup.id = 'mistralSettingsPopup';

        popup.innerHTML = `
            <div class="popup-header">
                <h2>Mistral AI Agent Settings</h2>
            </div>
            <div class="popup-body">
                <div class="popup-column">
                    <div>
                        <label for="agentName">Agent Name</label>
                        <input type="text" id="agentName" value="${settings.agentName}" placeholder="e.g. Nexus">
                    </div>
                    <div>
                        <label for="maxAttempts">Max Attempts</label>
                        <input type="number" id="maxAttempts" value="${settings.maxAttempts}" min="1" max="10">
                    </div>
                    <div>
                        <label for="attemptDelay">Retry Delay (ms)</label>
                        <input type="number" id="attemptDelay" value="${settings.attemptDelay}" min="100" max="10000">
                    </div>
                    <div>
                        <label for="initialDelay">Initial Delay (ms)</label>
                        <input type="number" id="initialDelay" value="${settings.initialDelay}" min="100" max="10000">
                    </div>
                </div>
                <div class="popup-column">
                    <div>
                        <label for="menuCheckInterval">Menu Check Interval (ms)</label>
                        <input type="number" id="menuCheckInterval" value="${settings.menuCheckInterval}" min="50" max="5000">
                    </div>
                    <div>
                        <label for="menuCheckMaxTries">Max Menu Check Attempts</label>
                        <input type="number" id="menuCheckMaxTries" value="${settings.menuCheckMaxTries}" min="1" max="50">
                    </div>
                    <div>
                        <label for="menuOpenDelay">Menu Open Delay (ms)</label>
                        <input type="number" id="menuOpenDelay" value="${settings.menuOpenDelay}" min="100" max="5000">
                    </div>
                    <div>
                        <label for="preSelectionDelay">Pre-Selection Delay (ms)</label>
                        <input type="number" id="preSelectionDelay" value="${settings.preSelectionDelay}" min="50" max="5000">
                    </div>
                </div>
            </div>
            <div class="popup-footer">
                <button class="cancel-btn" id="cancelSettingsBtn">Cancel</button>
                <button class="save-btn" id="saveSettingsBtn">Save</button>
            </div>
        `;

        document.body.appendChild(popup);

        // Attach events to buttons
        document.getElementById('cancelSettingsBtn').addEventListener('click', closePopup);
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            const newSettings = {
                agentName: document.getElementById('agentName').value.trim(),
                maxAttempts: Math.max(1, Math.min(10, parseInt(document.getElementById('maxAttempts').value) || defaultSettings.maxAttempts)),
                attemptDelay: Math.max(100, Math.min(10000, parseInt(document.getElementById('attemptDelay').value) || defaultSettings.attemptDelay)),
                initialDelay: Math.max(100, Math.min(10000, parseInt(document.getElementById('initialDelay').value) || defaultSettings.initialDelay)),
                menuCheckInterval: Math.max(50, Math.min(5000, parseInt(document.getElementById('menuCheckInterval').value) || defaultSettings.menuCheckInterval)),
                menuCheckMaxTries: Math.max(1, Math.min(50, parseInt(document.getElementById('menuCheckMaxTries').value) || defaultSettings.menuCheckMaxTries)),
                menuOpenDelay: Math.max(100, Math.min(5000, parseInt(document.getElementById('menuOpenDelay').value) || defaultSettings.menuOpenDelay)),
                preSelectionDelay: Math.max(50, Math.min(5000, parseInt(document.getElementById('preSelectionDelay').value) || defaultSettings.preSelectionDelay)),
            };

            saveSettings(newSettings);
            closePopup();
        });
    }

    // Expose closePopup to global scope for the close button
    window.closePopup = closePopup;

    GM_registerMenuCommand('Configure Mistral AI Agent', openSettingsPopup);

    function waitFor(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(check);
                    resolve(el);
                } else if (Date.now() - start > timeout) {
                    clearInterval(check);
                    reject(new Error(`Timeout: ${selector} not found`));
                }
            }, 200);
        });
    }

    function forceClick(element) {
        if (!element) return;

        const reactKey = Object.keys(element).find(k =>
            k.startsWith('__reactProps') ||
            k.startsWith('__reactEventHandlers') ||
            k.startsWith('__reactFiber')
        );

        if (reactKey) {
            const props = element[reactKey];
            if (props?.onClick) {
                props.onClick({
                    preventDefault: () => { },
                    stopPropagation: () => { },
                    target: element,
                    currentTarget: element,
                    bubbles: true,
                });
                return;
            }
        }

        try {
            element.focus();
            element.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

            setTimeout(() => {
                element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

                setTimeout(() => {
                    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }, 100);
            }, 80);
        } catch (e) {
            element.click();
        }
    }

    function findAgentMenu() {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            if (
                el.querySelector('[cmdk-item]') ||
                el.querySelector('[role="option"]') ||
                el.querySelector('[role="menuitem"]')
            ) {
                const text = el.textContent.toLowerCase();
                if (text.includes('nexus') || text.includes('select agent') || text.includes('agents')) {
                    return el;
                }
            }
        }
        return null;
    }

    function findAgentInMenu(menu) {
        const selectors = [
            '[cmdk-item]', '[role="option"]', '[role="menuitem"]', 'div[tabindex="-1"]', 'button', 'li'
        ];

        for (const selector of selectors) {
            const items = menu.querySelectorAll(selector);
            for (const item of items) {
                const text = item.textContent?.trim().toLowerCase() || '';
                if (text.includes(settings.agentName.toLowerCase())) {
                    return item;
                }
            }
        }
        return null;
    }

    async function selectAgent(attempt = 1) {
        if (selectionDone || selectionInProgress) {
            return true;
        }

        selectionInProgress = true;

        try {
            showBanner(`Attempt ${attempt}/${settings.maxAttempts}: Waiting for button...`, 'waiting');
            const btn = await waitFor('button[aria-label="Select agent"]');
            if (!btn) throw new Error('Button not found');

            showBanner(`Attempt ${attempt}/${settings.maxAttempts}: Opening menu...`, 'waiting');
            forceClick(btn);
            await new Promise(resolve => setTimeout(resolve, settings.menuOpenDelay));

            let menu = null;
            let attempts = 0;
            while (attempts < settings.menuCheckMaxTries && !menu) {
                menu = findAgentMenu();
                if (menu) break;
                await new Promise(resolve => setTimeout(resolve, settings.menuCheckInterval));
                if (attempts === 3) {
                    forceClick(btn);
                }
                attempts++;
            }

            if (!menu) {
                throw new Error('Agent menu not found');
            }

            showBanner(`Attempt ${attempt}/${settings.maxAttempts}: Searching for "${settings.agentName}"...`, 'waiting');
            await new Promise(resolve => setTimeout(resolve, settings.preSelectionDelay));

            const agentItem = findAgentInMenu(menu);
            if (!agentItem) {
                const items = menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]');
                const availableAgents = Array.from(items)
                    .map(it => it.textContent?.trim())
                    .filter(name => name);
                throw new Error(`Agent "${settings.agentName}" not found. Available agents: ${availableAgents.join(', ')}`);
            }

            showBanner(`Attempt ${attempt}/${settings.maxAttempts}: Selecting "${settings.agentName}"...`, 'waiting');
            forceClick(agentItem);

            selectionDone = true;
            selectionInProgress = false;
            showBanner(`Agent "${settings.agentName}" selected successfully!`);
            return true;
        } catch (e) {
            selectionInProgress = false;
            if (attempt < settings.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, settings.attemptDelay));
                return selectAgent(attempt + 1);
            }
            showBanner(`Failed: ${e.message}`, 'error');
            return false;
        }
    }

    function start() {
        if (document.readyState === 'complete') {
            setTimeout(selectAgent, settings.initialDelay);
        } else {
            window.addEventListener('load', () => {
                setTimeout(selectAgent, settings.initialDelay);
            });
        }

        const observer = new MutationObserver(() => {
            if (!selectionDone && !selectionInProgress && document.querySelector('button[aria-label="Select agent"]')) {
                observer.disconnect();
                selectAgent();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    start();
})();
