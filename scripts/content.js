let actionButton = null;

function removeButton() {
    if (actionButton) {
        actionButton.remove();
        actionButton = null;
    }
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
    
    actionButton = document.createElement("button");
    actionButton.textContent = "📖";
    actionButton.style.cssText = `
        position: absolute;
        top: ${window.scrollY + rect.top - 35}px;
        left: ${window.scrollX + rect.left + (rect.width / 2) - 30}px;
        z-index: 999999;
        padding: 6px 12px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    
    actionButton.addEventListener("click", function (ev) {
        ev.stopPropagation();
        

        chrome.runtime.sendMessage(
            { action: "saveWord", word: selectedText },
            (response) => {
                if (response?.success) {
                    showToast(`✓ "${selectedText}" saved`);
                } else {
                    showToast(`✗ Error: ${response?.error || "Unknown"}`);
                }
            }
        );
        
        removeButton();
    });
    
    document.body.appendChild(actionButton);
});

document.addEventListener("mousedown", function (e) {
    if (actionButton && !actionButton.contains(e.target)) {
        removeButton();
    }
});


function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 10px 16px;
        border-radius: 6px;
        z-index: 999999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}