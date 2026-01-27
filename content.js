const headers = document.querySelectorAll('h1');
const h2s = document.querySelectorAll('h2');
const h3 = document.querySelectorAll('h3');
const h4 = document.querySelectorAll('h4');
/*
headers.forEach(header => {
    header.style.fontFamily = "Tahoma";
});


h2s.forEach(h2 => {
  
    h2.style.fontFamily = "papyrus";
});
h3.forEach(h3 => {
    h3.style.fontFamily = "papyrus";
}
);
h4.forEach(h4 => {
    h4.style.fontFamily = "papyrus";
});

const labels = document.querySelectorAll('label');
labels.forEach(label => {
    label.style.fontFamily = "papyrus";
});
const li = document.querySelectorAll('li');
li.forEach(li => {
    li.style.fontFamily = "papyrus";
});
const a = document.querySelectorAll('a');
a.forEach(a => {
    a.style.fontFamily = "papyrus";
});
const button = document.querySelectorAll('button');
button.forEach(button => {
    button.style.fontFamily = "papyrus";
});
const input = document.querySelectorAll('input');
input.forEach(input => {
    input.style.fontFamily = "papyrus";
});
const textarea = document.querySelectorAll('textarea');
textarea.forEach(textarea => {
    textarea.style.fontFamily = "papyrus";
});
const select = document.querySelectorAll('select');
select.forEach(select => {
    select.style.fontFamily = "papyrus";
});


const para = document.querySelectorAll('p');
para.forEach(p => {
    p.style.fontFamily = "papyrus";
});
*/





/*
const divs = document.querySelectorAll('div');
if (divs.length > 0) {
    divs.forEach(div => {
        div.style.backgroundColor = "black";
        div.style.color = "green"; 
    });
}

const para = document.querySelectorAll('p');
if (para.length > 0) {
    para.forEach(p => {
        p.style.backgroundColor = "black";
        p.style.color = "green"; 
    });
}

const btn = document.querySelectorAll('button');
if (btn.length > 0) {
    btn.forEach(button => {
        button.style.backgroundColor = "black";
        button.style.color = "green"; 
    });
}

if (headers.length > 0) {
    headers.forEach(header => {
        header.style.backgroundColor = "black";
        header.style.color = "green";
    });
}

if (h2s.length > 0) {
    h2s.forEach(h2 => {
        h2.style.backgroundColor = "black";
        h2.style.color = "cyan";
    });
}

if (h3.length > 0) {
    h3.forEach(h3 => {
        h3.style.color = "red";
    });
}

if (h4.length > 0) {
    h4.forEach(h4 => {
        h4.style.backgroundColor = "black";
        h4.style.color = "green";
    });
}

const labels = document.querySelectorAll('label');
if (labels.length > 0) {
    labels.forEach(label => {
        label.style.backgroundColor = "black";
        label.style.color = "yellow";
    });
}


*/
    
// ...existing code...

chrome.runtime.onMessage.addListener((request, sender, sendResponse, ) => {
    if (request.action === 'createSnapshot') {
        try {
            // Check if sidebar already exists in DOM
            const existingSidebar = document.getElementById('snapshot-overlay-container');
            if (existingSidebar) {
                sendResponse({ success: false, message: 'Snapshot mode is already active!' });
                return true;
            }

            // Inject CSS animations if not already present
            if (!document.getElementById('snapshot-animations')) {
                const style = document.createElement('style');
                style.id = 'snapshot-animations';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                `;
                document.head.appendChild(style);
            }

            const firstDiv = document.createElement('div');
        firstDiv.id = 'snapshot-overlay-container';  // Add unique ID
        firstDiv.style.position = 'fixed';
        firstDiv.style.top = '0';
        firstDiv.style.left = '0';
        firstDiv.style.width = "100%";
        firstDiv.style.height = "100vh";
        firstDiv.style.backgroundColor = "transparent";  // Semi-transparent overlay
        firstDiv.style.zIndex = '9999';

        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            position: fixed !important;
            border-radius: 5rem !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            left: 10px !important;
            width: 44px;
            height: fit-content;
           
            background-color: white !important;
            box-shadow: 2px 0 10px rgba(0,0,0,0.3) !important;
            display: flex !important;
            flex-direction: column ;
            align-items: center !important;
            padding: 14px !important;
            z-index: 9999 !important;
            transition:  0.3s ease !important;
            overflow: hidden !important;
            animation: fadeIn 0.5s !important;
            
            border: none !important;
            box-sizing: border-box !important;
        `;

        // Use chrome.runtime.getURL for images
        const pencilIcon = chrome.runtime.getURL('images/pencil-svgrepo-com.svg');
        const erasericon = chrome.runtime.getURL('images/eraser-svgrepo-com.svg');
        const textBoxIcon = chrome.runtime.getURL('images/textbox-svgrepo-com.svg');
        const binIcon = chrome.runtime.getURL('images/bin-svgrepo-com.svg');
        const csIcon = chrome.runtime.getURL('images/camera-svgrepo-com.svg');
        sidebar.innerHTML = `
            <button id="pencil-btn" class="sidebar-btn" data-tool="pencil" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Use Pencil" title="Use Pencil">
                <img src="${pencilIcon}" alt="pencil" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <button id="eraser-btn" class="sidebar-btn" data-tool="eraser" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Use Eraser" title="Use Eraser">
                <img src="${erasericon}" alt="eraser" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <button id="textbox-btn" class="sidebar-btn" data-tool="textbox" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Add Text Box" title="Add Text Box">
                <img src="${textBoxIcon}" alt="textbox" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <button id="bin-btn" class="sidebar-btn" data-tool="bin" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Bin" title="Bin">
                <img src="${binIcon}" alt="bin" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <button id="snapshot-btn" class="sidebar-btn" data-tool="Snapshot" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Click Snapshot" title="Click Snapshot">
                <img src="${csIcon}" alt="click Snapshot" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <hr style="width: 90%; border: 0.5px solid #ccc; margin: 10px 0;">
            <button id="open-notes-nav-btn" class="sidebar-btn" style="cursor: pointer; background-color: transparent; border: none;" aria-label="Open Notes Navigation" title="Open Notes Navigation">
            <h2 style=" cursor: pointer;  color: green; font-weight: bolder;  background-color: transparent; border: none;">N</h2> 
            </button>
            <button id="close-sidebar-btn" class="sidebar-btn" style=" cursor: pointer;  color: red; font-weight: bolder;  background-color: transparent; border: none;" aria-label="Close SnapShot Mode" title="Close Snapshot Mode">
                X
            </button>
        `;

        // Add hover animation to all sidebar buttons
       
        const sidebarButtons = sidebar.querySelectorAll('.sidebar-btn');


       

        const bottomNav = document.createElement('div');
        bottomNav.id = 'notes-navigation-container';
        bottomNav.style.cssText = `
            position: fixed !important;
            bottom: -50vh !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 50vh !important;
            background-color: rgba(255, 255, 255, 0.95) !important;
            padding: 20px !important;
            text-align: center !important;
            transition: bottom 0.3s ease !important;
            overflow-y: auto !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.2) !important;
            z-index: 10000 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            border: none !important;
            animation: fadeIn 0.5s !important;

        `;
        bottomNav.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333;">📝 Your Notes</h3>
                <button id="close-notes-nav-btn" style="padding: 8px 15px; cursor: pointer; background-color: #f44336; color: white; border: none; border-radius: 5px; font-weight: bold;" title="Close Notes Panel">Close</button>
            </div>
            <div id="notes-list" style="text-align: left;">
                <p style="color: #666; font-style: italic;">No notes yet. Start taking snapshots!</p>
            </div>
        `;

        firstDiv.appendChild(sidebar);
        firstDiv.appendChild(bottomNav);
        document.body.appendChild(firstDiv);

        // Add event listeners for opening and closing notes panel
        const openNotesBtn = document.getElementById('open-notes-nav-btn');
        const closeNotesBtn = document.getElementById('close-notes-nav-btn');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');

        if (openNotesBtn) {
            openNotesBtn.addEventListener('click', () => {
                bottomNav.style.setProperty('bottom', '0', 'important');
            });
        }

        if (closeNotesBtn) {
            closeNotesBtn.addEventListener('click', () => {
                bottomNav.style.setProperty('bottom', '-50vh', 'important');
            });
        }


        

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => {
                const container = document.getElementById('snapshot-overlay-container');
                if (container) {
                    container.remove();
                    // Remove animations stylesheet if it exists
                    const animStyle = document.getElementById('snapshot-animations');
                    if (animStyle) animStyle.remove();
                }
            });
        }
        
        
        const changeCursor = (sidebarButtons, sidebarPencil, erasericon, binIcon) => {
            sidebarButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tool = button.getAttribute('data-tool');
                    if (tool === 'pencil') {
                        document.body.style.cursor = `crosshair`;
                    } else if (tool === 'eraser') {
                        document.body.style.cursor = `cell`;
                    } else if (tool === 'textbox') {
                        document.body.style.cursor = 'text';
                    } else if (tool === 'bin') {
                        document.body.style.cursor = ``;
                    } else {
                        document.body.style.cursor = 'default';
                    }  
                });
            });
        };


        changeCursor(sidebarButtons, pencilIcon, erasericon, binIcon);
        sendResponse({ success: true , message: 'Snapshot sidebar created.'});
        
        } catch (error) {
            console.error('Error creating snapshot sidebar:', error);
            sendResponse({ success: false, message: 'Failed to create snapshot: ' + error.message });
        }
    }
    return true;  // Keep message channel open
}); 

// Event listeners are now attached directly to elements when created to avoid global click handlers