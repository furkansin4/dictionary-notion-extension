let actionButton = null;

function removeButton() {
    if (actionButton) {
        actionButton.remove();
        actionButton = null;
    }
}

function showNotification(type, word) {
    const configs = {
        success: {
            iconUrl: chrome.runtime.getURL("images/check.png"),
            title: "Saved to Notion",
            description: `"${word}" was added to your vocabulary list.`,
            background: "#ffffff",
            border: "#d1fae5",
            titleColor: "#065f46",
            descColor: "#374151",
        },
        duplicate: {
            iconUrl: chrome.runtime.getURL("images/warning.png"),
            title: "Already in your list",
            description: `"${word}" is already saved in your Notion.`,
            background: "#ffffff",
            border: "#fde68a",
            titleColor: "#92400e",
            descColor: "#374151",
        },
        error: {
            iconUrl: chrome.runtime.getURL("images/close.png"),
            title: "Something went wrong",
            description: word,
            background: "#ffffff",
            border: "#fecaca",
            titleColor: "#991b1b",
            descColor: "#374151",
        },
    };

    const cfg = configs[type] || configs.error;

    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999999;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: ${cfg.background};
        border: 1.5px solid ${cfg.border};
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        max-width: 300px;
        min-width: 220px;
    `;

    if (cfg.iconUrl) {
        const icon = document.createElement("img");
        icon.src = cfg.iconUrl;
        icon.style.cssText = `
            width: 28px;
            height: 28px;
            object-fit: contain;
            flex-shrink: 0;
        `;
        toast.appendChild(icon);
    }

    const textWrap = document.createElement("div");
    textWrap.style.cssText = `display: flex; flex-direction: column; gap: 2px;`;

    const title = document.createElement("span");
    title.textContent = cfg.title;
    title.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: ${cfg.titleColor};
        line-height: 1.3;
    `;

    const desc = document.createElement("span");
    desc.textContent = cfg.description;
    desc.style.cssText = `
        font-size: 12px;
        color: ${cfg.descColor};
        line-height: 1.4;
        opacity: 0.85;
    `;

    textWrap.appendChild(title);
    textWrap.appendChild(desc);
    toast.appendChild(textWrap);
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    let dismissTimer;
    let isHovered = false;

    function startDismiss() {
        dismissTimer = setTimeout(() => {
            if (isHovered) return;
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)";
            setTimeout(() => toast.remove(), 280);
        }, 2600);
    }

    toast.addEventListener("mouseenter", () => {
        isHovered = true;
        clearTimeout(dismissTimer);
    });

    toast.addEventListener("mouseleave", () => {
        isHovered = false;
        startDismiss();
    });

    startDismiss();
}

document.addEventListener("mouseup", function (e) {
    if (actionButton && actionButton.contains(e.target)) return;
    removeButton();

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) return;
    if (selectedText.split(/\s+/).length > 3) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const notionIconUrl = chrome.runtime.getURL("images/bookmark.png");
    const dictIconUrl = chrome.runtime.getURL("images/dictionary.png");

    // Container
    actionButton = document.createElement("div");
    actionButton.style.cssText = `
        position: absolute;
        top: ${window.scrollY + rect.top - 56}px;
        left: ${window.scrollX + rect.left + rect.width / 2 - 46}px;
        z-index: 999999;
        display: flex;
        gap: 2px;
        align-items: center;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        padding: 5px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.07);
        opacity: 0;
        transform: translateY(-5px) scale(0.94);
        transition: opacity 0.15s ease, transform 0.15s ease;
    `;

    function createIconButton(iconUrl, label) {
        const btn = document.createElement("button");
        btn.title = label;
        btn.style.cssText = `
            width: 36px;
            height: 36px;
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.12s ease, transform 0.12s ease;
            padding: 0;
            flex-shrink: 0;
            outline: none;
        `;
        const img = document.createElement("img");
        img.src = iconUrl;
        img.style.cssText = `
            width: 18px;
            height: 18px;
            object-fit: contain;
            display: block;
            pointer-events: none;
        `;
        btn.appendChild(img);
        btn.addEventListener("mouseenter", () => {
            btn.style.background = "#f4f4f5";
            btn.style.transform = "scale(1.1)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.background = "transparent";
            btn.style.transform = "scale(1)";
        });
        btn.addEventListener("mousedown", () => {
            btn.style.transform = "scale(0.94)";
        });
        btn.addEventListener("mouseup", () => {
            btn.style.transform = "scale(1.1)";
        });
        return btn;
    }

    const divider = document.createElement("div");
    divider.style.cssText = `
        width: 1px;
        height: 18px;
        background: rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
        margin: 0 3px;
        border-radius: 1px;
    `;

    const notionBtn = createIconButton(notionIconUrl, "Save to Notion");
    notionBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        chrome.runtime.sendMessage(
            { action: "saveWord", word: selectedText },
            (response) => {
                if (response?.success) {
                    showNotification("success", selectedText);
                } else if (response?.duplicate) {
                    showNotification("duplicate", selectedText);
                } else {
                    showNotification("error", response?.error || "Unknown error");
                }
            }
        );
        removeButton();
    });

    const cambridgeBtn = createIconButton(dictIconUrl, "Open in Cambridge Dictionary");
    cambridgeBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(selectedText)}`;
        window.open(url, "_blank");
        removeButton();
    });

    actionButton.appendChild(notionBtn);
    actionButton.appendChild(divider);
    actionButton.appendChild(cambridgeBtn);
    document.body.appendChild(actionButton);

    requestAnimationFrame(() => {
        actionButton.style.opacity = "1";
        actionButton.style.transform = "translateY(0) scale(1)";
    });
});

document.addEventListener("mousedown", function (e) {
    if (actionButton && !actionButton.contains(e.target)) {
        removeButton();
    }
});