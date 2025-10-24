// ==UserScript==
// @name         Mistral AI - AutoAgent (Enhanced Version)
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Automatically selects and manages Mistral AI agents with smart re-selection logic
// @author       EroiiKZz
// @match        https://chat.mistral.ai/chat*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.addStyle
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @connect      chat.mistral.ai
// @updateURL    https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js
// @downloadURL  https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js
// ==/UserScript==

(async function () {
    'use strict';

    // Default settings
    const defaultSettings = {
        agentName: '',
        maxAttempts: 3,
        attemptDelay: 500,
        initialDelay: 200,
        menuCheckInterval: 300,
        menuCheckMaxTries: 5,
        menuOpenDelay: 400,
        preSelectionDelay: 500,
        debugMode: false,
        showBanners: true,
        showNoAgentBanner: true,
        bannerDuration: 3000,
        firstRun: true,
        availableAgents: [],
        language: 'en'
    };

    // Load settings asynchronously
    let settings = {};
    for (const key of Object.keys(defaultSettings)) {
        let stored = await GM.getValue(key, defaultSettings[key]);
        if (key === 'availableAgents' && typeof stored === 'string') {
            try {
                stored = JSON.parse(stored);
            } catch {
                stored = defaultSettings[key];
            }
        }
        // Fix for 'language' setting
        if (key === 'language') {
            if (typeof stored !== 'string' || !['fr', 'en'].includes(stored)) {
                stored = defaultSettings[key];
                await GM.setValue(key, stored);
            }
        }
        settings[key] = stored;
    }

    // Load language file using GM.xmlHttpRequest
    async function loadLanguageFile(langCode) {
        const url = langCode === 'fr'
            ? "https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/lang/fr.json"
            : "https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/lang/en.json";

        return new Promise((resolve) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                onload: (response) => {
                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch {
                        console.error('Failed to parse language file, falling back to English.');
                        resolve({});
                    }
                },
                onerror: () => {
                    console.error('Failed to load language file, falling back to English.');
                    resolve({});
                }
            });
        });
    }

    // Load CSS using GM.xmlHttpRequest
    async function loadCSS() {
        return new Promise((resolve) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: "https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/style.css",
                onload: function (response) {
                    GM.addStyle(response.responseText);
                    resolve();
                },
                onerror: function () {
                    console.error('Failed to load CSS.');
                    resolve();
                }
            });
        });
    }

    // Load resources
    let lang = await loadLanguageFile(settings.language);
    await loadCSS();

    // State variables
    let selectionDone = false;
    let selectionInProgress = false;
    let availableAgents = Array.isArray(settings.availableAgents) ? settings.availableAgents : [];

    // Debug logging
    function logDebug(message) {
        if (settings.debugMode) {
            console.log(`[Mistral-AutoAgent] ${message}`);
        }
    }

    // Show banner
    function showBanner(message, type = 'success', onClick = null) {
        if (type === 'success' && message.includes('""')) return;
        if (!settings.showBanners && type !== 'no-agent') return;
        if (type === 'no-agent' && !settings.showNoAgentBanner) return;

        const existingBanner = document.getElementById('mistralAgentBanner');
        if (existingBanner) existingBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'mistralAgentBanner';
        banner.classList.add(type);

        if (type === 'no-agent') {
            banner.innerHTML = `
                <div>${lang.noAgentSelected || 'No default agent selected'}</div>
                <div style="font-size: 0.875rem; margin-top: 0.25rem;">${lang.selectAgentPrompt || 'Would you like to select one now?'}</div>
                <div class="banner-buttons">
                    <button class="yes-btn" id="selectAgentYes">${lang.yes || 'Yes'}</button>
                    <button class="no-btn" id="selectAgentNo">${lang.no || 'No'}</button>
                </div>
                <div class="disable-banner" id="disableNoAgentBanner">${lang.disableBanner || 'Do not show this banner again'}</div>
            `;
        } else {
            banner.textContent = message;
        }

        if (onClick && type !== 'no-agent') {
            banner.style.cursor = 'pointer';
            banner.onclick = onClick;
        }

        document.body.prepend(banner);

        if (type === 'no-agent') {
            document.getElementById('selectAgentYes')?.addEventListener('click', () => {
                banner.remove();
                openSettingsPopup();
            });
            document.getElementById('selectAgentNo')?.addEventListener('click', () => {
                banner.remove();
            });
            document.getElementById('disableNoAgentBanner')?.addEventListener('click', async () => {
                settings.showNoAgentBanner = false;
                await GM.setValue('showNoAgentBanner', false);
                banner.remove();
            });
        } else if (type !== 'no-agent' && type !== 'waiting' && type !== 'update') {
            setTimeout(() => {
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }, settings.bannerDuration);
        }
    }

    // Add settings button
    function addSettingsButton() {
        const tryAddButton = () => {
            const container = document.querySelector('.fixed.end-3.bottom-3.z-40.hidden.gap-2.md\\:flex');
            if (container) {
                const settingsButton = document.createElement('button');
                settingsButton.type = 'button';
                settingsButton.id = 'mistralSettingsButton';
                settingsButton.setAttribute('aria-label', lang.settingsAriaLabel || 'Open Mistral AutoAgent settings');
                settingsButton.className = 'flex items-center justify-center rounded-full border border-default bg-state-brand p-1 text-muted shadow-xl transition-colors hover:bg-muted focus-visible:outline-hidden dark:border-transparent';
                settingsButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings size-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                        <path d="m12 18-7-4 7-4"></path>
                        <path d="m12 6 7 4-7 4"></path>
                    </svg>
                `;
                settingsButton.addEventListener('click', openSettingsPopup);
                container.insertBefore(settingsButton, container.firstChild);
                logDebug("Settings button added successfully.");
            } else {
                logDebug("Container not found, retrying in 500ms...");
                setTimeout(tryAddButton, 500);
            }
        };
        setTimeout(tryAddButton, 500);
    }

    // Save settings
    async function saveSettings(newSettings) {
        const languageChanged = newSettings.language && newSettings.language !== settings.language;
        for (const [key, value] of Object.entries(newSettings)) {
            await GM.setValue(key, value);
        }
        Object.assign(settings, newSettings);

        if (languageChanged) {
            lang = await loadLanguageFile(settings.language);
            showBanner(lang.settingsSaved || 'Settings saved!', 'success');
            if (document.getElementById('mistralSettingsPopup')) {
                closePopup();
                setTimeout(openSettingsPopup, 100);
            }
        } else {
            showBanner(lang.settingsSaved || 'Settings saved!', 'success');
        }
    }

    // Close popup
    function closePopup() {
        document.getElementById('mistralSettingsPopup')?.remove();
        document.querySelector('.popup-overlay')?.remove();
    }

    // Get clean agent name
    function getCleanAgentName(element) {
        const nameDiv = element.querySelector('div[class*="text-default"], div[class*="font-medium"], div[class*="text-sm"]');
        if (nameDiv) return nameDiv.textContent.trim();
        const firstDiv = element.querySelector('div');
        if (firstDiv) return firstDiv.textContent.trim().split('\n')[0].trim();
        return element.textContent.trim().split('\n')[0].trim();
    }

    // Get currently selected agent
    function getCurrentlySelectedAgent() {
        const activeAgentBtn = document.querySelector('button[aria-label="Select agent"], button[aria-label="Current agent"]');
        if (activeAgentBtn) {
            const agentText = activeAgentBtn.textContent.replace(/^@/, '').trim();
            if (agentText.toLowerCase().includes('select agent') || agentText.toLowerCase().includes('choisir un agent')) {
                return null;
            }
            return agentText;
        }
        return null;
    }

    // Find agent menu
    function findAgentMenu() {
        const selectors = [
            '[role="menu"]:not([aria-hidden="true"])',
            '[cmdk-portal]',
            '.agent-selector-menu',
            'div[role="dialog"]:not([aria-hidden="true"])'
        ];
        for (const selector of selectors) {
            const menu = document.querySelector(selector);
            if (menu && menu.offsetParent !== null) return menu;
        }
        return null;
    }

    // Find agent in menu
    function findAgentInMenu(menu) {
        if (!menu) return null;
        const selectors = ['[cmdk-item]', '[role="option"]', '[role="menuitem"]', 'div[tabindex="-1"]', 'button', 'li'];
        for (const selector of selectors) {
            const items = menu.querySelectorAll(selector);
            for (const item of items) {
                const cleanName = getCleanAgentName(item).toLowerCase();
                if (cleanName.includes(settings.agentName.toLowerCase())) {
                    return item;
                }
            }
        }
        return null;
    }

    // Detect available agents
    async function detectAvailableAgents() {
        try {
            if (availableAgents.length > 0) {
                logDebug("Agent list already loaded.");
                return;
            }

            const noAgentBanner = document.getElementById('mistralAgentBanner.no-agent');
            if (noAgentBanner) {
                logDebug("No-agent banner displayed, skipping automatic detection.");
                return;
            }

            // 1. Open the menu
            const btn = await waitFor('button[aria-label="Select agent"], button[aria-label="Choose agent"]', 10000);
            if (!btn) {
                logDebug("Select agent button not found.");
                return;
            }
            forceClick(btn);

            // 2. Wait for the menu to open
            await new Promise(r => setTimeout(r, settings.menuOpenDelay));

            let menu = null;
            let tries = 0;
            while (tries < settings.menuCheckMaxTries && !menu) {
                menu = findAgentMenu();
                if (menu) break;
                await new Promise(r => setTimeout(r, settings.menuCheckInterval));
                tries++;
            }

            if (!menu) {
                logDebug("Agent menu not found.");
                return;
            }

            // 3. Get the list of agents
            const items = menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]');
            const agents = Array.from(items)
                .map(item => getCleanAgentName(item))
                .filter(name => name && !name.toLowerCase().includes('select') && !name.toLowerCase().includes('choisir'));

            if (agents.length > 0) {
                availableAgents = [...new Set(agents)];
                settings.availableAgents = availableAgents;
                await GM.setValue('availableAgents', JSON.stringify(availableAgents));
                logDebug(`Detected agents: ${availableAgents.join(', ')}`);
            }

            // 4. Close the menu immediately
            forceClick(btn);
            logDebug("Agent menu closed after detection.");
        } catch (e) {
            logDebug(`Failed to detect agents: ${e.message}`);
        }

        const style = document.createElement('style');
        style.textContent = `
            [cmdk-portal], [role="menu"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        style.remove();
    }

    // Open settings popup
    function openSettingsPopup() {
        const existingPopup = document.getElementById('mistralSettingsPopup');
        if (existingPopup) existingPopup.remove();

        const existingOverlay = document.querySelector('.popup-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.onclick = closePopup;
        document.body.appendChild(overlay);

        const popup = document.createElement('div');
        popup.id = 'mistralSettingsPopup';
        popup.innerHTML = `
            <div class="popup-header">
                <h2>${lang.settingsTitle || 'Mistral AI Agent Settings'}</h2>
                <button class="close-btn" id="closePopupBtn">×</button>
            </div>
            <div class="popup-body">
                <div class="section">
                    <div class="section-content full-width">
                        <label for="agentName">${lang.agentNameLabel || 'Agent Name'}</label>
                        <select id="agentName">
                            <option value="" ${!settings.agentName ? 'selected' : ''}>${lang.noAgentOption || 'No agent'}</option>
                            ${availableAgents.map(agent => `
                                <option value="${agent}" ${settings.agentName === agent ? 'selected' : ''}>${agent}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="section">
                    <div class="section-header">
                        <h3>${lang.timingsSection || 'Timings'}</h3>
                        <span class="chevron">▼</span>
                    </div>
                    <div class="section-content">
                        <div>
                            <label for="maxAttempts">${lang.maxAttemptsLabel || 'Max Attempts'}</label>
                            <input type="number" id="maxAttempts" value="${settings.maxAttempts}" min="1" max="10">
                        </div>
                        <div>
                            <label for="attemptDelay">${lang.attemptDelayLabel || 'Delay Between Attempts (ms)'}</label>
                            <input type="number" id="attemptDelay" value="${settings.attemptDelay}" min="100" max="10000">
                        </div>
                        <div>
                            <label for="initialDelay">${lang.initialDelayLabel || 'Initial Delay (ms)'}</label>
                            <input type="number" id="initialDelay" value="${settings.initialDelay}" min="100" max="10000">
                        </div>
                        <div>
                            <label for="menuCheckInterval">${lang.menuCheckIntervalLabel || 'Check Interval (ms)'}</label>
                            <input type="number" id="menuCheckInterval" value="${settings.menuCheckInterval}" min="50" max="5000">
                        </div>
                        <div>
                            <label for="menuCheckMaxTries">${lang.menuCheckMaxTriesLabel || 'Max Menu Check Attempts'}</label>
                            <input type="number" id="menuCheckMaxTries" value="${settings.menuCheckMaxTries}" min="1" max="50">
                        </div>
                        <div>
                            <label for="menuOpenDelay">${lang.menuOpenDelayLabel || 'Menu Open Delay (ms)'}</label>
                            <input type="number" id="menuOpenDelay" value="${settings.menuOpenDelay}" min="100" max="5000">
                        </div>
                        <div>
                            <label for="preSelectionDelay">${lang.preSelectionDelayLabel || 'Pre-Selection Delay (ms)'}</label>
                            <input type="number" id="preSelectionDelay" value="${settings.preSelectionDelay}" min="50" max="5000">
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-header">
                        <h3>${lang.generalSection || 'General'}</h3>
                        <span class="chevron">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="showBanners" ${settings.showBanners ? 'checked' : ''}>
                            <label for="showBanners">${lang.showBannersLabel || 'Show Banners'}</label>
                        </div>
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="debugMode" ${settings.debugMode ? 'checked' : ''}>
                            <label for="debugMode">${lang.debugModeLabel || 'Debug Mode'}</label>
                        </div>
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="showNoAgentBanner" ${settings.showNoAgentBanner ? 'checked' : ''}>
                            <label for="showNoAgentBanner">${lang.showNoAgentBannerLabel || 'Show "No Agent Selected" Banner'}</label>
                        </div>
                        <div class="full-width">
                            <label for="language">${lang.languageLabel || 'Language'}</label>
                            <select id="language">
                                <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option>
                                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="popup-footer">
                <button class="cancel-btn" id="cancelSettingsBtn">${lang.cancelButton || 'Cancel'}</button>
                <button class="save-btn" id="saveSettingsBtn">${lang.saveButton || 'Save'}</button>
            </div>
        `;
        document.body.appendChild(popup);

        // Toggle sections
        popup.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                header.classList.toggle('collapsed');
                content.classList.toggle('hidden');
            });
        });

        document.getElementById('closePopupBtn')?.addEventListener('click', closePopup);
        document.getElementById('cancelSettingsBtn')?.addEventListener('click', closePopup);
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const newAgentName = document.getElementById('agentName').value.trim();
            const newLanguage = document.getElementById('language').value;
            const newSettings = {
                agentName: newAgentName,
                maxAttempts: Math.max(1, Math.min(10, parseInt(document.getElementById('maxAttempts').value) || defaultSettings.maxAttempts)),
                attemptDelay: Math.max(100, Math.min(10000, parseInt(document.getElementById('attemptDelay').value) || defaultSettings.attemptDelay)),
                initialDelay: Math.max(100, Math.min(10000, parseInt(document.getElementById('initialDelay').value) || defaultSettings.initialDelay)),
                menuCheckInterval: Math.max(50, Math.min(5000, parseInt(document.getElementById('menuCheckInterval').value) || defaultSettings.menuCheckInterval)),
                menuCheckMaxTries: Math.max(1, Math.min(50, parseInt(document.getElementById('menuCheckMaxTries').value) || defaultSettings.menuCheckMaxTries)),
                menuOpenDelay: Math.max(100, Math.min(5000, parseInt(document.getElementById('menuOpenDelay').value) || defaultSettings.menuOpenDelay)),
                preSelectionDelay: Math.max(50, Math.min(5000, parseInt(document.getElementById('preSelectionDelay').value) || defaultSettings.preSelectionDelay)),
                showBanners: document.getElementById('showBanners').checked,
                debugMode: document.getElementById('debugMode').checked,
                showNoAgentBanner: document.getElementById('showNoAgentBanner').checked,
                language: newLanguage,
                firstRun: false,
                availableAgents: availableAgents
            };
            await saveSettings(newSettings);
            showBanner(`"${newAgentName || lang.noAgentOption || 'No agent'}" ${lang.agentConfiguredMessage || 'configured for next chats.'}`, 'success');
            closePopup();
        });
    }

    // Check for updates
    async function checkForUpdates() {
        try {
            logDebug('Checking for updates...');
            const response = await fetch('https://api.github.com/repos/EroiiKZz/Mistral-AutoAgent/commits?per_page=1');
            const data = await response.json();
            const latestCommitDate = new Date(data[0].commit.committer.date);
            const lastCheckDateRaw = await GM.getValue('lastUpdateCheck', 0);
            const lastCheckDate = new Date(lastCheckDateRaw);

            if (latestCommitDate > lastCheckDate) {
                const updateUrl = 'https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js';
                showBanner(lang.updateAvailable || 'Update available! Click to install.', 'update', () => {
                    window.open(updateUrl, '_blank');
                });
                await GM.setValue('lastUpdateCheck', Date.now());
            }
        } catch (e) {
            logDebug(`Update check error: ${e.message}`);
        }
    }

    // Wait for DOM element
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

    // Force click
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

    // Attempt agent selection
    async function attemptAgentSelection(attempt) {
        if (!settings.agentName || settings.agentName.trim() === '') {
            logDebug('No agent configured.');
            return;
        }

        const chatMessages = document.querySelectorAll('[data-testid="chat-message"]');
        const isChatActive = chatMessages.length > 0;

        if (isChatActive) {
            logDebug('Chat already active. Skipping agent selection for this chat.');
            return;
        }

        selectionInProgress = true;
        try {
            const btn = await waitFor('button[aria-label="Select agent"]', 10000);
            if (!btn) throw new Error('Button not found.');

            forceClick(btn);
            await new Promise(resolve => setTimeout(resolve, settings.menuOpenDelay));

            let menu = null;
            let tries = 0;
            while (tries < settings.menuCheckMaxTries && !menu) {
                menu = findAgentMenu();
                if (menu) break;
                await new Promise(resolve => setTimeout(resolve, settings.menuCheckInterval));
                tries++;
            }

            if (!menu) throw new Error('Menu not found.');

            const agentItem = findAgentInMenu(menu);
            if (!agentItem) {
                const availableAgentsList = Array.from(menu.querySelectorAll('[cmdk-item], [role="option"]'))
                    .map(it => getCleanAgentName(it))
                    .filter(name => name);
                throw new Error(`Agent "${settings.agentName}" not found. Available: ${availableAgentsList.join(', ')}`);
            }

            forceClick(agentItem);
            selectionDone = true;
            showBanner(`"${settings.agentName}" ${lang.agentSelectedMessage || 'selected for next chats!'}`, 'success');
        } catch (e) {
            logDebug(`Attempt ${attempt} failed: ${e.message}`);
            if (attempt < settings.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, settings.attemptDelay));
                await attemptAgentSelection(attempt + 1);
            } else {
                showBanner(`${lang.failedAfterAttempts || 'Failed after'} ${settings.maxAttempts}.`, 'error');
            }
        } finally {
            selectionInProgress = false;
        }
    }

    // Select agent
    async function selectAgent(attempt = 1) {
        if (selectionInProgress) return;

        if (!settings.agentName || settings.agentName.trim() === '') {
            logDebug('No agent defined, skipping automatic selection.');
            return;
        }

        // Check if a chat is already active
        const chatMessages = document.querySelectorAll('[data-testid="chat-message"]');
        const isChatActive = chatMessages.length > 0;
        const currentAgent = getCurrentlySelectedAgent();

        if (!currentAgent) {
            logDebug("New chat detected, selecting configured agent...");
            await attemptAgentSelection(attempt);
        } else if (currentAgent !== settings.agentName && !isChatActive) {
            logDebug(`No active chat, updating agent to "${settings.agentName}" for next chats.`);
            selectionInProgress = true;
            try {
                const btn = await waitFor('button[aria-label="Select agent"], button[aria-label="Choose agent"]', 10000);
                if (!btn) throw new Error('Select agent button not found.');

                forceClick(btn);
                await new Promise(resolve => setTimeout(resolve, settings.menuOpenDelay));

                let menu = null;
                let tries = 0;
                while (tries < settings.menuCheckMaxTries && !menu) {
                    menu = findAgentMenu();
                    if (menu) break;
                    await new Promise(resolve => setTimeout(resolve, settings.menuCheckInterval));
                    tries++;
                }

                if (!menu) throw new Error('Agent menu not found.');

                const agentItem = findAgentInMenu(menu);
                if (!agentItem) {
                    const availableAgentsList = Array.from(menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]'))
                        .map(it => getCleanAgentName(it))
                        .filter(name => name);
                    throw new Error(`Agent "${settings.agentName}" not found. Available: ${availableAgentsList.join(', ')}`);
                }

                forceClick(agentItem);
                const cleanName = getCleanAgentName(agentItem);
                settings.agentName = cleanName;
                await GM.setValue('agentName', cleanName);
                logDebug(`Agent updated to "${cleanName}" for next chats.`);
                showBanner(`"${settings.agentName}" ${lang.agentSelectedSuccessfully || 'selected successfully for next chats!'}`, 'success');
            } catch (e) {
                logDebug(`Attempt ${attempt} failed: ${e.message}`);
                if (attempt < settings.maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, settings.attemptDelay));
                    await selectAgent(attempt + 1);
                } else {
                    showBanner(`${lang.failedAfterAttempts || 'Failed after'} ${settings.maxAttempts}: ${e.message}`, 'error');
                }
            } finally {
                selectionInProgress = false;
            }
        } else {
            logDebug(`Chat already active with agent "${currentAgent}". Agent will be updated for next chats only.`);
            selectionDone = true;
        }
    }

    /// Start script
    function start() {
        addSettingsButton();
        setTimeout(detectAvailableAgents, 500);

        const agentMenuObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && !selectionInProgress) {
                    const menu = findAgentMenu();
                    if (menu) {
                        const items = menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]');
                        if (items.length > 0) {
                            const newAgents = Array.from(items)
                                .map(item => getCleanAgentName(item))
                                .filter(name => name && !name.toLowerCase().includes('select') && !name.toLowerCase().includes('choisir'));
                            const uniqueNewAgents = newAgents.filter(agent => !availableAgents.includes(agent));
                            if (uniqueNewAgents.length > 0) {
                                availableAgents = [...new Set([...availableAgents, ...uniqueNewAgents])];
                                settings.availableAgents = availableAgents;
                                GM.setValue('availableAgents', JSON.stringify(availableAgents));
                                logDebug(`Passively detected new agents: ${uniqueNewAgents.join(', ')}`);
                            }
                        }
                    }
                }
            });
        });
        agentMenuObserver.observe(document.body, { childList: true, subtree: true });


        if (!settings.agentName || settings.agentName.trim() === "") {
            logDebug("No agent configured. Automatic selection disabled.");
            if (settings.showNoAgentBanner) {
                showBanner("", "no-agent");
            }
            return;
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toUpperCase() === 'M') {
                e.preventDefault();
                const popup = document.getElementById('mistralSettingsPopup');
                popup ? closePopup() : openSettingsPopup();
            }
        });

        const handlePageLoad = () => {
            const currentAgent = getCurrentlySelectedAgent();
            if (!currentAgent) {
                logDebug("New chat detected, attempting to select configured agent...");
                setTimeout(selectAgent, settings.initialDelay);
            } else {
                logDebug(`Agent "${currentAgent}" already active. Configuration ready for next chats.`);
                selectionDone = true;
            }
            setTimeout(checkForUpdates, 10000);
        };

        if (document.readyState === 'complete') {
            handlePageLoad();
        } else {
            window.addEventListener('load', handlePageLoad);
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const activeAgentBtn = document.querySelector('button[aria-label="Select agent"], button[aria-label="Current agent"]');
                    if (activeAgentBtn) {
                        const newCurrentAgent = activeAgentBtn.textContent.replace(/^@/, '').trim();
                        if (newCurrentAgent &&
                            !newCurrentAgent.toLowerCase().includes('select agent') &&
                            newCurrentAgent !== settings.agentName) {
                            const chatMessages = document.querySelectorAll('[data-testid="chat-message"]');
                            const isChatActive = chatMessages.length > 0;
                            if (!isChatActive) {
                                logDebug(`Manual agent change detected: "${newCurrentAgent}". Updating config for next chats.`);
                                settings.agentName = newCurrentAgent;
                                GM.setValue('agentName', newCurrentAgent);
                            } else {
                                logDebug(`Chat is active. Agent change will apply to next chats only.`);
                            }
                        }
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.closePopup = closePopup;
        GM.registerMenuCommand(lang.configureAgentMenu || 'Configure Mistral AI Agent', openSettingsPopup);   
        setInterval(() => {
            if (!document.getElementById('mistralAgentBanner.no-agent') &&
                !settings.agentName &&
                settings.showNoAgentBanner) {
                showBanner("", "no-agent");
            }
        }, 5000);
    }
    start();
})();
