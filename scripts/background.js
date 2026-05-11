function getCredentials() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["notionToken", "databaseId", "targetLang"], resolve);
    });
}

async function fetchTranslation(word, targetLang) {
    if (!targetLang) return "";
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word.trim())}&langpair=en%7C${targetLang}`;
        console.log("[Translation] Fetching:", url);
        const response = await fetch(url);
        if (!response.ok) {
            console.error("[Translation] HTTP error:", response.status);
            return "";
        }
        const json = await response.json();
        console.log("[Translation] Response:", json);
        const translatedText = json.responseData?.translatedText ?? "";
        console.log("[Translation] Result:", translatedText);
        return translatedText;
    } catch (err) {
        console.error("[Translation] Fetch failed:", err);
        return "";
    }
}

async function fetchWord(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error(`Word not found: ${response.status}`);
        
        const json = await response.json();
        if (!json || json.length === 0) throw new Error("Empty response");
        
        const entry = json[0];
        const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || "";
        
        const pos = [];
        const definitionBlocks = [];
        const synonyms = [];
        const antonyms = [];
        
        entry.meanings.forEach((item) => {
            const tag = item.partOfSpeech;
            pos.push(tag);
            
            const lines = [`▸ ${tag.toUpperCase()}`];
            item.definitions.forEach((def, i) => {
                lines.push(`  ${i + 1}. ${def.definition}`);
                if (def.example) {
                    lines.push(`     e.g. "${def.example}"`);
                }
            });
            definitionBlocks.push(lines.join("\n"));
            
            item.synonyms.forEach((syn) => synonyms.push(syn));
            item.antonyms.forEach((ant) => antonyms.push(ant));
        });
        
        return {
            word: entry.word,
            pronounce: audioUrl,
            pos: [...new Set(pos)].join(", "),
            definitions: definitionBlocks.join("\n\n"),
            synonyms: [...new Set(synonyms)].join(", "),
            antonyms: [...new Set(antonyms)].join(", ")
        };
    } catch (error) {
        console.error(`Couldn't find "${word}".`, error.message);
        return null;
    }
}

// 2000 character limit security
function truncate(text, max = 2000) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

// Convert dictionary data to Notion property format
function toNotionProperties(wordData) {
    return {
        word: {
            title: [{ text: { content: truncate(wordData.word, 100) } }]
        },
        translation: {
            rich_text: [{ text: { content: truncate(wordData.translation) } }]
        },
        pronounce: {
            rich_text: [{ text: { content: truncate(wordData.pronounce) } }]
        },
        part_of_speech: {
            rich_text: [{ text: { content: truncate(wordData.pos) } }]
        },
        examples: {
            rich_text: [{ text: { content: truncate(wordData.definitions) } }]
        },
        synonyms: {
            rich_text: [{ text: { content: truncate(wordData.synonyms) } }]
        },
        antonyms: {
            rich_text: [{ text: { content: truncate(wordData.antonyms) } }]
        }
    };
}

// Search for word in Notion DB, return true if found
async function wordExists(word, notionToken, databaseId) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
            filter: {
                property: 'word',
                title: { equals: word.toLowerCase() }
            },
            page_size: 1
        })
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.results && data.results.length > 0;
}

function friendlyNotionError(status, message = "") {
    if (status === 401) return "Invalid token — check your credentials.";
    if (status === 404) return "Database not found — check your Database ID.";
    if (message.includes("database_id") || message.includes("parent")) {
        return "Invalid Database ID — check your credentials.";
    }
    return "Couldn't save to Notion — check your credentials.";
}

// Add new row to Notion
async function addWord(properties, notionToken, databaseId) {
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: properties
        })
    });
    
    const data = await response.json();
    if (!response.ok) {
        console.error('Notion API error:', data);
        throw new Error(friendlyNotionError(response.status, data.message || ""));
    }
    return data;
}

// Pipeline: word → duplicate check → dictionary API → translation API → Notion
async function saveWord(word) {
    const { notionToken, databaseId, targetLang } = await getCredentials();

    if (!notionToken || !databaseId) {
        return { success: false, error: "Notion is not configured. Click the extension icon to set up your credentials." };
    }

    try {
        const exists = await wordExists(word, notionToken, databaseId);
        if (exists) {
            return { success: false, duplicate: true };
        }
    } catch (_) {
        // DB check failed - proceed anyway, don't block the save
    }

    const wordData = await fetchWord(word);
    if (!wordData) {
        return { success: false, error: `"${word}" not found in dictionary` };
    }

    wordData.translation = await fetchTranslation(word, targetLang);
    
    try {
        const properties = toNotionProperties(wordData);
        await addWord(properties, notionToken, databaseId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Create a new Notion database with the required schema under the given parent page
async function createDatabase(notionToken, pageId) {
    const response = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${notionToken}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
            parent: { type: "page_id", page_id: pageId },
            title: [{ type: "text", text: { content: "My Dictionary" } }],
            properties: {
                word:           { title: {} },
                translation:    { rich_text: {} },
                pronounce:      { rich_text: {} },
                part_of_speech: { rich_text: {} },
                examples:       { rich_text: {} },
                synonyms:       { rich_text: {} },
                antonyms:       { rich_text: {} }
            }
        })
    });

    const data = await response.json();
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Page not found — open the page in Notion and add your integration as a connection first.");
        }
        throw new Error(friendlyNotionError(response.status, data.message || ""));
    }
    return data.id;
}

// watch for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveWord") {
        saveWord(request.word).then(sendResponse);
        return true;
    }
    if (request.action === "createDatabase") {
        createDatabase(request.notionToken, request.pageId)
            .then(id => sendResponse({ success: true, databaseId: id }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});