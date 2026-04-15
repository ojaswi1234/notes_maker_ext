(() => {
    // Prevent double-injection
    // Optimization: Prevents the parser from running on every single keystroke.
    // It waits for 'delay' ms of silence before executing 'func'.
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

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

                // SMART INIT: Detect extremely long pages for performance scaling
                const isExtremelyLongPage = document.documentElement.scrollHeight > 10000;
                console.log(`📏 Page height: ${document.documentElement.scrollHeight}px - Performance mode: ${isExtremelyLongPage ? 'GPU-OPTIMIZED' : 'STANDARD'}`);

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

                // CONDITIONAL SETUP: Apply GPU optimizations only for extremely long pages
                if (isExtremelyLongPage) {
                    canvas.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        pointer-events: none;
                        will-change: transform;
                        transform: translateZ(0);
                        backface-visibility: hidden;
                    `;
                } else {
                    // Standard canvas for maximum text crispness
                    canvas.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        pointer-events: none;
                    `;
                }

                const ctx = canvas.getContext("2d");

                // Performance optimization for extremely long pages
                if (isExtremelyLongPage) {
                    ctx.imageSmoothingEnabled = false; // Speeds up drawing on huge bitmaps
                }

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

                // Helper function to get document coordinates from mouse event
                function getDocCoords(e) {
                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;
                    return {
                        x: e.clientX + scrollX,
                        y: e.clientY + scrollY
                    };
                }

                let isDrawing = false;
                let currentTool = null;
                let currentColor = null;
                let startX, startY;
                let savedImageData;
                let tempTextboxOverlay = null; // Temporary DOM overlay for textbox preview
                let lastNoteRect = null; // Store the last drawn rectangle for text rendering

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

                // ResizeObserver: Handles page height changes (e.g., accordions, lazy-loaded content)
                const resizeObserver = new ResizeObserver(() => {
                    if (!rafTickingForScroll) {
                        rafTickingForScroll = true;
                        requestAnimationFrame(() => {
                            updateCanvasSize();

                            // Re-evaluate performance mode if page grew significantly
                            const newHeight = document.documentElement.scrollHeight;
                            if (newHeight > 10000 && !isExtremelyLongPage) {
                                console.log('⚡ Page grew - GPU optimizations would help on next init');
                            }

                            rafTickingForScroll = false;
                        });
                    }
                });
                resizeObserver.observe(document.body);

                // Handle window resize (RAF-optimized)
                let rafTickingForResize = false;
                let rafTickingForScroll = false;

                window.addEventListener('resize', () => {
                    // Debounced resize with RAF
                    if (rafTickingForResize) return;
                    rafTickingForResize = true;

                    // Debounce: wait 150ms after last resize event
                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            updateCanvasSize();
                            rafTickingForResize = false;
                        });
                    }, 150);
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
                    // Clean up any temporary textbox overlay
                    if (tempTextboxOverlay) {
                        tempTextboxOverlay.remove();
                        tempTextboxOverlay = null;
                    }

                    // RAM ZERO EXIT STRATEGY: Force immediate GPU/RAM texture release
                    canvas.width = 0;
                    canvas.height = 0;

                    // Disconnect ResizeObserver
                    resizeObserver.disconnect();

                    // Remove all extension elements
                    overlay.remove();
                    sidebar.remove();
                    notesPanel.remove();
                    snapshotPanel.remove();

                    // Reset global state
                    window.hasJustNotesInjected = false;
                    document.body.style.cursor = "default";

                    console.log('✓ Extension closed - RAM cleared');
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

                    // Clean up any temporary textbox overlay
                    if (tempTextboxOverlay) {
                        tempTextboxOverlay.remove();
                        tempTextboxOverlay = null;
                    }

                    // Reset cursor and pointer events
                    document.body.style.cursor = 'default';
                    canvas.style.pointerEvents = 'none';
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
                    // Clean up any temporary textbox overlay
                    if (tempTextboxOverlay) {
                        tempTextboxOverlay.remove();
                        tempTextboxOverlay = null;
                    }

                    currentTool = tool;
                    if (tool === 'bin') {
                        // Clear the canvas
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Reset cursor and pointer events
                        document.body.style.cursor = 'default';
                        canvas.style.pointerEvents = 'none';

                        return;
                    }

                    // Enable canvas interaction (tool now has control)
                    canvas.style.pointerEvents = "auto";

                    if (tool === 'pencil') document.body.style.cursor = `url(${icons.pencil}) 0 20, auto`;
                    else if (tool === 'eraser') document.body.style.cursor = `url(${icons.eraser}) 0 20, auto`;
                    else if (tool === 'textbox') document.body.style.cursor = `url(${icons.textbox}) 0 20, auto`;
                }

                // Canvas Events - Drawing logic only
                canvas.addEventListener('mousedown', (e) => {
                    // Only handle drawing when a tool is active
                    if (!currentTool || currentTool === 'bin') return;

                    const coords = getDocCoords(e);
                    startX = coords.x;
                    startY = coords.y;

                    isDrawing = true;
                    ctx.beginPath();

                    if (currentTool === 'textbox') {
                        savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        // Generate random color for this selection
                        currentColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.7)`;

                        // Create temporary DOM overlay for smooth preview (no canvas redraw lag)
                        tempTextboxOverlay = document.createElement('div');
                        tempTextboxOverlay.id = 'jn-temp-textbox-overlay';
                        tempTextboxOverlay.style.cssText = `
                            position: absolute;
                            border: 2px solid ${currentColor};
                            pointer-events: none;
                            z-index: 2147483641;
                        `;
                        overlay.appendChild(tempTextboxOverlay);
                    }
                });

                canvas.addEventListener('mousemove', (e) => {
                    if (!isDrawing) return;

                    const coords = getDocCoords(e);
                    const x = coords.x;
                    const y = coords.y;

                    if (currentTool === 'pencil') {
                        // Pencil needs smooth continuous lines - direct drawing
                        ctx.lineTo(x, y);
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 3;
                        ctx.shadowColor = "red";
                        ctx.shadowBlur = 5;
                        ctx.stroke();
                    } else if (currentTool === 'eraser') {
                        // Eraser also needs to be responsive - direct erasing
                        ctx.clearRect(x - 15, y - 15, 30, 30);
                    } else if (currentTool === 'textbox' && tempTextboxOverlay) {
                        // Textbox preview: Update DOM overlay instead of canvas (eliminates lag)
                        const w = x - startX;
                        const h = y - startY;

                        // Calculate position and dimensions for the overlay
                        const left = w < 0 ? x : startX;
                        const top = h < 0 ? y : startY;
                        const width = Math.abs(w);
                        const height = Math.abs(h);

                        tempTextboxOverlay.style.left = `${left}px`;
                        tempTextboxOverlay.style.top = `${top}px`;
                        tempTextboxOverlay.style.width = `${width}px`;
                        tempTextboxOverlay.style.height = `${height}px`;
                    }
                });

                canvas.addEventListener('mouseup', (e) => {
                    if (!isDrawing) return;
                    isDrawing = false;

                    if (currentTool === 'textbox') {
                        const coords = getDocCoords(e);
                        const x = coords.x;
                        const y = coords.y;

                        // Remove the temporary overlay
                        if (tempTextboxOverlay) {
                            tempTextboxOverlay.remove();
                            tempTextboxOverlay = null;
                        }

                        const w = x - startX;
                        const h = y - startY;

                        // Draw the final highlight to canvas (once, on mouseup only)
                        ctx.strokeStyle = currentColor;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(startX, startY, w, h);

                        // Add a light fill for the "marker" effect
                        ctx.fillStyle = currentColor.replace('0.7', '0.2');
                        ctx.fillRect(startX, startY, w, h);

                        // Prevent accidental tiny clicks
                        if (Math.abs(w) > 20 && Math.abs(h) > 20) {
                            // Store rectangle info for text rendering
                            lastNoteRect = { x: startX, y: startY, w: w, h: h, color: currentColor };
                            // Pass document coordinates used for drawing, not viewport coords
                            createStickyNote(startX, startY, w, h);
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
        min-width: 300px;
        max-width: 450px;
        background: white;
        border: 2px solid ${currentColor};
        padding: 15px;
        z-index: 2147483648;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: sans-serif;
    `;

                    // 1. HEADER ROW (Title + Help Button)
                    const headerRow = document.createElement("div");
                    headerRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; cursor: grab; user-select: none; padding-bottom: 5px; border-bottom: 1px solid #f0f0f0;";

                    const label = document.createElement("span");
                    label.innerText = "Add Note";
                    label.style.fontWeight = "bold";
                    label.style.color = "#444";
                    label.style.pointerEvents = "none";

                    const helpToggle = document.createElement("button");
                    helpToggle.innerText = "? Syntax";
                    helpToggle.style.cssText = `
        background: #f0f0f0; 
        border: 1px solid #ccc; 
        padding: 2px 8px; 
        border-radius: 12px; 
        font-size: 11px; 
        cursor: pointer; 
        color: #555;
    `;

                    headerRow.appendChild(label);
                    headerRow.appendChild(helpToggle);
                    sticky.appendChild(headerRow);

                    // --- DRAG LOGIC ---
                    let isDraggingSticky = false;
                    let dragOffsetX = 0;
                    let dragOffsetY = 0;

                    headerRow.addEventListener('mousedown', (e) => {
                        if (e.target === helpToggle) return;
                        isDraggingSticky = true;
                        headerRow.style.cursor = 'grabbing';

                        const rect = sticky.getBoundingClientRect();
                        dragOffsetX = e.clientX - rect.left;
                        dragOffsetY = e.clientY - rect.top;

                        // Switch from center-aligned to fixed pixel position
                        sticky.style.transform = 'none';
                        sticky.style.left = `${rect.left}px`;
                        sticky.style.top = `${rect.top}px`;
                        sticky.style.margin = '0';
                        
                        e.preventDefault();
                    });

                    const handleDrag = (e) => {
                        if (!isDraggingSticky) return;
                        sticky.style.left = `${e.clientX - dragOffsetX}px`;
                        sticky.style.top = `${e.clientY - dragOffsetY}px`;
                    };

                    const stopDrag = () => {
                        isDraggingSticky = false;
                        headerRow.style.cursor = 'grab';
                    };

                    document.addEventListener('mousemove', handleDrag);
                    document.addEventListener('mouseup', stopDrag);

                    const cleanupListeners = () => {
                        document.removeEventListener('mousemove', handleDrag);
                        document.removeEventListener('mouseup', stopDrag);
                        document.removeEventListener('keydown', closeHandler);
                    };

                    // 2. SYNTAX HELP SECTION (Hidden by default)
                    const helpSection = document.createElement("div");
                    helpSection.style.cssText = `
        display: none; /* Hidden initially */
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        padding: 10px;
        border-radius: 5px;
        font-size: 11px;
        line-height: 1.6;
        color: #555;
    `;
                    helpSection.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            <div><code>[title]...[/title]</code> <span style="color:#888">Header</span></div>
            <div><code>!!(Text)</code> <span style="color:white; background: red; font-weight:bold;">Urgent / Important</span></div>
            <div><code>[bold]...[/bold]</code> <b>Bold</b></div>
            <div><code>[i]...[/i]</code> <i>Italic</i></div>
            <div><code>::...::</code> <mark>Highlight</mark></div>
            <div><code>---</code> <span style="color:#888">Divider</span></div>
            <div><code>-&gt;</code> <span>&#8594; Arrow</span></div>

        </div>
    `;
                    sticky.appendChild(helpSection);

                    // Toggle Logic
                    helpToggle.onclick = () => {
                        if (helpSection.style.display === "none") {
                            helpSection.style.display = "block";
                            helpToggle.style.background = "#e2e6ea";
                        } else {
                            helpSection.style.display = "none";
                            helpToggle.style.background = "#f0f0f0";
                        }
                    };

                    // 3. TEXT AREA
                    const textarea = document.createElement("textarea");
                    textarea.placeholder = "Type your note here... (Click ? for formatting)";
                    textarea.style.cssText = `
        width: 100%; 
        height: 100px; 
        padding: 8px;
        border: 1px solid #ddd; 
        border-radius: 4px; 
        font-family: 'Segoe UI', sans-serif; 
        font-size: 13px;
        resize: vertical;
        box-sizing: border-box;
    `;

                    // Auto-focus logic
                    setTimeout(() => textarea.focus(), 50);

                    // 4. SAVE BUTTON
                    const btn = document.createElement("button");
                    btn.textContent = "Save Note";
                    btn.style.cssText = `
        width: 100%; 
        background: ${currentColor}; 
        color: white; 
        border: none; 
        padding: 10px; 
        cursor: pointer; 
        border-radius: 4px; 
        font-weight: bold;
        transition: opacity 0.2s;
    `;
                    btn.onmouseover = () => btn.style.opacity = "0.9";
                    btn.onmouseout = () => btn.style.opacity = "1";

                    sticky.appendChild(textarea);
                    sticky.appendChild(btn);
                    document.body.appendChild(sticky);

                    // 5. EVENT LISTENERS

                    // Close on Escape
                    const closeHandler = (e) => {
                        if (e.key === "Escape") {
                            cleanupListeners();
                            sticky.remove();
                        }
                    };
                    document.addEventListener('keydown', closeHandler);

                    // Save Logic
                    btn.onclick = () => {
                        const content = textarea.value.trim();
                        if (content) {
                            saveNote(content, x, y, w, h);
                        }
                        cleanupListeners();
                        sticky.remove();

                        // Reset tools
                        canvas.style.pointerEvents = "none";
                        currentTool = null;
                        document.body.style.cursor = "default";
                        sidebar.querySelectorAll('img').forEach(img => img.style.transform = 'scale(1)');
                    };
                }

                // ZERO-LAG TEXT WRAPPING: Helper function for efficient text rendering
                function wrapText(context, text, x, y, maxWidth, lineHeight) {
                    const words = text.split(' ');
                    const lines = [];
                    let currentLine = '';

                    words.forEach(word => {
                        const testLine = currentLine ? currentLine + ' ' + word : word;
                        const metrics = context.measureText(testLine);
                        if (metrics.width > maxWidth && currentLine) {
                            lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    });
                    if (currentLine) lines.push(currentLine);

                    // Draw each line with high-contrast styling (fillText ONLY for performance)
                    lines.forEach((line, index) => {
                        const textY = y + (index * lineHeight);
                        context.fillText(line, x, textY, maxWidth);
                    });

                    return lines.length; // Return number of lines drawn
                }

                function saveNote(content, docX, docY, w, h) {
                    // Note: Text is NOT drawn on canvas - only the highlight box is visible
                    // Text is saved to notes panel only
                    if (lastNoteRect) {
                        lastNoteRect = null; // Clear after use
                    }

                    // Save to storage (for Notes Panel view only - no geometry needed)
                    chrome.storage.local.get({ allNotes: [] }, (data) => {
                        const notes = data.allNotes;

                        notes.push({
                            id: Math.random().toString(36).substr(2, 9),
                            content: content,
                            title: content.substring(0, 15) + (content.length > 15 ? "..." : ""),
                            date: new Date().toISOString(),
                            boxColor: `${currentColor}`,
                            sourceUrl: window.location.href
                        });

                        chrome.storage.local.set({ allNotes: notes }, () => {
                            console.log('✓ Note saved and drawn on canvas');

                            // Flash sidebar button green to indicate save
                            const nBtn = document.getElementById('jn-open-notes');
                            if (nBtn) nBtn.style.color = "#00ff00";
                            setTimeout(() => nBtn.style.color = "green", 500);
                        });
                    });
                }


                function escapeHtml(text) {
                    return text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                }


                function formatNotes(content) {
                    try {
                        // 1. ESCAPE HTML (Security First)
                        let html = escapeHtml(content);

                        // 2. BLOCK LEVEL REPLACEMENTS

                        // Pattern: !!! Urgent Header !!!
                        // Fix: Ensure it captures the rest of the line correctly
                        html = html.replace(/^!!! (.*$)/gm, '<h1 class="note-urgent" style="color:red; font-weight:bold; font-size:1.5em; border-bottom:2px solid red;">$1</h1>');

                        // Pattern: [title] ... [/title]
                        // Fix: Use [\s\S]*? to allow titles to potentially span lines (though usually single line)
                        html = html.replace(/\[title\]([\s\S]*?)\[\/title\]/g, '<div class="note-title" style="font-size:1.2em; font-weight:bold; margin-bottom:10px;">$1</div>');

                        // Pattern: --- (Divider)
                        // Fix: Ensure it matches a line that ONLY contains ---
                        html = html.replace(/^---$/gm, '<hr style="border:0; border-top:1px solid #ccc; margin:10px 0;">');

                        // 3. INLINE REPLACEMENTS

                        // Pattern: [bold]...[/bold]
                        html = html.replace(/\[bold\]([\s\S]*?)\[\/bold\]/g, '<strong>$1</strong>');

                        // Pattern: !!(text) - Red tag
                        html = html.replace(/!!\(([^)]*?)\)/g, '<span class="note-tag" style="background:red; color: white; padding:2px 6px; border-radius:3px; margin:0 2px;">$1</span>');

                        // Pattern: [i]...[/i] (Italic)
                        html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<em>$1</em>');

                        // Pattern: :: Highlight ::
                        html = html.replace(/::([\s\S]*?)::/g, '<mark style="background:#fff3cd; padding:0 2px;">$1</mark>');

                        // Pattern: -> (Arrow Symbol)
                        html = html.replace(/->/g, '&#8594;');

                        // 4. PRESERVE LINE BREAKS
                        // Since we are replacing content, standard \n might get lost in rendering if not handled.
                        // We replace remaining newlines with <br> for HTML rendering.
                        html = html.replace(/\n/g, '<br>');

                        return html;

                    } catch (err) {
                        console.error("Error formatting note!!! " + err.message);
                        return content; // Fallback to raw content on error
                    }
                }


                function editNote(id) {
                    try {
                        // Prevent multiple edit modals
                        const existingModal = document.getElementById('jn-edit-modal');
                        if (existingModal) existingModal.remove();

                        chrome.storage.local.get({ allNotes: [] }, (data) => {
                            const note = data.allNotes.find(n => n.id === id);
                            if (note) {
                                const editModal = document.createElement('div');
                                editModal.id = 'jn-edit-modal';
                                editModal.style.cssText = `
                                    position: fixed;
                                    left: 50%;
                                    top: 50%;
                                    transform: translate(-50%, -50%);
                                    width: 80%;
                                    max-width: 500px;
                                    background: white;
                                    border: 2px solid ${note.boxColor || '#007bff'};
                                    border-radius: 12px;
                                    padding: 0;
                                    z-index: 2147483651;
                                    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                                    overflow: hidden;
                                `;

                                const title = document.createElement('div');
                                title.textContent = 'Edit Note';
                                title.style.cssText = `
                                    margin: 0;
                                    background: #f8f9fa;
                                    color: #333;
                                    cursor: grab;
                                    user-select: none;
                                    padding: 15px 20px;
                                    border-bottom: 1px solid #eee;
                                    font-weight: 600;
                                    font-size: 16px;
                                    display: flex;
                                    align-items: center;
                                `;

                                // --- DRAG LOGIC FOR EDIT MODAL ---
                                let isDraggingEdit = false;
                                let dragOffsetX = 0;
                                let dragOffsetY = 0;

                                title.addEventListener('mousedown', (e) => {
                                    isDraggingEdit = true;
                                    title.style.cursor = 'grabbing';

                                    const rect = editModal.getBoundingClientRect();
                                    dragOffsetX = e.clientX - rect.left;
                                    dragOffsetY = e.clientY - rect.top;

                                    editModal.style.transform = 'none';
                                    editModal.style.left = `${rect.left}px`;
                                    editModal.style.top = `${rect.top}px`;
                                    editModal.style.margin = '0';
                                    
                                    e.preventDefault();
                                });

                                const handleEditDrag = (e) => {
                                    if (!isDraggingEdit) return;
                                    editModal.style.left = `${e.clientX - dragOffsetX}px`;
                                    editModal.style.top = `${e.clientY - dragOffsetY}px`;
                                };

                                const stopEditDrag = () => {
                                    isDraggingEdit = false;
                                    title.style.cursor = 'grab';
                                };

                                document.addEventListener('mousemove', handleEditDrag);
                                document.addEventListener('mouseup', stopEditDrag);

                                const cleanupEditListeners = () => {
                                    document.removeEventListener('mousemove', handleEditDrag);
                                    document.removeEventListener('mouseup', stopEditDrag);
                                    document.removeEventListener('keydown', escHandler);
                                };

                                const contentArea = document.createElement('div');
                                contentArea.style.padding = '20px';

                                const textarea = document.createElement('textarea');
                                textarea.value = note.content;
                                textarea.placeholder = "Enter your note content...";
                                textarea.style.cssText = `
                                    width: 100%;
                                    height: 250px;
                                    font-family: inherit;
                                    font-size: 14px;
                                    padding: 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    resize: vertical;
                                    margin-bottom: 15px;
                                    box-sizing: border-box;
                                    outline: none;
                                    transition: border-color 0.2s;
                                `;
                                textarea.onfocus = () => textarea.style.borderColor = note.boxColor || '#007bff';
                                textarea.onblur = () => textarea.style.borderColor = '#ddd';

                                const buttonContainer = document.createElement('div');
                                buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

                                const saveBtn = document.createElement('button');
                                saveBtn.textContent = 'Save Changes';
                                saveBtn.style.cssText = `
                                    background: ${note.boxColor || '#28a745'};
                                    color: white;
                                    border: none;
                                    padding: 10px 20px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: 600;
                                    transition: opacity 0.2s;
                                `;
                                saveBtn.onmouseover = () => saveBtn.style.opacity = '0.9';
                                saveBtn.onmouseout = () => saveBtn.style.opacity = '1';

                                saveBtn.onclick = () => {
                                    const updatedContent = textarea.value.trim();
                                    if (updatedContent) {
                                        chrome.storage.local.get({ allNotes: [] }, (data) => {
                                            const allNotes = data.allNotes;
                                            const noteIndex = allNotes.findIndex(n => n.id === id);
                                            if (noteIndex > -1) {
                                                allNotes[noteIndex].content = updatedContent;
                                                allNotes[noteIndex].title = updatedContent.substring(0, 15) + (updatedContent.length > 15 ? "..." : "");
                                                chrome.storage.local.set({ allNotes }, () => {
                                                    console.log('✓ Note updated');
                                                    cleanupEditListeners();
                                                    editModal.remove();
                                                    loadNotes();
                                                });
                                            }
                                        });
                                    } else {
                                        alert('Note cannot be empty!');
                                    }
                                };

                                const cancelBtn = document.createElement('button');
                                cancelBtn.textContent = 'Cancel';
                                cancelBtn.style.cssText = `
                                    background: #f8f9fa;
                                    color: #6c757d;
                                    border: 1px solid #ddd;
                                    padding: 10px 20px;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: 600;
                                    transition: background 0.2s;
                                `;
                                cancelBtn.onmouseover = () => cancelBtn.style.background = '#e9ecef';
                                cancelBtn.onmouseout = () => cancelBtn.style.background = '#f8f9fa';

                                cancelBtn.onclick = () => {
                                    cleanupEditListeners();
                                    editModal.remove();
                                };

                                buttonContainer.appendChild(cancelBtn);
                                buttonContainer.appendChild(saveBtn);

                                contentArea.appendChild(textarea);
                                contentArea.appendChild(buttonContainer);

                                editModal.appendChild(title);
                                editModal.appendChild(contentArea);
                                document.body.appendChild(editModal);

                                textarea.focus();

                                // Close on Escape key
                                const escHandler = (e) => {
                                    if (e.key === 'Escape') {
                                        cleanupEditListeners();
                                        editModal.remove();
                                    }
                                };
                                document.addEventListener('keydown', escHandler);
                            }
                        });
                    } catch (err) {
                        alert("Error editing note: " + err.message);
                    }
                }

                function getNotes(id) {
                    try {
                        // Prevent multiple modals
                        const existingModal = document.getElementById('jn-note-modal');
                        if (existingModal) existingModal.remove();

                        chrome.storage.local.get({ allNotes: [] }, (data) => {
                            const note = data.allNotes.find(n => n.id === id);
                            if (note) {
                                const noteDisplayBox = document.createElement('div');
                                noteDisplayBox.id = 'jn-note-modal'; // ID for singleton control
                                noteDisplayBox.style.cssText = `
                                    position: fixed;
                                    left: 50%;
                                    top: 50%;
                                    transform: translate(-50%, -50%);
                                    width: 80%;
                                    max-width: 600px;
                                    max-height: 80vh;
                                    background: white;
                                    border: 2px solid ${note.boxColor || '#007bff'};
                                    border-radius: 12px;
                                    padding: 30px;
                                    z-index: 2147483650;
                                    box-shadow: 0 15px 40px rgba(0,0,0,0.2);
                                    display: flex;
                                    flex-direction: column;
                                    font-family: 'Segoe UI', system-ui, sans-serif;
                                `;

                                // Close Button
                                const closeBtn = document.createElement('button');
                                closeBtn.innerHTML = '✕';
                                closeBtn.style.cssText = `
                                    position: absolute;
                                    top: 15px;
                                    right: 15px;
                                    background: #f8f9fa;
                                    border: 1px solid #eee;
                                    border-radius: 50%;
                                    width: 30px;
                                    height: 30px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 16px;
                                    cursor: pointer;
                                    color: #666;
                                    transition: all 0.2s;
                                `;
                                closeBtn.onmouseover = () => {
                                    closeBtn.style.background = '#ff6b6b';
                                    closeBtn.style.color = 'white';
                                };
                                closeBtn.onmouseout = () => {
                                    closeBtn.style.background = '#f8f9fa';
                                    closeBtn.style.color = '#666';
                                };
                                closeBtn.onclick = () => noteDisplayBox.remove();

                                // Content Container
                                const contentDiv = document.createElement('div');
                                contentDiv.className = 'jn-scroll-hidden';
                                contentDiv.style.cssText = `
                                    width: 100%;
                                    overflow-y: auto;
                                    font-size: 16px;
                                    line-height: 1.6;
                                    color: #333;
                                `;

                                // FORMAT THE CONTENT
                                contentDiv.innerHTML = formatNotes(note.content);

                                noteDisplayBox.appendChild(closeBtn);
                                noteDisplayBox.appendChild(contentDiv);
                                document.body.appendChild(noteDisplayBox);

                                // Close on click outside
                                const closeHandler = (e) => {
                                    if (!noteDisplayBox.contains(e.target)) {
                                        noteDisplayBox.remove();
                                        document.removeEventListener('mousedown', closeHandler);
                                    }
                                };
                                // Use setTimeout to avoid immediate trigger from the click that opened it
                                setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);
                            }
                        });
                    } catch (err) {
                        alert("Error retrieving note: " + err.message);
                    }
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
                                    cursor: pointer;
                                `;
                                card.onclick = () => {
                                    getNotes(note.id);
                                }

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
                                deleteBtn.addEventListener('click', (e) => {
                                    e.stopPropagation(); // Prevent card click
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

                                // Edit Button (✎)
                                const editBtn = document.createElement('div');
                                editBtn.innerHTML = '✎';
                                editBtn.style.cssText = `
                                    position: absolute;
                                    top: 5px;
                                    right: 30px;
                                    width: 20px;
                                    height: 20px;
                                    background: #007bff;
                                    color: white;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: bold;
                                    transition: transform 0.2s;
                                `;
                                editBtn.addEventListener('mouseover', () => editBtn.style.transform = 'scale(1.2)');
                                editBtn.addEventListener('mouseout', () => editBtn.style.transform = 'scale(1)');
                                editBtn.addEventListener('click', (e) => {
                                    e.stopPropagation(); // Prevent card click
                                    editNote(note.id);
                                });

                                // Download Button (⬇)
                                const downloadBtn = document.createElement('div');
                                downloadBtn.innerHTML = '⬇';
                                downloadBtn.title = "Download Note";
                                downloadBtn.style.cssText = `
                                    position: absolute;
                                    top: 5px;
                                    right: 55px;
                                    width: 20px;
                                    height: 20px;
                                    background: #28a745;
                                    color: white;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: bold;
                                    transition: transform 0.2s;
                                `;
                                downloadBtn.addEventListener('mouseover', () => downloadBtn.style.transform = 'scale(1.2)');
                                downloadBtn.addEventListener('mouseout', () => downloadBtn.style.transform = 'scale(1)');
                                downloadBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    
                                    // Strip formatting tags for download
                                    let cleanContent = note.content
                                        .replace(/\[title\]/g, "")
                                        .replace(/\[\/title\]/g, "\n")
                                        .replace(/\[bold\]/g, "")
                                        .replace(/\[\/bold\]/g, "")
                                        .replace(/\[i\]/g, "")
                                        .replace(/\[\/i\]/g, "")
                                        .replace(/::/g, "")
                                        .replace(/^!!! /gm, "")
                                        .replace(/^---$/gm, "__________")
                                        .replace(/->/g, "→");

                                    const blob = new Blob([cleanContent], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `note-${note.id}.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
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
                                card.appendChild(editBtn);
                                card.appendChild(downloadBtn);
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