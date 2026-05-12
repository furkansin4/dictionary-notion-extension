const setupView = document.getElementById("setup-view");
const connectedView = document.getElementById("connected-view");
const tokenInput = document.getElementById("notion-token");
const dbInput = document.getElementById("database-id");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const errorMsg = document.getElementById("error-msg");
const displayToken = document.getElementById("display-token");
const displayDb = document.getElementById("display-db");
const displayLang = document.getElementById("display-lang");
const targetLangSelect = document.getElementById("target-lang-select");
const editTokenBtn = document.getElementById("edit-token-btn");
const editDbBtn = document.getElementById("edit-db-btn");
const statusBadge = document.getElementById("status-badge");
const statusText = document.getElementById("status-text");
const createDbToggle = document.getElementById("create-db-toggle");
const createDbSection = document.getElementById("create-db-section");
const pageIdInput = document.getElementById("page-id-input");
const createDbBtn = document.getElementById("create-db-btn");
const createMsg = document.getElementById("create-msg");

function maskToken(token) {
    if (!token || token.length < 10) return token;
    return token.slice(0, 7) + "••••••••" + token.slice(-4);
}

function maskDb(id) {
    if (!id || id.length < 8) return id;
    return id.slice(0, 8) + "…";
}

async function verifyNotionToken(token) {
    const response = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Notion-Version": "2022-06-28"
        }
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Invalid token");
    }
    const data = await response.json();
    return data.bot?.workspace_name || data.name || "Notion";
}

function setBadgeState(state, label) {
    statusBadge.className = "status-badge" + (state !== "ok" ? ` status-badge--${state}` : "");
    statusText.textContent = label;
}

function showConnected(token, databaseId, workspaceName) {
    displayToken.textContent = maskToken(token);
    displayDb.textContent = maskDb(databaseId);
    setBadgeState("ok", `Connected to ${workspaceName || "Notion"}`);
    setupView.style.display = "none";
    connectedView.style.display = "block";
}

function showConnectedError(token, databaseId, message) {
    displayToken.textContent = maskToken(token);
    displayDb.textContent = maskDb(databaseId);
    setBadgeState("error", message || "Check your credentials");
    setupView.style.display = "none";
    connectedView.style.display = "block";
}

function showSetup(prefillToken = "", prefillDb = "") {
    tokenInput.value = prefillToken;
    dbInput.value = prefillDb;
    errorMsg.style.display = "none";
    connectedView.style.display = "none";
    setupView.style.display = "block";
}

chrome.storage.sync.get(["notionToken", "databaseId", "workspaceName", "targetLang", "langUserSet"], ({ notionToken, databaseId, workspaceName, targetLang, langUserSet }) => {
    const lang = langUserSet ? (targetLang ?? "") : "";
    if (!langUserSet) chrome.storage.sync.set({ targetLang: "", langUserSet: false });
    targetLangSelect.value = lang;
    displayLang.textContent = targetLangSelect.options[targetLangSelect.selectedIndex]?.text || "No translation";

    if (notionToken && databaseId) {
        // Show stored state immediately, then re-verify in background
        showConnected(notionToken, databaseId, workspaceName);
        setBadgeState("verifying", "Verifying…");

        verifyNotionToken(notionToken)
            .then((name) => {
                if (name !== workspaceName) {
                    chrome.storage.sync.set({ workspaceName: name });
                }
                setBadgeState("ok", `Connected to ${name}`);
            })
            .catch(() => {
                setBadgeState("error", "Check your credentials");
            });
    } else {
        showSetup();
    }
});

targetLangSelect.addEventListener("change", () => {
    const lang = targetLangSelect.value;
    displayLang.textContent = targetLangSelect.options[targetLangSelect.selectedIndex]?.text || "No translation";
    chrome.storage.sync.set({ targetLang: lang, langUserSet: true });
});

saveBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    const dbId = dbInput.value.trim();

    if (!token || !dbId) {
        errorMsg.textContent = "Please fill in both fields.";
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.display = "none";
    saveBtn.textContent = "Verifying…";
    saveBtn.disabled = true;

    try {
        const workspaceName = await verifyNotionToken(token);
        chrome.storage.sync.set({ notionToken: token, databaseId: dbId, workspaceName }, () => {
            saveBtn.textContent = "Connect to Notion";
            saveBtn.disabled = false;
            showConnected(token, dbId, workspaceName);
        });
    } catch (err) {
        saveBtn.textContent = "Connect to Notion";
        saveBtn.disabled = false;
        errorMsg.textContent = "Invalid token — couldn't connect to Notion.";
        errorMsg.style.display = "block";
    }
});

resetBtn.addEventListener("click", () => {
    chrome.storage.sync.remove(["notionToken", "databaseId", "workspaceName"], () => {
        showSetup();
    });
});

editTokenBtn.addEventListener("click", () => {
    chrome.storage.sync.get(["notionToken", "databaseId"], ({ notionToken, databaseId }) => {
        showSetup(notionToken || "", databaseId || "");
        tokenInput.focus();
        tokenInput.select();
    });
});

editDbBtn.addEventListener("click", () => {
    chrome.storage.sync.get(["notionToken", "databaseId"], ({ notionToken, databaseId }) => {
        showSetup(notionToken || "", databaseId || "");
        dbInput.focus();
        dbInput.select();
    });
});

tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dbInput.focus();
});

dbInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
});

// Extract a Notion page ID from a raw ID or full Notion URL
function extractPageId(input) {
    const clean = input.trim();
    const uuidMatch = clean.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) return uuidMatch[0];
    const hexMatch = clean.match(/([a-f0-9]{32})(?:[^a-f0-9]|$)/i);
    if (hexMatch) return hexMatch[1];
    return clean;
}

function setCreateMsg(text, color) {
    createMsg.textContent = text;
    createMsg.style.color = color;
    createMsg.style.display = "block";
}

createDbToggle.addEventListener("click", () => {
    const isHidden = createDbSection.style.display === "none";
    createDbSection.style.display = isHidden ? "block" : "none";
    createDbToggle.textContent = isHidden
        ? "Hide"
        : "Don't have a database? Create one automatically.";
    if (isHidden) pageIdInput.focus();
});

createDbBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    const pageId = extractPageId(pageIdInput.value);

    if (!token) {
        errorMsg.textContent = "Enter your Notion token first.";
        errorMsg.style.display = "block";
        return;
    }
    if (!pageId) {
        setCreateMsg("Enter a parent page ID or URL.", "#dc2626");
        return;
    }

    createDbBtn.textContent = "Creating…";
    createDbBtn.disabled = true;
    createMsg.style.display = "none";

    chrome.runtime.sendMessage({ action: "createDatabase", notionToken: token, pageId }, (response) => {
        createDbBtn.textContent = "Create Database";
        createDbBtn.disabled = false;

        if (response.success) {
            dbInput.value = response.databaseId;
            createDbSection.style.display = "none";
            createDbToggle.textContent = "Don't have a database? Create one automatically.";
            setCreateMsg("", "");
            createMsg.style.display = "none";
        } else {
            setCreateMsg(response.error || "Failed to create database.", "#dc2626");
        }
    });
});
