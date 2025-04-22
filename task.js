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
            a.addEventListener('click', (e) => {
                e.preventDefault();

                noteDisplay.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p>`;
              
               
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
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
                noteDisplay.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p>`;
                notes.splice(index, 1);
                chrome.storage.local.set({ notes }, () => {
                    console.log('Note edited:', note);
                    updateMenu(notes); 
                }); 
                form.reset();
                noteTitleInput.value = note.title;
                noteContentTextarea.value = note.content;
                noteDisplay.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p>`;

            });
            li.appendChild(editBtn);

            a.className = 'note-link';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
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
});