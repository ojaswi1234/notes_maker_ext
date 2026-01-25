document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#note-form');
    const menu = document.querySelector('#menu');
    const noteDisplay = document.querySelector('#note-display');
    const noteTitleInput = document.querySelector('#note-title');
    const noteContentTextarea = document.querySelector('#note-content');

 
    function updateMenu(notes) {
      
        menu.innerHTML = '';
    
        notes.forEach((note, index) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = '#';
            a.textContent = note.title || `Note ${index + 1}`; 
            a.style.width = '80%';
            a.style.textAlign = 'left';

            a.addEventListener('click', (e) => {
            e.preventDefault();

            noteDisplay.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p>`;
               const downloadBtn = document.createElement('button');
               downloadBtn.textContent = 'Download';
    downloadBtn.style.marginTop = '10px';
    downloadBtn.style.backgroundColor = '#007bff';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.padding = '10px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([`Title: ${note.title}\n\nContent: ${note.content}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'note'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
    noteDisplay.appendChild(downloadBtn);
            });

            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.style.backgroundColor = 'red';
            deleteBtn.style.borderColor = 'red';
            deleteBtn.style.shadow = '0 0px 20px rgb(255, 94, 94);'
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                notes.splice(index, 1); 
                chrome.storage.local.set({ notes }, () => {
                    console.log('Note deleted:', note);
                    updateMenu(notes); 
                });
            });

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'edit-btn';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                noteTitleInput.value = note.title;
                noteContentTextarea.value = note.content;
                notes.splice(index, 1);
                chrome.storage.local.set({ notes }, () => {
                    console.log('Note edited:', note);
                    updateMenu(notes); 
                }); 
                form.reset();
                noteTitleInput.value = note.title;
                noteContentTextarea.value = note.content;

            });
            li.appendChild(editBtn);

            a.className = 'note-link';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.gap= '5px';
            li.appendChild(a);

            li.appendChild(editBtn);
           
            li.appendChild(deleteBtn); 
            
            menu.appendChild(li);
        });
    }

    
    chrome.storage.local.get({ notes: [] }, (data) => {
        updateMenu(data.notes);
    });

  
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const noteTitle = noteTitleInput.value;
        const noteContent = noteContentTextarea.value;

        const note = {
            title: noteTitle,
            content: noteContent
        };

        chrome.storage.local.get({ notes: [] }, (data) => {
            const notes = data.notes;
            notes.push(note);
            chrome.storage.local.set({ notes }, () => {
                console.log('Note saved:', note);
                form.reset();
                updateMenu(notes);

                
                noteDisplay.innerHTML = '';
            });
        });
    });

const snapshotBtn = document.querySelector('#snapshots-mode');
if (snapshotBtn) {
    snapshotBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'createSnapshot' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError.message);
                    alert('Please reload the webpage first, then try again.');
                } else if (response && !response.success) {
                    alert(response.message);  // Shows "Snapshot mode is already active!"
                } else {
                    console.log('Snapshot Mode Activated!!!');
                }
            });
        });
    });
}


   
});