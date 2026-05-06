const DATABASE_ID = "YOUR_NOTION_DATABASE_ID"  
const NOTION_TOKEN = "YOUR_NOTION_API_KEY"


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

// 2000 karakter limiti güvenliği
function truncate(text, max = 2000) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

// Dictionary verisini Notion property formatına çevir
function toNotionProperties(wordData) {
    return {
        word: {
            title: [{ text: { content: truncate(wordData.word, 100) } }]
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

// Notion'a yeni satır ekle
async function addWord(properties) {
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
            parent: { database_id: DATABASE_ID },
            properties: properties
        })
    });
    
    const data = await response.json();
    if (!response.ok) {
        console.error('Notion API error:', data);
        throw new Error(data.message || 'Notion request failed');
    }
    return data;
}

// Pipeline: kelime → dictionary API → Notion
async function saveWord(word) {
    const wordData = await fetchWord(word);
    if (!wordData) {
        return { success: false, error: `"${word}" not found in dictionary` };
    }
    
    try {
        const properties = toNotionProperties(wordData);
        await addWord(properties);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// content.js'den gelen mesajı dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveWord") {
        saveWord(request.word).then(sendResponse);
        return true;  // async response için ŞART
    }
});