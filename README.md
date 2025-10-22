# Mistral AutoAgent

**A Tampermonkey script to auto-select your preferred Mistral AI agent on chat load.**

✨ **Smart, lightweight, and customizable.**

---

## **Features**
- **Auto-selection**: Automatically selects your configured agent (e.g., Nexus, Mistral).
- **Popup UI**: Configure settings via a sleek popup menu (`Shift + M` shortcut).
- **Theme-aware**: Adapts to Mistral's dark/light themes.
- **Auto-update**: Checks for updates on GitHub.
- **Multi-language**: Supports **French** and **English**.
- **Debug mode**: Enable logs for troubleshooting.

---

## **Installation**
1. **Install Tampermonkey** for your browser:
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **Install the script**:
   - **[Direct install (raw)](https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js)**
     *(Recommended: Auto-updates enabled.)*
   - Or manually add the script to Tampermonkey.

3. **Configure** (optional):
   - Click the **⚙️ settings button** in Mistral's chat UI (bottom-right).
   - Or press **`Shift + M`** to open the settings popup.

---

## **Configuration Options**
| Option                     | Description                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| **Agent Name**             | Name of the agent to auto-select (e.g., `Nexus`).                          |
| **Max Attempts**           | Number of retries if selection fails (default: `3`).                       |
| **Delays**                 | Adjust timings for menu interactions (ms).                                  |
| **Show Banners**           | Toggle success/error notifications.                                         |
| **Language**               | Switch between **French** and **English**.                                  |
| **Debug Mode**             | Enable console logs for troubleshooting.                                    |

---

## **How It Works**
1. On chat load, the script checks if an agent is already selected.
2. If not, it opens the agent menu and selects your configured agent.
3. If the agent isn’t found, it retries (configurable attempts).
4. Settings persist across sessions via `GM.setValue`.

---

## **Manual Update**
- The script checks for updates automatically.
- To force an update, reinstall the [latest version](https://raw.githubusercontent.com/EroiiKZz/Mistral-AutoAgent/main/mistral-autoagent.user.js).

---

## **License**
MIT License.