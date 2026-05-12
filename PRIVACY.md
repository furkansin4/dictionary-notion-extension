# Privacy Policy – NotionDictionary

*Last updated: May 12, 2026*

**NotionDictionary does not collect, store, or share any of your personal data. Everything stays on your device and in your own Notion workspace.**

---

## What is stored locally

The extension stores the following in Chrome's sync storage (`chrome.storage.sync`), synced only across your own Chrome instances:

- **Notion Integration Token** — to authenticate with your Notion workspace.
- **Notion Database ID** — to identify the database where words are saved.
- **Translation Language Preference** — your chosen target language.

---

## Third-party services contacted

When you save a word, the extension calls these APIs on your behalf:

- **Free Dictionary API** (`dictionaryapi.dev`) — fetches the definition, pronunciation, synonyms, and antonyms.
- **MyMemory Translation API** (`mymemory.translated.net`) — fetches a translation (only if a language is selected).
- **Notion API** (`api.notion.com`) — creates the entry in your database.

No data is sent to the developer. No analytics or tracking is used.

---

## Permissions used

- **activeTab** — to read the text you select.
- **scripting** — to inject the save button when text is selected.
- **storage** — to save your Notion credentials locally.

---

## Deleting your data

Open the extension popup and click **Disconnect**. This removes all stored credentials immediately.

---

## Contact

Questions? Open an issue on the [GitHub repository](https://github.com/furkansin4/dictionary-notion-extension).
