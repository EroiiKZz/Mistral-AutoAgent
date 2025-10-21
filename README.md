# Mistral AutoAgent

A **Tampermonkey** script to automatically select your preferred Mistral AI agent when the chat loads.

## Features
- Auto-selects your desired agent (e.g., Nexus, Mistral).
- Configurable via a popup menu.
- Supports dark/light themes.
- Auto-update from GitHub.

## Installation
1. Install **Tampermonkey** for your browser:
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. Install the script:
   - [Direct install (raw)](https://github.com/EroiiKZz/Mistral-AutoAgent/raw/main/mistral-autoagent.user.js)
   - Or manually add the script to Tampermonkey.

3. Configure the script (optional):
   - Open Tampermonkey, select "Mistral AI - AutoAgent", and click "Configure Mistral AI Agent".

## Configuration
- **Agent Name**: Name of the agent to auto-select.
- **Max Attempts**: Number of retry attempts.
- **Delays**: Adjust timings for menu interaction.

## Auto-Update
The script checks for updates on GitHub by default.
- To disable, set `autoUpdateEnabled` to `false` in the script (line ~20).

## License
MIT License.