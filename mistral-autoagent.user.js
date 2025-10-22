// ==UserScript==
// @name         Mistral AI - AutoAgent (Enhanced Version)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Automatically selects and manages Mistral AI agents with smart re-selection logic
// @author       EroiiKZz (enhanced by Nexus)
// @match        https://chat.mistral.ai/chat
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.addStyle
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @connect      chat.mistral.ai
// @connect      api.github.com
// @connect      raw.githubusercontent.com
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
        initialDelay: 500,
        menuCheckInterval: 300,
        menuCheckMaxTries: 5,
        menuOpenDelay: 800,
        preSelectionDelay: 500,
        debugMode: false,
        showBanners: true,
        showNoAgentBanner: true,
        bannerDuration: 3000,
        firstRun: true,
        availableAgents: [],
        language: 'fr'
    };

    // Language files (integrated)
    const lang = {
        fr: {
            noAgentSelected: "Aucun agent sélectionné par défaut",
            selectAgentPrompt: "Souhaitez-vous en sélectionner un maintenant ?",
            yes: "Oui",
            no: "Non",
            disableBanner: "Ne plus afficher cette bannière",
            settingsAriaLabel: "Ouvrir les paramètres Mistral AutoAgent",
            settingsTitle: "Paramètres de l'Agent Mistral AI",
            agentNameLabel: "Nom de l'Agent",
            noAgentOption: "Aucun agent",
            timingsSection: "Timings",
            maxAttemptsLabel: "Tentatives maximales",
            attemptDelayLabel: "Délai entre tentatives (ms)",
            initialDelayLabel: "Délai initial (ms)",
            menuCheckIntervalLabel: "Intervalle de vérification (ms)",
            menuCheckMaxTriesLabel: "Tentatives max. pour le menu",
            menuOpenDelayLabel: "Délai d'ouverture du menu (ms)",
            preSelectionDelayLabel: "Délai de présélection (ms)",
            generalSection: "Général",
            showBannersLabel: "Afficher les bannières",
            debugModeLabel: "Mode Debug",
            showNoAgentBannerLabel: "Afficher la bannière 'Aucun agent sélectionné'",
            languageLabel: "Langue",
            cancelButton: "Annuler",
            saveButton: "Sauvegarder",
            settingsSaved: "Paramètres sauvegardés !",
            agentConfiguredMessage: "configuré pour les prochains chats.",
            updateAvailable: "Mise à jour disponible ! Cliquez pour installer.",
            failedAfterAttempts: "Échec après",
            attemptMessage: "Tentative",
            searchingButton: "Recherche du bouton",
            openingMenu: "Ouverture du menu",
            searchingAgent: "Recherche de",
            selectingAgent: "Sélection de",
            agentSelectedMessage: "sélectionné pour les prochains chats !",
            agentSelectedSuccessfully: "sélectionné avec succès !",
            configureAgentMenu: "Configurer Mistral AI Agent"
        },
        en: {
            noAgentSelected: "No default agent selected",
            selectAgentPrompt: "Would you like to select one now?",
            yes: "Yes",
            no: "No",
            disableBanner: "Do not show this banner again",
            settingsAriaLabel: "Open Mistral AutoAgent settings",
            settingsTitle: "Mistral AI Agent Settings",
            agentNameLabel: "Agent Name",
            noAgentOption: "No agent",
            timingsSection: "Timings",
            maxAttemptsLabel: "Max Attempts",
            attemptDelayLabel: "Delay Between Attempts (ms)",
            initialDelayLabel: "Initial Delay (ms)",
            menuCheckIntervalLabel: "Check Interval (ms)",
            menuCheckMaxTriesLabel: "Max Menu Check Attempts",
            menuOpenDelayLabel: "Menu Open Delay (ms)",
            preSelectionDelayLabel: "Pre-Selection Delay (ms)",
            generalSection: "General",
            showBannersLabel: "Show Banners",
            debugModeLabel: "Debug Mode",
            showNoAgentBannerLabel: "Show 'No Agent Selected' Banner",
            languageLabel: "Language",
            cancelButton: "Cancel",
            saveButton: "Save",
            settingsSaved: "Settings saved!",
            agentConfiguredMessage: "configured for next chats.",
            updateAvailable: "Update available! Click to install.",
            failedAfterAttempts: "Failed after",
            attemptMessage: "Attempt",
            searchingButton: "Searching for button",
            openingMenu: "Opening menu",
            searchingAgent: "Searching for",
            selectingAgent: "Selecting",
            agentSelectedMessage: "selected for next chats!",
            agentSelectedSuccessfully: "selected successfully!",
            configureAgentMenu: "Configure Mistral AI Agent"
        }
    };

    // CSS (integrated)
    const styles = `
        /* Banner styling */
        #mistralAgentBanner {
            position: fixed;
            bottom: 1rem;
            right: 5%;
            background: var(--bg-state-brand);
            color: var(--text-color-default);
            text-align: center;
            padding: 0.75rem 1rem;
            z-index: 999999;
            font-family: var(--font-sans);
            box-shadow: var(--drop-shadow-md);
            border-radius: var(--radius-md);
            font-weight: var(--font-weight-medium);
            border: 1px solid var(--bg-border-destructive);
            max-width: 400px;
            width: auto;
            transition: opacity 0.3s ease-in-out;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        /* Icons based on type */
        #mistralAgentBanner::before {
            content: "✅";
            color: var(--green-500);
            font-weight: bold;
        }
        #mistralAgentBanner.error::before {
            content: "⚠️";
            color: var(--red-500);
        }
        #mistralAgentBanner.waiting::before {
            content: "🔄";
            color: var(--blue-500);
        }
        #mistralAgentBanner.update::before {
            content: "📥";
            color: var(--green-500);
        }
        #mistralAgentBanner.no-agent {
            background: var(--bg-card);
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 1rem;
            text-align: left;
        }
        #mistralAgentBanner.no-agent::before {
            display: none;
        }
        #mistralAgentBanner.no-agent .banner-buttons {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.5rem;
            justify-content: center;
        }
        #mistralAgentBanner.no-agent button {
            padding: 0.5rem 1rem;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            font-size: var(--text-sm);
            font-weight: var(--font-weight-medium);
        }
        #mistralAgentBanner.no-agent .yes-btn {
            background: var(--brand-500);
            color: var(--zinc-00);
        }
        #mistralAgentBanner.no-agent .no-btn {
            background: var(--background-color-input);
            color: var(--text-color-default);
            border: 1px solid var(--border-color-default);
        }
        #mistralAgentBanner.no-agent .disable-banner {
            font-size: var(--text-xs);
            color: var(--text-color-muted);
            margin-top: 0.5rem;
            cursor: pointer;
            text-decoration: underline;
            align-self: center;
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
            width: 600px;
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
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        #mistralSettingsPopup .section {
            border: 1px solid var(--border-color-default);
            border-radius: var(--radius-sm);
            padding: 0.75rem;
        }
        #mistralSettingsPopup .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
            margin-bottom: 0.5rem;
        }
        #mistralSettingsPopup .section-header h3 {
            margin: 0;
            color: var(--text-color-default);
            font-size: var(--text-sm);
            font-weight: var(--font-weight-medium);
        }
        #mistralSettingsPopup .section-header .chevron {
            transition: transform 0.2s;
        }
        #mistralSettingsPopup .section-header.collapsed .chevron {
            transform: rotate(-90deg);
        }
        #mistralSettingsPopup .section-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        #mistralSettingsPopup .section-content.hidden {
            display: none;
        }
        #mistralSettingsPopup .full-width {
            grid-column: 1 / -1;
        }
        #mistralSettingsPopup label {
            display: block;
            color: var(--text-color-default);
            font-weight: var(--font-weight-medium);
            font-size: var(--text-sm);
            margin-bottom: 0.375rem;
        }
        #mistralSettingsPopup .checkbox-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        #mistralSettingsPopup .checkbox-container input[type="checkbox"] {
            margin: 0;
        }
        #mistralSettingsPopup input:not([type="checkbox"]),
        #mistralSettingsPopup select {
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
        #mistralSettingsPopup input:focus:not([type="checkbox"]),
        #mistralSettingsPopup select:focus {
            outline: none;
            border-color: var(--brand-500);
            box-shadow: 0 0 0 3px var(--transparent-brand-20);
        }
        #mistralSettingsPopup .popup-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.625rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color-default);
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
    `;

    // Load settings asynchronously
    let settings = {};
    for (const key of Object.keys(defaultSettings)) {
        let stored = await GM.getValue(key, defaultSettings[key]);
        if (typeof stored === 'string' && (key === 'availableAgents' || key === 'language')) {
            try {
                stored = JSON.parse(stored);
            } catch {
                stored = defaultSettings[key];
            }
        }
        settings[key] = stored;
    }

    // Apply dynamic styles
    GM.addStyle(styles);

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
                <div>${lang[settings.language].noAgentSelected}</div>
                <div style="font-size: 0.875rem; margin-top: 0.25rem;">${lang[settings.language].selectAgentPrompt}</div>
                <div class="banner-buttons">
                    <button class="yes-btn" id="selectAgentYes">${lang[settings.language].yes}</button>
                    <button class="no-btn" id="selectAgentNo">${lang[settings.language].no}</button>
                </div>
                <div class="disable-banner" id="disableNoAgentBanner">${lang[settings.language].disableBanner}</div>
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
            document.getElementById('selectAgentYes').addEventListener('click', () => {
                banner.remove();
                openSettingsPopup();
            });
            document.getElementById('selectAgentNo').addEventListener('click', () => {
                banner.remove();
            });
            document.getElementById('disableNoAgentBanner').addEventListener('click', async () => {
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
                settingsButton.setAttribute('aria-label', lang[settings.language].settingsAriaLabel);
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
        for (const [key, value] of Object.entries(newSettings)) {
            await GM.setValue(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
        Object.assign(settings, newSettings);

        if (!settings.agentName || settings.agentName.trim() === "") {
            if (settings.showNoAgentBanner) {
                showBanner("", "no-agent");
            }
        }
        showBanner(lang[settings.language].settingsSaved, 'success');
        logDebug('Settings saved: ' + JSON.stringify(newSettings));
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

            const btn = await waitFor('button[aria-label="Select agent"], button[aria-label="Choose agent"]', 10000);
            forceClick(btn);
            await new Promise(r => setTimeout(r, settings.menuOpenDelay));

            let menu = null;
            let tries = 0;
            while (tries < 5 && !menu) {
                menu = findAgentMenu();
                if (menu) break;
                await new Promise(r => setTimeout(r, 200));
                tries++;
            }

            if (menu) {
                const items = menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]');
                const agents = Array.from(items)
                    .map(item => getCleanAgentName(item))
                    .filter(name => name && !name.toLowerCase().includes('select') && !name.toLowerCase().includes('choisir'));

                availableAgents = [...new Set(agents)];
                settings.availableAgents = availableAgents;
                await GM.setValue('availableAgents', JSON.stringify(availableAgents));

                if (availableAgents.length > 0) {
                    logDebug(`Detected agents: ${availableAgents.join(', ')}`);
                }
            }
        } catch (e) {
            logDebug(`Failed to detect agents: ${e.message}`);
        } finally {
            const btn = document.querySelector('button[aria-label="Select agent"], button[aria-label="Choose agent"]');
            if (btn) forceClick(btn);
        }
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
                <h2>${lang[settings.language].settingsTitle}</h2>
                <button class="close-btn" id="closePopupBtn">×</button>
            </div>
            <div class="popup-body">
                <div class="section">
                    <div class="section-content full-width">
                        <label for="agentName">${lang[settings.language].agentNameLabel}</label>
                        <select id="agentName">
                            <option value="" ${!settings.agentName ? 'selected' : ''}>${lang[settings.language].noAgentOption}</option>
                            ${availableAgents.map(agent => `
                                <option value="${agent}" ${settings.agentName === agent ? 'selected' : ''}>${agent}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="section">
                    <div class="section-header">
                        <h3>${lang[settings.language].timingsSection}</h3>
                        <span class="chevron">▼</span>
                    </div>
                    <div class="section-content">
                        <div>
                            <label for="maxAttempts">${lang[settings.language].maxAttemptsLabel}</label>
                            <input type="number" id="maxAttempts" value="${settings.maxAttempts}" min="1" max="10">
                        </div>
                        <div>
                            <label for="attemptDelay">${lang[settings.language].attemptDelayLabel}</label>
                            <input type="number" id="attemptDelay" value="${settings.attemptDelay}" min="100" max="10000">
                        </div>
                        <div>
                            <label for="initialDelay">${lang[settings.language].initialDelayLabel}</label>
                            <input type="number" id="initialDelay" value="${settings.initialDelay}" min="100" max="10000">
                        </div>
                        <div>
                            <label for="menuCheckInterval">${lang[settings.language].menuCheckIntervalLabel}</label>
                            <input type="number" id="menuCheckInterval" value="${settings.menuCheckInterval}" min="50" max="5000">
                        </div>
                        <div>
                            <label for="menuCheckMaxTries">${lang[settings.language].menuCheckMaxTriesLabel}</label>
                            <input type="number" id="menuCheckMaxTries" value="${settings.menuCheckMaxTries}" min="1" max="50">
                        </div>
                        <div>
                            <label for="menuOpenDelay">${lang[settings.language].menuOpenDelayLabel}</label>
                            <input type="number" id="menuOpenDelay" value="${settings.menuOpenDelay}" min="100" max="5000">
                        </div>
                        <div>
                            <label for="preSelectionDelay">${lang[settings.language].preSelectionDelayLabel}</label>
                            <input type="number" id="preSelectionDelay" value="${settings.preSelectionDelay}" min="50" max="5000">
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-header">
                        <h3>${lang[settings.language].generalSection}</h3>
                        <span class="chevron">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="showBanners" ${settings.showBanners ? 'checked' : ''}>
                            <label for="showBanners">${lang[settings.language].showBannersLabel}</label>
                        </div>
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="debugMode" ${settings.debugMode ? 'checked' : ''}>
                            <label for="debugMode">${lang[settings.language].debugModeLabel}</label>
                        </div>
                        <div class="checkbox-container full-width">
                            <input type="checkbox" id="showNoAgentBanner" ${settings.showNoAgentBanner ? 'checked' : ''}>
                            <label for="showNoAgentBanner">${lang[settings.language].showNoAgentBannerLabel}</label>
                        </div>
                        <div class="full-width">
                            <label for="language">${lang[settings.language].languageLabel}</label>
                            <select id="language">
                                <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option>
                                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="popup-footer">
                <button class="cancel-btn" id="cancelSettingsBtn">${lang[settings.language].cancelButton}</button>
                <button class="save-btn" id="saveSettingsBtn">${lang[settings.language].saveButton}</button>
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

        document.getElementById('closePopupBtn').addEventListener('click', closePopup);
        document.getElementById('cancelSettingsBtn').addEventListener('click', closePopup);

        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
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
            showBanner(`"${newAgentName || lang[newLanguage].noAgentOption}" ${lang[newLanguage].agentConfiguredMessage}`, 'success');
            closePopup();

            // Reload to apply language changes
            window.location.reload();
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
                showBanner(lang[settings.language].updateAvailable, 'update', () => {
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

        selectionInProgress = true;
        try {
            const btn = await waitFor('button[aria-label="Select agent"]');
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
            showBanner(`"${settings.agentName}" ${lang[settings.language].agentSelectedMessage}`, 'success');
        } catch (e) {
            logDebug(`Attempt ${attempt} failed: ${e.message}`);
            if (attempt < settings.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, settings.attemptDelay));
                await attemptAgentSelection(attempt + 1);
            } else {
                showBanner(`${lang[settings.language].failedAfterAttempts} ${settings.maxAttempts}.`, 'error');
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

        const currentAgent = getCurrentlySelectedAgent();
        if (!currentAgent) {
            logDebug("New chat detected, selecting configured agent...");
            await attemptAgentSelection(attempt);
        } else {
            logDebug(`Agent "${currentAgent}" already selected. Configuration saved for next chats.`);
            selectionDone = true;
        }

        if (currentAgent && currentAgent !== settings.agentName) {
            logDebug(`Current agent "${currentAgent}" differs from "${settings.agentName}". Changing now...`);
            selectionDone = false;
        }

        selectionInProgress = true;
        try {
            showBanner(`${lang[settings.language].attemptMessage} ${attempt}/${settings.maxAttempts}: ${lang[settings.language].searchingButton}...`, 'waiting');
            const btn = await waitFor('button[aria-label="Select agent"], button[aria-label="Choose agent"]');
            if (!btn) throw new Error('Select agent button not found.');

            showBanner(`${lang[settings.language].attemptMessage} ${attempt}/${settings.maxAttempts}: ${lang[settings.language].openingMenu}...`, 'waiting');
            forceClick(btn);
            await new Promise(resolve => setTimeout(resolve, settings.menuOpenDelay));

            let menu = null;
            let tries = 0;
            while (tries < settings.menuCheckMaxTries && !menu) {
                menu = findAgentMenu();
                if (menu) break;
                await new Promise(resolve => setTimeout(resolve, settings.menuCheckInterval));
                if (tries === 3) forceClick(btn);
                tries++;
            }

            if (!menu) throw new Error('Agent menu not found.');

            showBanner(`${lang[settings.language].attemptMessage} ${attempt}/${settings.maxAttempts}: ${lang[settings.language].searchingAgent} "${settings.agentName}"...`, 'waiting');
            await new Promise(resolve => setTimeout(resolve, settings.preSelectionDelay));

            const agentItem = findAgentInMenu(menu);
            if (!agentItem) {
                const items = menu.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]');
                const availableAgentsList = Array.from(items)
                    .map(it => getCleanAgentName(it))
                    .filter(name => name);
                throw new Error(`Agent "${settings.agentName}" not found. Available agents: ${availableAgentsList.join(', ')}`);
            }

            showBanner(`${lang[settings.language].attemptMessage} ${attempt}/${settings.maxAttempts}: ${lang[settings.language].selectingAgent} "${settings.agentName}"...`, 'waiting');
            forceClick(agentItem);

            const cleanName = getCleanAgentName(agentItem);
            settings.agentName = cleanName;
            await GM.setValue('agentName', cleanName);
            logDebug(`Agent saved: ${cleanName}`);

            selectionDone = true;
            showBanner(`"${settings.agentName}" ${lang[settings.language].agentSelectedSuccessfully}!`, 'success');
        } catch (e) {
            selectionInProgress = false;
            logDebug(`Attempt ${attempt} failed: ${e.message}`);
            if (attempt < settings.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, settings.attemptDelay));
                await selectAgent(attempt + 1);
            } else {
                showBanner(`${lang[settings.language].failedAfterAttempts} ${settings.maxAttempts}: ${e.message}`, 'error');
            }
        }
    }

    // Start script
    function start() {
        addSettingsButton();
        setTimeout(detectAvailableAgents, 2000);

        if (!settings.agentName || settings.agentName.trim() === "") {
            if (settings.showNoAgentBanner) {
                showBanner("", "no-agent");
            }
        }

        if (!settings.agentName || settings.agentName.trim() === "") {
            logDebug("No agent configured. Automatic selection disabled.");
            return;
        }

        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key.toUpperCase() === 'M') {
                e.preventDefault();
                const popup = document.getElementById('mistralSettingsPopup');
                popup ? closePopup() : openSettingsPopup();
            }
        });

        const currentAgent = getCurrentlySelectedAgent();
        if (document.readyState === 'complete') {
            if (!currentAgent) {
                logDebug("New chat detected, attempting to select configured agent...");
                setTimeout(selectAgent, settings.initialDelay);
            } else {
                logDebug(`Agent "${currentAgent}" already active. Configuration ready for next chats.`);
                selectionDone = true;
            }
            setTimeout(checkForUpdates, 10000);
        } else {
            window.addEventListener('load', () => {
                const currentAgentOnLoad = getCurrentlySelectedAgent();
                if (!settings.agentName || settings.agentName.trim() === "") {
                    logDebug("No agent configured. Automatic selection disabled.");
                    return;
                }

                if (!currentAgentOnLoad) {
                    logDebug("New chat detected after load, attempting selection...");
                    setTimeout(selectAgent, settings.initialDelay);
                } else {
                    logDebug(`Agent "${currentAgentOnLoad}" already active. Ready for next chats.`);
                    selectionDone = true;
                }
                setTimeout(checkForUpdates, 10000);
            });
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
                            logDebug(`Manual agent change detected: "${newCurrentAgent}". Updating config for next chats.`);
                            settings.agentName = newCurrentAgent;
                            GM.setValue('agentName', newCurrentAgent);
                        }
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.closePopup = closePopup;
        GM.registerMenuCommand(lang[settings.language].configureAgentMenu, openSettingsPopup);

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
