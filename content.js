const headers = document.querySelectorAll("h1");
const h2s = document.querySelectorAll("h2");
const h3 = document.querySelectorAll("h3");
const h4 = document.querySelectorAll("h4");
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createSnapshot") {
    try {
      // Check if sidebar already exists in DOM
      const existingSidebar = document.getElementById(
        "snapshot-overlay-container",
      );
      if (existingSidebar) {
        sendResponse({
          success: false,
          message: "Snapshot mode is already active!",
        });
        return true;
      }

      const firstDiv = document.createElement("div");
      firstDiv.id = "snapshot-overlay-container"; // Add unique ID
      firstDiv.style.position = "fixed";
      firstDiv.style.top = "0";
      firstDiv.style.left = "0";
      firstDiv.style.width = "100%";
      firstDiv.style.height = "100vh";
      firstDiv.style.backgroundColor = "transparent"; // "blue" ;  // Semi-transparent overlay
      firstDiv.style.zIndex = "9999";
      firstDiv.style.display = "flex";
      firstDiv.style.flexDirection = "row";
      firstDiv.style.justifyContent = "center";
      firstDiv.style.alignItems = "center";

      const sidebar = document.createElement("div");
      sidebar.style.cssText = `
            position: fixed !important;
            border-radius: 5rem !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            left: 10px !important;
            width: 44px !important;
            height: fit-content !important;
           
            background-color: white !important;
            box-shadow: 2px 0 10px rgba(0,0,0,0.3) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 14px !important;
            z-index: 9999 !important;
            transition:  1s easeIn !important;
            overflow: hidden !important;
            border: none !important;
            box-sizing: border-box !important;
        `;

      // Use chrome.runtime.getURL for images
      const pencilIcon = chrome.runtime.getURL("images/pencil-svgrepo-com.svg");
      const erasericon = chrome.runtime.getURL("images/eraser-svgrepo-com.svg");
      const textBoxIcon = chrome.runtime.getURL(
        "images/textbox-svgrepo-com.svg",
      );
      const binIcon = chrome.runtime.getURL("images/bin_sidebar.png");
      const csIcon = chrome.runtime.getURL("images/camera-svgrepo-com.svg");
      sidebar.innerHTML = `
            <button id="pencil-btn" class="sidebar-btn" data-tool="pencil" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Use Pencil" title="Use Pencil">
                <img src="${pencilIcon}" alt="pencil" style="width: 28px; height: 28px; background-color: transparent; border: none">
            </button>
            <button id="eraser-btn" class="sidebar-btn" data-tool="eraser" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Use Eraser" title="Use Eraser">
                <img src="${erasericon}" alt="eraser" style="width: 28px; height: 28px; background-color: transparent; border: none" draggable="false">
            </button>
            <button id="textbox-btn" class="sidebar-btn" data-tool="textbox" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Add Text Box" title="Add Text Box">
                <img src="${textBoxIcon}" alt="textbox" style="width: 28px; height: 28px; background-color: transparent; border: none" draggable="false">
            </button>
            <button id="bin-btn" class="sidebar-btn" data-tool="bin" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Clear Screen" title="Clear Screen ">
                <img src="${binIcon}" alt="clear screen" style="width: 28px; height: 28px; background-color: transparent; border: none" draggable="false">
            </button>
            <button id="snapshot-btn" class="sidebar-btn" data-tool="Snapshot" style="padding: 5px; cursor: pointer; background-color: transparent; border: none;" aria-label="Click Snapshot" title="Click Snapshot">
                <img src="${csIcon}" alt="click Snapshot" style="width: 28px; height: 28px; background-color: transparent; border: none" draggable="false">
            </button>
            <hr style="width: 90%; border: 0.5px solid #ccc; margin: 10px 0;">
            <button id="open-notes-nav-btn" class="sidebar-btn" style="cursor: pointer; background-color: transparent; border: none;" aria-label="Open Notes Navigation" title="Open Notes Navigation">
            <h2 style=" cursor: pointer;  color: green; font-weight: bolder;  background-color: transparent; border: none;" draggable="false">N</h2> 
            </button>
            <button id="open-right-nav-btn" class="sidebar-btn" style="cursor: pointer; background-color: transparent; border: none;" aria-label="Open SnapShots Navigation" title="Open SnapShots Navigation">
            <h2 style=" cursor: pointer;  color: blue; font-weight: bolder;  background-color: transparent; border: none;" draggable="false">S</h2> 
            </button>
            
            <button id="close-sidebar-btn" class="sidebar-btn" data-tool="close" style=" cursor: pointer;  color: red; font-weight: bolder;  background-color: transparent; border: none;" aria-label="Close SnapShot Mode" title="Close Snapshot Mode" draggable="false">
                X
            </button>
        `;

      // Add hover animation to all sidebar buttons

      const sidebarButtons = sidebar.querySelectorAll(".sidebar-btn");

      const bottomNav = document.createElement("div");
      bottomNav.id = "notes-navigation-container";
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
            <div id="notes-list" style="text-align: left; overflow-y: hidden; max-height: 40vh; display: grid; grid-template-columns: auto auto auto;  padding: 10px;">
                
            </div>
        `;



      const rightNav = document.createElement('div');
      rightNav.id = "snapshots-navigation-container";
      rightNav.style.cssText=`
       position: fixed !important;
            top: 0 !important;
            right: -50vw !important;
            width: 50vw !important;
            height: 100vh !important;
            background-color: rgba(255, 255, 255, 0.95) !important;
            padding: 20px !important;
            text-align: center !important;
            transition: right 0.3s ease !important;
            overflow-y: auto !important;
            box-shadow: -2px 0 10px rgba(0,0,0,0.2) !important;
            z-index: 10000 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            border: none !important;
            animation: fadeIn 0.5s !important;
      `;
      rightNav.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333;">📸 Your Snapshots</h3>
                <button id="close-right-nav-btn" style="padding: 8px 15px; cursor: pointer; background-color: #f44336; color: white; border: none; border-radius: 5px; font-weight: bold;" title="Close Snapshots Panel">Close</button>
            </div>
            <div id="snapshots-list" style="text-align: left; overflow-y: auto; max-height: 85vh; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; padding: 10px;">
                
            </div>
        `;
      

      const canvasDiv = document.createElement("canvas");
      canvasDiv.id = "drawing-board";
      canvasDiv.style.width = "100%";
      canvasDiv.style.height = "100%";
      canvasDiv.style.zIndex = "8000";
      // canvasDiv.style.backgroundColor= "red";

      const startMarker = document.createElement("div");
      const endMarker = document.createElement("div");

      startMarker.style.cssText = `
        width: 100vh / 3;
        height: 1px;
        position: absolute;
        top: 0;
        right: 0;
        background-color: red;
        `;

      endMarker.style.cssText = `
        width: 100vh / 3;
        height: 1px;
        position: absolute;
        bottom: 0;
        right: 0;
        background-color: blue;
        `;

      firstDiv.appendChild(sidebar);
      firstDiv.appendChild(bottomNav);
      firstDiv.appendChild(rightNav);
      firstDiv.appendChild(canvasDiv);
      firstDiv.appendChild(startMarker);
      firstDiv.appendChild(endMarker);
      document.body.appendChild(firstDiv);

      // Create container for highlights that will be removed on close
      const highlightsContainer = document.createElement("div");
      highlightsContainer.id = "highlights-container";
      highlightsContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 7999;
      `;
      document.body.appendChild(highlightsContainer);

      // Add event listeners for opening and closing notes panel
      const openNotesBtn = document.getElementById("open-notes-nav-btn");
      const openSnapBtn = document.getElementById("open-right-nav-btn");
      const closeSnapBtn = document.getElementById("close-right-nav-btn");
      const closeNotesBtn = document.getElementById("close-notes-nav-btn");
      const closeSidebarBtn = document.getElementById("close-sidebar-btn");

      if (openNotesBtn) {
        openNotesBtn.addEventListener("click", () => {
          bottomNav.style.setProperty("bottom", "0", "important");
        });
      }

      if (closeNotesBtn) {
        closeNotesBtn.addEventListener("click", () => {
          bottomNav.style.setProperty("bottom", "-50vh", "important");
        });
      }
      
      if (openSnapBtn) {
        openSnapBtn.addEventListener("click", () => {
          rightNav.style.setProperty("right", "0", "important");
        });
      }

      if (closeSnapBtn) {
        closeSnapBtn.addEventListener("click", () => {
          rightNav.style.setProperty("right", "-50vw", "important");
        });
      }



      if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", () => {
          const container = document.getElementById(
            "snapshot-overlay-container",
          );
          if (container) {
            container.remove();
            // Remove animations stylesheet if it exists
            const animStyle = document.getElementById("snapshot-animations");
            if (animStyle) animStyle.remove();
          }
          // Remove all highlights
          const highlights = document.getElementById("highlights-container");
          if (highlights) {
            highlights.remove();
          }
        });
      }

      const sidebarPencil = chrome.runtime.getURL(
        "images/sidebar_icons/sidebar_pencil.png",
      );
      const sidebarEraser = chrome.runtime.getURL(
        "images/sidebar_icons/sidebar_eraser.png",
      );
      const sidebarTextbox = chrome.runtime.getURL(
        "images/sidebar_icons/sidebar_textbox.png",
      );

      const canvas = document.getElementById("drawing-board");
      const parentDiv = document.getElementById("snapshot-overlay-container");
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let startX,
        startY,
        isDrawing = false;
      let canvasSnapshot = null;
      let currentStrokeColor = null;
      let allNotes = []; // Store all notes as array

      // Load notes from storage on init
      chrome.storage.local.get(["allNotes"], (result) => {
        if (result.allNotes) {
          allNotes = result.allNotes;
          console.log("[NOTES] Loaded from storage:", allNotes);
          updateCards(allNotes);
        } else {
          console.log("[NOTES] No notes in storage yet");
        }
      });

      const pencilDown = (e) => {
        isDrawing = true;
        ctx.beginPath(); // Start a fresh path
        ctx.moveTo(e.offsetX, e.offsetY);
      };

      const pencilMove = (e) => {
        if (!isDrawing) return;

        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white ";
        ctx.shadowBlur = 2;
        ctx.shadowColor = "red";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.stroke();
      };

      const pencilUp = () => {
        isDrawing = false;
      };

      const textBoxDown = (e) => {
        startX = e.offsetX;
        startY = e.offsetY;
        isDrawing = true;
        canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const textBoxMove = (e) => {
        if (!isDrawing) return;
        const width = e.offsetX - startX;
        const height = e.offsetY - startY;

        // Restore canvas to previous state
        if (canvasSnapshot) {
          ctx.putImageData(canvasSnapshot, 0, 0);
        }
        // Generate random color and store it
        currentStrokeColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.8)`;
        ctx.strokeStyle = currentStrokeColor; // outline color
        ctx.strokeRect(startX, startY, width, height);
      };

      function updateCards(notesArray) {
        if (!Array.isArray(notesArray)) {
          console.log("[NOTES] Not an array or empty");
          return;
        }
        const notesList = document.getElementById("notes-list");
        if (!notesList) {
          console.log("[NOTES] notesList element not found");
          return;
        }
        console.log("[NOTES] Updating cards with", notesArray.length, "notes");
        notesList.innerHTML = "";

        notesArray.forEach((note, index) => {
          const card = document.createElement("div");
          card.style.cssText = `
      width: 100%;
      max-width: 250px;
      padding: 12px;
      margin-bottom: 10px;
      background-color: ${note.boxColor};
      color: white;
      border-radius: 5px;
      word-wrap: break-word;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-size: 13px;
      line-height: 1.3;
    `;
          card.textContent = note.content;
          notesList.appendChild(card);
         
        });
      }

      const textBoxUp = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        const width = e.offsetX - startX;
        const height = e.offsetY - startY;
        
        const rectColor = currentStrokeColor || ctx.strokeStyle;
        
        // Get current scroll position to anchor to page content, not viewport
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // Create a persistent div copy of the rectangle anchored to page content
        const rectCopy = document.createElement("div");
        rectCopy.style.cssText = `
          position: absolute;
          left: ${startX + scrollX}px;
          top: ${startY + scrollY}px;
          width: ${Math.abs(width)}px;
          height: ${Math.abs(height)}px;
          border: 3px solid ${rectColor};
          background-color: ${rectColor.replace('0.8', '0.2')};
          pointer-events: none;
          z-index: 1;
          box-sizing: border-box;
        `;
        const highlightsContainer = document.getElementById("highlights-container");
        if (highlightsContainer) {
          highlightsContainer.appendChild(rectCopy);
        }
        
        // Clear the canvas after creating the div copy
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasSnapshot = null;

        // Create form at the rectangle position
        const noteInputForm = document.createElement("form");
        noteInputForm.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 12px; color: #666; font-style: italic;">
          Press <strong>ESC</strong> to cancel
        </div>
        <textarea placeholder="Enter your note..." required style="
          width: 100%;
          min-height: 80px;
          padding: 10px;
          border: 2px solid ${rectColor};
          border-radius: 5px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          resize: vertical;
          box-sizing: border-box;
        "></textarea>
        <input type="submit" value="Add Note" style="
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          background-color: ${rectColor};
          color: white;
          border: none;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        "/>
        `;
        noteInputForm.style.cssText = `
          position: absolute;
          left: ${startX + scrollX}px;
          top: ${startY + scrollY}px;
          width: ${Math.abs(width) > 200 ? Math.abs(width) : 300}px;
          padding: 15px;
          background-color: white;
          border: 3px solid ${rectColor};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10001;
          box-sizing: border-box;
        `;
        document.body.appendChild(noteInputForm);

        // Add ESC key listener to close form
        const escapeHandler = (e) => {
          if (e.key === "Escape" || e.key === "Esc") {
            if (document.body.contains(noteInputForm)) {
              document.body.removeChild(noteInputForm);
              // Also remove the rectangle copy
              const highlightsContainer = document.getElementById("highlights-container");
              if (highlightsContainer && highlightsContainer.contains(rectCopy)) {
                highlightsContainer.removeChild(rectCopy);
              }
            }
            document.removeEventListener("keydown", escapeHandler);
          }
        };
        document.addEventListener("keydown", escapeHandler);

        noteInputForm.onsubmit = (submitE) => {
          submitE.preventDefault();
          const noteText = noteInputForm.querySelector("textarea").value;

          const newNote = {
            content: noteText,
            boxColor: rectColor,
            x: startX + scrollX,
            y: startY + scrollY,
          };

          console.log("[NOTES] Adding new note:", newNote);
          allNotes.push(newNote);
          console.log("[NOTES] All notes now:", allNotes);
          
          chrome.storage.local.set({ allNotes }, () => {
            console.log("[NOTES] Saved to storage");
          });

          updateCards(allNotes);

          document.body.removeChild(noteInputForm);
          document.removeEventListener("keydown", escapeHandler);
        };
      };



      const eraserDown = (e) => {
        isDrawing = true;
      };
      const eraserMove = (e) => {
        if (!isDrawing) return;
        ctx.clearRect(e.offsetX - 10, e.offsetY - 10, 20, 20);
      };
      const eraserUp = () => {
        isDrawing = false;
      };

      function clearListeners() {
        canvas.removeEventListener("mousedown", pencilDown);
        canvas.removeEventListener("mousemove", pencilMove);
        canvas.removeEventListener("mouseup", pencilUp);
        canvas.removeEventListener("mousedown", textBoxDown);
        canvas.removeEventListener("mousemove", textBoxMove);
        canvas.removeEventListener("mouseup", textBoxUp);
      }

      const changeCursor = (
        sidebarButtons,
        sidebarPencil,
        sidebarEraser,
        sidebarTextbox,
        startX,
        startY,
      ) => {
        sidebarButtons.forEach((button) => {
          button.addEventListener("click", () => {
            const tool = button.getAttribute("data-tool");
            switch (tool) {
              case "pencil":
                document.body.style.cursor = `url(${sidebarPencil}), auto`;
                clearListeners();
                canvas.addEventListener("mousedown", pencilDown);
                canvas.addEventListener("mousemove", pencilMove);
                canvas.addEventListener("mouseup", pencilUp);

                break;
              case "eraser":
                document.body.style.cursor = `url(${sidebarEraser}), auto`;
                clearListeners();
                canvas.addEventListener("mousedown", eraserDown);
                canvas.addEventListener("mousemove", eraserMove);
                canvas.addEventListener("mouseup", eraserUp);
                break;

              case "textbox":
                document.body.style.cursor = `url(${sidebarTextbox}), auto`;
                clearListeners();
                canvas.addEventListener("mousedown", textBoxDown);
                canvas.addEventListener("mousemove", textBoxMove);
                canvas.addEventListener("mouseup", textBoxUp);
                break;
              case "bin":
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                break;
              case "close":
                document.body.style.cursor = "default";
                break;
              default:
                document.body.style.cursor = "default";
            }
          });
        });
      };

      changeCursor(
        sidebarButtons,
        sidebarPencil,
        sidebarEraser,
        sidebarTextbox,
        startX,
        startY,
      );
      sendResponse({ success: true, message: "Snapshot sidebar created." });
    } catch (error) {
      console.error("Error creating snapshot sidebar:", error);
      sendResponse({
        success: false,
        message: "Failed to create snapshot: " + error.message,
      });
    }
  }
  return true; // Keep message channel open
});

// Event listeners are now attached directly to elements when created to avoid global click handlers
