(() => {
    // Prevent double-injection
    if (window.hasJustNotesInjected) return;
    window.hasJustNotesInjected = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "createSnapshot") {
            try {
                // Check if sidebar already exists
                if (document.getElementById("snapshot-overlay-container")) {
                    sendResponse({ success: false, message: "Snapshot mode is already active!" });
                    return true;
                }

                // 1. Create Main Overlay (Click-through enabled)
                const overlay = document.createElement("div");
                overlay.id = "snapshot-overlay-container";
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background-color: transparent;
                    z-index: 2147483640; /* High z-index */
                    pointer-events: none; /* KEY FIX: Allows you to scroll/click the page */
                `;

                // 2. Sidebar Logic
                const sidebar = document.createElement("div");
                sidebar.style.cssText = `
                    position: fixed !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    left: 10px !important;
                    width: 50px !important;
                    background-color: white !important;
                    box-shadow: 2px 2px 10px rgba(0,0,0,0.2) !important;
                    border-radius: 25px !important;
                    padding: 15px 5px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 15px !important;
                    z-index: 2147483647 !important;
                    pointer-events: auto; /* Enable clicks on sidebar */
                `;

                // Corrected Image Paths (Using the non-empty PNGs you uploaded)
                const icons = {
                    pencil: chrome.runtime.getURL("images/sidebar_icons/sidebar_pencil.png"),
                    eraser: chrome.runtime.getURL("images/sidebar_icons/sidebar_eraser.png"),
                    textbox: chrome.runtime.getURL("images/sidebar_icons/sidebar_textbox.png"),
                    bin: chrome.runtime.getURL("images/bin_sidebar.png")
                };

                const sidebaricons = {
                    pencil: chrome.runtime.getURL("images/pencil-svgrepo-com.svg"),
                    eraser: chrome.runtime.getURL("images/eraser-svgrepo-com.svg"),
                    textbox: chrome.runtime.getURL("images/textbox-svgrepo-com.svg"),
                    bin: chrome.runtime.getURL("images/bin-svgrepo-com.svg"),
                }

                sidebar.innerHTML = `
                    <img src="${sidebaricons.pencil}" data-tool="pencil" title="Pencil" style="width:28px; cursor:pointer; transition: transform 0.2s;">
                    <img src="${sidebaricons.eraser}" data-tool="eraser" title="Eraser" style="width:28px; cursor:pointer; transition: transform 0.2s;">
                    <img src="${sidebaricons.textbox}" data-tool="textbox" title="Add Note" style="width:28px; cursor:pointer; transition: transform 0.2s;">
                    <img src="${sidebaricons.bin}" data-tool="bin" title="Clear Screen" style="width:28px; cursor:pointer; transition: transform 0.2s;">
                    <hr style="width:80%; border:0.5px solid #ddd;">
                    <div id="jn-open-notes" title="View Notes" style="font-weight:900; color:green; cursor:pointer; font-family:sans-serif; font-size:18px;">N</div>
                    <div id="jn-close" title="Exit" style="font-weight:900; color:red; cursor:pointer; font-family:sans-serif; font-size:18px;">X</div>
                `;

                // 3. Drawing Canvas
                const canvas = document.createElement("canvas");
                canvas.id = "jn-drawing-board";
                canvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none; /* Pass through until tool selected */
                `;
                
                // 4. Notes Panel (Bottom Sheet)
                const notesPanel = document.createElement("div");
                notesPanel.style.cssText = `
                    position: fixed;
                    bottom: -60vh;
                    left: 0;
                    width: 100%;
                    height: 50vh;
                    background: rgba(255,255,255,0.98);
                    box-shadow: 0 -5px 15px rgba(0,0,0,0.1);
                    transition: bottom 0.3s ease;
                    z-index: 2147483646;
                    padding: 20px;
                    box-sizing: border-box;
                    overflow-y: auto;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                `;
                notesPanel.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h2 style="margin:0; font-family:sans-serif;">Your Notes</h2>
                        <button id="jn-close-panel" style="background:red; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">Close</button>
                    </div>
                    <div id="jn-notes-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;"></div>
                `;

                overlay.appendChild(canvas);
                overlay.appendChild(sidebar);
                document.body.appendChild(overlay);
                document.body.appendChild(notesPanel);

                // --- LOGIC ---
                const ctx = canvas.getContext("2d");
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                let isDrawing = false;
                let currentTool = null;
                let currentColor = null;
                let startX, startY;
                let savedImageData;

                // Handle Sidebar Clicks
                sidebar.querySelectorAll('img').forEach(img => {
                    img.addEventListener('click', (e) => {
                        const tool = e.target.dataset.tool;
                        activateTool(tool);
                        
                        // Visual feedback
                        sidebar.querySelectorAll('img').forEach(i => i.style.transform = 'scale(1)');
                        e.target.style.transform = 'scale(1.2)';
                    });
                });

                document.getElementById('jn-close').addEventListener('click', () => {
                    overlay.remove();
                    notesPanel.remove();
                    window.hasJustNotesInjected = false;
                });

                document.getElementById('jn-open-notes').addEventListener('click', () => {
                    loadNotes();
                    notesPanel.style.bottom = "0";
                });

                document.getElementById('jn-close-panel').addEventListener('click', () => {
                    notesPanel.style.bottom = "-60vh";
                });

                function activateTool(tool) {
                    currentTool = tool;
                    if (tool === 'bin') {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        return;
                    }

                    // Enable canvas interaction
                    canvas.style.pointerEvents = "auto";
                    
                    if (tool === 'pencil') document.body.style.cursor = `url(${icons.pencil}) 0 20, auto`;
                    else if (tool === 'eraser') document.body.style.cursor = `url(${icons.eraser}) 0 20, auto`;
                    else if (tool === 'textbox') document.body.style.cursor =  `url(${icons.textbox}) 0 20, auto`;
                }

                // Canvas Events
                canvas.addEventListener('mousedown', (e) => {
                    isDrawing = true;
                    startX = e.offsetX;
                    startY = e.offsetY;
                    ctx.beginPath();
                    
                    if (currentTool === 'textbox') {
                        savedImageData = ctx.getImageData(0,0, canvas.width, canvas.height);
                        // Generate random color for this selection
                        currentColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.7)`;
                    }
                });

                canvas.addEventListener('mousemove', (e) => {
                    if (!isDrawing) return;

                    if (currentTool === 'pencil') {
                        ctx.lineTo(e.offsetX, e.offsetY);
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 3;
                        ctx.shadowColor= "red";
                        ctx.shadowBlur = 6;
                        ctx.stroke();
                    } else if (currentTool === 'eraser') {
                        ctx.clearRect(e.offsetX - 15, e.offsetY - 15, 30, 30);
                    } else if (currentTool === 'textbox') {
                        ctx.putImageData(savedImageData, 0, 0);
                        const w = e.offsetX - startX;
                        const h = e.offsetY - startY;
                        ctx.strokeStyle = currentColor;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(startX, startY, w, h);
                    }
                });

                canvas.addEventListener('mouseup', (e) => {
                    if (!isDrawing) return;
                    isDrawing = false;

                    if (currentTool === 'textbox') {
                        // Clear the selection rectangle
                        ctx.putImageData(savedImageData, 0, 0);
                        const w = e.offsetX - startX;
                        const h = e.offsetY - startY;
                        // Prevent accidental tiny clicks
                        if (Math.abs(w) > 20 && Math.abs(h) > 20) {
                            createStickyNote(e.clientX, e.clientY, w, h);
                        }
                    }
                });

                function createStickyNote(x, y, w, h) {
                    const sticky = document.createElement("div");
                    sticky.style.cssText = `
                        position: fixed;
                        left: ${x}px;
                        top: ${y}px;
                        width: ${Math.abs(w)}px;
                        min-width: 200px;
                        background: white;
                        border: 2px solid ${currentColor};
                        padding: 10px;
                        z-index: 2147483648;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                        border-radius: 5px;
                    `;
                    
                    const textarea = document.createElement("textarea");
                    textarea.placeholder = "Type your note here...";
                    textarea.style.cssText = "width:100%; height:80px; margin-bottom:10px; font-family:sans-serif;";
                    
                    const btn = document.createElement("button");
                    btn.textContent = "Save Note";
                    btn.style.cssText = `width:100%; background:${currentColor}; color:white; border:none; padding:8px; cursor:pointer; border-radius:3px;`;

                    sticky.appendChild(textarea);
                    sticky.appendChild(btn);
                    document.body.appendChild(sticky);
                    textarea.focus();

                    // Remove sticky if clicked outside (simplified)
                    const closeHandler = (e) => {
                        if (e.key === "Escape") sticky.remove();
                    };
                    document.addEventListener('keydown', closeHandler);

                    btn.onclick = () => {
                        const content = textarea.value.trim();
                        if (content) {
                            saveNote(content);
                        }
                        sticky.remove();
                        document.removeEventListener('keydown', closeHandler);
                        // Reset tool
                        canvas.style.pointerEvents = "none";
                        document.body.style.cursor = "default";
                    };
                }

                function saveNote(content) {
                    chrome.storage.local.get({ allNotes: [] }, (data) => {
                        const notes = data.allNotes;
                        notes.push({
                            content: content,
                            title: content.substring(0, 15) + (content.length > 15 ? "..." : ""),
                            date: new Date().toISOString(),
                            boxColor: `${currentColor}`
                        });
                        chrome.storage.local.set({ allNotes: notes }, () => {
                            // Flash sidebar button green to indicate save?
                            const nBtn = document.getElementById('jn-open-notes');
                            if(nBtn) nBtn.style.color = "#00ff00";
                            setTimeout(() => nBtn.style.color = "green", 500);
                        });
                    });
                }

                function loadNotes() {
                    const grid = document.getElementById('jn-notes-grid');
                    grid.innerHTML = '<p>Loading...</p>';
                    chrome.storage.local.get({ allNotes: [] }, (data) => {
                        grid.innerHTML = '';
                        if (data.allNotes.length === 0) {
                            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No notes found.</p>';
                            return;
                        }
                        data.allNotes.forEach(note => {
                            const card = document.createElement('div');
                            card.style.cssText = `
                                background: #f8f9fa;
                                border-left: 5px solid ${note.boxColor || 'black'};
                                padding: 10px;
                                border-radius: 4px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                font-family: sans-serif;
                                font-size: 14px;
                            `;
                            card.textContent = note.content;
                            grid.appendChild(card);
                        });
                    });
                }

                sendResponse({ success: true, message: "Snapshot sidebar activated" });
            } catch (err) {
                console.error(err);
                sendResponse({ success: false, message: err.message });
            }
        }
        return true;
    });
})();