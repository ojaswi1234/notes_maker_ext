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
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    min-height: 100%;
                    background-color: transparent;
                    z-index: 2147483640;
                    pointer-events: none;
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
                    <div id="jn-open-snapshot" title="Snapshot Tools" style="font-weight:900; color:blue; cursor:pointer; font-family:sans-serif; font-size:18px;">S</div>
                    <div id="jn-open-notes" title="View Notes" style="font-weight:900; color:green; cursor:pointer; font-family:sans-serif; font-size:18px;">N</div>
                    <div id="jn-close" title="Exit" style="font-weight:900; color:red; cursor:pointer; font-family:sans-serif; font-size:18px;">X</div>
                `;
                
                sidebar.querySelectorAll('img').forEach(img => img.style.cssText = "width:28px; cursor:pointer; transition: transform 0.2s;");
                sidebar.querySelectorAll('img').forEach(img => {
                    img.addEventListener('mouseover', () => img.style.transform = 'scale(1.2)');
                    img.addEventListener('mouseout', () => img.style.transform = 'scale(1)');
                });
                sidebar.querySelectorAll('div').forEach(div => {
                        div.addEventListener('mouseover', () => div.style.transform = 'scale(1.2)');
                        div.addEventListener('mouseout', () => div.style.transform = 'scale(1)');
                });

                // 3. Drawing Canvas - single canvas covering entire document
                const canvas = document.createElement("canvas");
                canvas.id = "jn-drawing-canvas";
                canvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                `;
                
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                
                // Update canvas to match full document size
                function updateCanvasSize() {
                    const docHeight = Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.offsetHeight,
                        window.innerHeight
                    );
                    const docWidth = Math.max(
                        document.body.scrollWidth,
                        document.documentElement.scrollWidth,
                        document.body.offsetWidth,
                        document.documentElement.offsetWidth,
                        window.innerWidth
                    );
                    
                    // Only resize if dimensions changed (to preserve drawings)
                    if (canvas.width !== docWidth || canvas.height !== docHeight) {
                        // Save current drawing
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Resize canvas
                        canvas.width = docWidth;
                        canvas.height = docHeight;
                        canvas.style.width = `${docWidth}px`;
                        canvas.style.height = `${docHeight}px`;
                        
                        // Also update overlay
                        overlay.style.width = `${docWidth}px`;
                        overlay.style.height = `${docHeight}px`;
                        
                        // Restore drawing
                        ctx.putImageData(imageData, 0, 0);
                    }
                }
                
                let isDrawing = false;
                let currentTool = null;
                let currentColor = null;
                let startX, startY;
                let savedImageData;
                
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

                // 5. Snapshot Panel (Right Sheet)
                const snapshotPanel = document.createElement("div");
                snapshotPanel.style.cssText = `
                    position: fixed;
                    right: -40vw;
                    top: 0;
                    width: 35vw;
                    min-width: 300px;
                    height: 100vh;
                    background: rgba(255,255,255,0.98);
                    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
                    transition: right 0.3s ease;
                    z-index: 2147483646;
                    padding: 20px;
                    box-sizing: border-box;
                    overflow-y: auto;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                `;
                
                // Array to store captured snapshots
                const capturedSnapshots = [];
                
                snapshotPanel.innerHTML = `
                    <div style="position: sticky; top: 0; background: rgba(255,255,255,0.98); z-index: 10; display:flex; justify-content:space-between; margin-bottom:15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                        <h2 style="margin:0; font-family:sans-serif;">Snapshot Tools</h2>
                        <button id="jn-close-snapshot-panel" style="background:red; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">Close</button>
                    </div>
                    <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:4px; padding:10px; margin-bottom:15px;">
                        <p style="margin:0; font-family:sans-serif; font-size:12px; color:#856404;">
                            <strong>⚠️ Note:</strong> Take snapshots of one website at a time. Switching websites without downloading will mix up your snapshots.
                        </p>
                    </div>
                    <div style="flex-grow: 0;">
                        <p style="margin:10px 0; font-family:sans-serif; color:#666;">Use the sidebar tools to draw, erase, or create notes on the page.</p>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            <button id="clear-drawings" style="background:#ff6b6b; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-family:sans-serif;">Clear All Drawings</button>
                            <button id="save-snapshot" style="background:#51cf66; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-family:sans-serif;">📸 Capture Snapshot</button>
                            <button id="download-stitched" style="background:#339af0; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-family:sans-serif;" disabled>⬇️ Download Stitched Snapshot (0)</button>
                            <button id="clear-snapshots" style="background:#868e96; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-family:sans-serif; font-size:12px;">🗑️ Clear All Snapshots</button>
                        </div>
                    </div>
                    <div style="margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                        <h3 style="margin:0 0 10px 0; font-family:sans-serif; font-size:14px;">Captured Snapshots:</h3>
                        <div id="jn-snapshots-grid" style="display:flex; flex-direction:column; gap:10px;"></div>
                    </div>
                    <div style="margin-top:20px; border-top:1px solid #eee; padding-top:15px; text-align:center;">
                         <a href="https://microsoftedge.microsoft.com/addons/detail/just-notes/mddmihmmmhkmllhcdjhlfhnpgjngdild" target="_blank" style="color: #0078D7; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 14px;">Rate us on Edge Add-ons (Review)</a>
                    </div>
                `;
                notesPanel.innerHTML = `
                    <div style="position: sticky; top: 0; background: rgba(255,255,255,0.98); z-index: 10; display:flex; justify-content:space-between; margin-bottom:15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                        <h2 style="margin:0; font-family:sans-serif;">Your Notes</h2>
                        <button id="jn-close-panel" style="background:red; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">Close</button>
                    </div>
                    <div style="background:#e7f5ff; border:1px solid #74c0fc; border-radius:4px; padding:10px; margin-bottom:15px;">
                        <p style="margin:0; font-family:sans-serif; font-size:12px; color:#1971c2;">
                            <strong>💡 Tip:</strong> If note text is not fully visible, you can scroll inside the note card to see the complete content.
                        </p>
                    </div>
                    <div id="jn-notes-container" style="padding-bottom: 20px; flex-grow: 1;"></div>
                    <div style="margin-top:auto; padding-top:10px; border-top:1px solid #eee; text-align:center;">
                        <a href="https://microsoftedge.microsoft.com/addons/detail/just-notes/mddmihmmmhkmllhcdjhlfhnpgjngdild" target="_blank" style="color: #0078D7; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 14px;">Rate us on Edge Add-ons (Review)</a>
                    </div>
                    <style>
                        .jn-scroll-hidden::-webkit-scrollbar { display: none; }
                        .jn-scroll-hidden { -ms-overflow-style: none; scrollbar-width: none; }
                    </style>
                `;

                overlay.appendChild(canvas);
                document.body.appendChild(overlay);
                document.body.appendChild(sidebar);
                document.body.appendChild(notesPanel);
                document.body.appendChild(snapshotPanel);

                // --- LOGIC ---
                
                // Initialize canvas size
                updateCanvasSize();
                
                // Update canvas size on scroll and resize
                let resizeTimeout;
                window.addEventListener('scroll', () => {
                    updateCanvasSize();
                }, { passive: true });
                
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        updateCanvasSize();
                    }, 100);
                });

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
                    sidebar.remove();
                    notesPanel.remove();
                    snapshotPanel.remove();
                    window.hasJustNotesInjected = false;
                    document.body.style.cursor = "default";
                });

                document.getElementById('jn-open-notes').addEventListener('click', () => {
                    loadNotes();
                    notesPanel.style.bottom = "0";
                    snapshotPanel.style.right = "-40vw"; // Close snapshot panel
                });

                document.getElementById('jn-open-snapshot').addEventListener('click', () => {
                    snapshotPanel.style.right = "0";
                    notesPanel.style.bottom = "-60vh"; // Close notes panel
                });

                document.getElementById('jn-close-panel').addEventListener('click', () => {
                    notesPanel.style.bottom = "-60vh";
                });

                document.getElementById('jn-close-snapshot-panel').addEventListener('click', () => {
                    snapshotPanel.style.right = "-40vw";
                });

                document.getElementById('clear-drawings').addEventListener('click', () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                });

                // Function to update snapshots UI
                function updateSnapshotsUI() {
                    const grid = document.getElementById('jn-snapshots-grid');
                    const downloadBtn = document.getElementById('download-stitched');
                    
                    downloadBtn.textContent = `⬇ Download Stitched Snapshot (${capturedSnapshots.length})`;
                    downloadBtn.disabled = capturedSnapshots.length === 0;
                    
                    grid.innerHTML = '';
                    if (capturedSnapshots.length === 0) {
                        grid.innerHTML = '<p style="color:#999; font-family:sans-serif; font-size:13px; text-align:center;">No snapshots yet. Click "Capture Snapshot" to start.</p>';
                        return;
                    }
                    
                    capturedSnapshots.forEach((snapshot, index) => {
                        const item = document.createElement('div');
                        item.style.cssText = `
                            position: relative;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            overflow: hidden;
                            background: #f8f9fa;
                        `;
                        item.innerHTML = `
                            <img src="${snapshot.dataUrl}" style="width:100%; display:block;" />
                            <div style="position:absolute; top:5px; right:5px; display:flex; gap:5px;">
                                <button data-index="${index}" class="jn-delete-snapshot" style="background:red; color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer; font-size:12px;">✕</button>
                            </div>
                            <div style="padding:5px; font-size:11px; color:#666; font-family:sans-serif;">
                                Snapshot #${index + 1} - ${new Date(snapshot.timestamp).toLocaleTimeString()}
                            </div>
                        `;
                        grid.appendChild(item);
                    });
                    
                    // Add delete handlers
                    grid.querySelectorAll('.jn-delete-snapshot').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const idx = parseInt(e.target.dataset.index);
                            capturedSnapshots.splice(idx, 1);
                            updateSnapshotsUI();
                        });
                    });
                }
                
                // Initialize snapshots UI
                updateSnapshotsUI();

                document.getElementById('save-snapshot').addEventListener('click', async () => {
                    // Hide ALL extension UI elements temporarily
                    sidebar.style.display = 'none';
                    snapshotPanel.style.display = 'none';
                    notesPanel.style.display = 'none';
                    overlay.style.display = 'none';
                    
                    // Get current viewport info
                    const vX = window.scrollX || window.pageXOffset;
                    const vY = window.scrollY || window.pageYOffset;
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    
                    // Wait for browser to repaint without UI elements
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Request screenshot from background script
                    chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
                        // Restore all UI elements
                        sidebar.style.display = 'flex';
                        snapshotPanel.style.display = 'flex';
                        notesPanel.style.display = 'flex';
                        overlay.style.display = 'block';
                        
                        if (response && response.imageUrl) {
                            // Create final composite canvas
                            const finalCanvas = document.createElement('canvas');
                            finalCanvas.width = vw;
                            finalCanvas.height = vh;
                            const finalCtx = finalCanvas.getContext('2d');
                            
                            // Load the screenshot
                            const img = new Image();
                            img.onload = () => {
                                // Draw the webpage screenshot
                                finalCtx.drawImage(img, 0, 0, vw, vh);
                                
                                // Overlay the drawings from our canvas (current viewport portion)
                                finalCtx.drawImage(canvas, vX, vY, vw, vh, 0, 0, vw, vh);
                                
                                // Save to snapshots array instead of downloading
                                capturedSnapshots.push({
                                    dataUrl: finalCanvas.toDataURL('image/png'),
                                    width: vw,
                                    height: vh,
                                    timestamp: Date.now()
                                });
                                updateSnapshotsUI();
                            };
                            img.src = response.imageUrl;
                        } else {
                            // Fallback: just save drawings only
                            const snapshotCanvas = document.createElement('canvas');
                            snapshotCanvas.width = vw;
                            snapshotCanvas.height = vh;
                            const snapshotCtx = snapshotCanvas.getContext('2d');
                            snapshotCtx.drawImage(canvas, vX, vY, vw, vh, 0, 0, vw, vh);
                            
                            // Save to snapshots array
                            capturedSnapshots.push({
                                dataUrl: snapshotCanvas.toDataURL('image/png'),
                                width: vw,
                                height: vh,
                                timestamp: Date.now()
                            });
                            updateSnapshotsUI();
                        }
                    });
                });
                
                // Download stitched snapshot
                document.getElementById('download-stitched').addEventListener('click', async () => {
                    if (capturedSnapshots.length === 0) return;
                    
                    // Calculate total height (stitch vertically)
                    const maxWidth = Math.max(...capturedSnapshots.map(s => s.width));
                    const totalHeight = capturedSnapshots.reduce((sum, s) => sum + s.height, 0);
                    
                    const stitchedCanvas = document.createElement('canvas');
                    stitchedCanvas.width = maxWidth;
                    stitchedCanvas.height = totalHeight;
                    const stitchedCtx = stitchedCanvas.getContext('2d');
                    
                    // Fill with white background
                    stitchedCtx.fillStyle = '#ffffff';
                    stitchedCtx.fillRect(0, 0, maxWidth, totalHeight);
                    
                    // Load and draw each snapshot
                    let currentY = 0;
                    for (const snapshot of capturedSnapshots) {
                        await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                stitchedCtx.drawImage(img, 0, currentY);
                                currentY += snapshot.height;
                                resolve();
                            };
                            img.src = snapshot.dataUrl;
                        });
                    }
                    
                    // Download the stitched image
                    const link = document.createElement('a');
                    link.download = `stitched-snapshot-${new Date().getTime()}.png`;
                    link.href = stitchedCanvas.toDataURL('image/png');
                    link.click();
                });
                
                // Clear all snapshots
                document.getElementById('clear-snapshots').addEventListener('click', () => {
                    if (capturedSnapshots.length > 0 && confirm('Clear all captured snapshots?')) {
                        capturedSnapshots.length = 0;
                        updateSnapshotsUI();
                    }
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

                // Helper function to get document coordinates from mouse event
                function getDocCoords(e) {
                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;
                    return {
                        x: e.clientX + scrollX,
                        y: e.clientY + scrollY
                    };
                }

                // Canvas Events - use document coordinates
                canvas.addEventListener('mousedown', (e) => {
                    if (!currentTool || currentTool === 'bin') return;
                    
                    // Get document coordinates (not viewport coordinates)
                    const coords = getDocCoords(e);
                    startX = coords.x;
                    startY = coords.y;
                    
                    isDrawing = true;
                    ctx.beginPath();
                    
                    if (currentTool === 'textbox') {
                        savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        // Generate random color for this selection
                        currentColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.7)`;
                    }
                });

                canvas.addEventListener('mousemove', (e) => {
                    if (!isDrawing) return;

                    const coords = getDocCoords(e);
                    const x = coords.x;
                    const y = coords.y;

                    if (currentTool === 'pencil') {
                        ctx.lineTo(x, y);
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 3;
                        ctx.shadowColor = "red";
                        ctx.shadowBlur = 5;
                        ctx.stroke();
                    } else if (currentTool === 'eraser') {
                        ctx.clearRect(x - 15, y - 15, 30, 30);
                    } else if (currentTool === 'textbox') {
                        ctx.putImageData(savedImageData, 0, 0);
                        const w = x - startX;
                        const h = y - startY;
                        ctx.strokeStyle = currentColor;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(startX, startY, w, h);
                    }
                });

                canvas.addEventListener('mouseup', (e) => {
                    if (!isDrawing) return;
                    isDrawing = false;

                    if (currentTool === 'textbox') {
                        const coords = getDocCoords(e);
                        const x = coords.x;
                        const y = coords.y;
                        
                        // Clear the selection rectangle
                        ctx.putImageData(savedImageData, 0, 0);
                        const w = x - startX;
                        const h = y - startY;
                        
                        // Re-draw the highlight permanently
                        ctx.strokeStyle = currentColor;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(startX, startY, w, h);
                        
                        // Add a light fill for the "marker" effect
                        ctx.fillStyle = currentColor.replace('0.7', '0.2'); 
                        ctx.fillRect(startX, startY, w, h);

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
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: ${Math.abs(w)}px;
                        min-width: 250px;
                        max-width: 400px;
                        background: white;
                        border: 2px solid ${currentColor};
                        padding: 15px;
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
                        // Reset tool - disable pointer events on canvas
                        canvas.style.pointerEvents = "none";
                        currentTool = null;
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
                            boxColor: `${currentColor}`,
                            sourceUrl: window.location.href
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
                    const container = document.getElementById('jn-notes-container');
                    container.innerHTML = '<p>Loading...</p>';
                    chrome.storage.local.get({ allNotes: [] }, (data) => {
                        container.innerHTML = '';
                        if (data.allNotes.length === 0) {
                            container.innerHTML = '<p style="text-align:center;">No notes found.</p>';
                            return;
                        }

                        // Group notes by date
                        const notesByDate = {};
                        // Sort by date descending
                        const sortedNotes = data.allNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
                        
                        sortedNotes.forEach(note => {
                            const dateObj = new Date(note.date);
                            const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            if (!notesByDate[dateStr]) notesByDate[dateStr] = [];
                            notesByDate[dateStr].push(note);
                        });

                        Object.keys(notesByDate).forEach(date => {
                            // Date Header
                            const dateSection = document.createElement('div');
                            dateSection.style.marginBottom = "25px";
                            
                            const header = document.createElement('div');
                            header.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <h3 style="margin:0; font-size:16px; color:#555; white-space:nowrap;">${date}</h3>
                                    <hr style="width:100%; border:0; border-top:1px solid #ddd;">
                                </div>
                            `;
                            dateSection.appendChild(header);

                            // Grid for this date
                            const dayGrid = document.createElement('div');
                            dayGrid.style.cssText = `display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;`;

                            notesByDate[date].forEach((note, noteIndex) => {
                                const card = document.createElement('div');
                                card.style.cssText = `
                                    position: relative;
                                    height: 150px;
                                    background: #f8f9fa;
                                    border-left: 5px solid ${note.boxColor || 'black'};
                                    padding: 10px;
                                    border-radius: 4px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    font-family: sans-serif;
                                    font-size: 14px;
                                    color: black;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: space-between;
                                `;

                                // Delete Button (X)
                                const deleteBtn = document.createElement('div');
                                deleteBtn.innerHTML = '✕';
                                deleteBtn.style.cssText = `
                                    position: absolute;
                                    top: 5px;
                                    right: 5px;
                                    width: 20px;
                                    height: 20px;
                                    background: red;
                                    color: white;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: bold;
                                    transition: transform 0.2s;
                                `;
                                deleteBtn.addEventListener('mouseover', () => deleteBtn.style.transform = 'scale(1.2)');
                                deleteBtn.addEventListener('mouseout', () => deleteBtn.style.transform = 'scale(1)');
                                deleteBtn.addEventListener('click', () => {
                                    if (confirm('Delete this note?')) {
                                        chrome.storage.local.get({ allNotes: [] }, (delData) => {
                                            const allNotes = delData.allNotes;
                                            // Find and remove the note
                                            const noteToDelete = allNotes.find(n => 
                                                n.content === note.content && 
                                                n.date === note.date && 
                                                n.sourceUrl === note.sourceUrl
                                            );
                                            const indexToDelete = allNotes.indexOf(noteToDelete);
                                            if (indexToDelete > -1) {
                                                allNotes.splice(indexToDelete, 1);
                                                chrome.storage.local.set({ allNotes }, () => {
                                                    loadNotes(); // Reload notes
                                                });
                                            }
                                        });
                                    }
                                });

                                // Note Content (Scrollable, hidden scrollbar)
                                const contentDiv = document.createElement('div');
                                contentDiv.className = "jn-scroll-hidden";
                                contentDiv.style.cssText = `
                                    flex-grow: 1;
                                    overflow-y: auto;
                                    margin-bottom: 8px;
                                    white-space: pre-wrap; /* Preserve line breaks */
                                    padding-right: 25px; /* Space for delete button */
                                `;
                                contentDiv.textContent = note.content;

                                // Source URL
                                const urlDiv = document.createElement('div');
                                if (note.sourceUrl) {
                                    try {
                                        const urlObj = new URL(note.sourceUrl);
                                        const hostname = urlObj.hostname;
                                        urlDiv.innerHTML = `<a href="${note.sourceUrl}" target="_blank" style="font-size:11px; color:#007bff; text-decoration:none; display:flex; align-items:center; gap:5px;">
                                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔗 ${hostname}</span>
                                        </a>`;
                                    } catch (e) {
                                        urlDiv.textContent = "";
                                    }
                                }

                                card.appendChild(deleteBtn);
                                card.appendChild(contentDiv);
                                card.appendChild(urlDiv);
                                dayGrid.appendChild(card);
                            });

                            dateSection.appendChild(dayGrid);
                            container.appendChild(dateSection);
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