document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let releaseNotes = [];
    let selectedNoteIds = new Set();
    let currentFilter = 'all';
    let searchQuery = '';

    // --- DOM Elements ---
    const refreshBtn = document.getElementById('refresh-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const retryBtn = document.getElementById('retry-btn');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    const loadingFeed = document.getElementById('loading-feed');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const notesFeed = document.getElementById('notes-feed');

    const shareDrawer = document.getElementById('share-drawer');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetBtn = document.getElementById('tweet-btn');
    const toastContainer = document.getElementById('toast-container');

    // --- API Calls ---
    async function fetchNotes(forceRefresh = false) {
        showLoadingState();
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const url = forceRefresh ? '/api/notes?refresh=true' : '/api/notes';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            releaseNotes = data.notes;
            
            // Set last updated time
            if (data.last_fetched) {
                lastUpdatedSpan.textContent = `Updated: ${data.last_fetched}`;
            } else {
                lastUpdatedSpan.textContent = 'Updated just now';
            }

            if (data.warning) {
                showToast(data.warning, 'error');
            } else if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }

            // Reset selection upon refresh
            selectedNoteIds.clear();
            updateShareDrawer();
            
            renderNotes();
        } catch (error) {
            console.error('Error fetching notes:', error);
            showErrorState(error.message);
        } finally {
            refreshBtn.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // --- State & Rendering Control ---
    function showLoadingState() {
        loadingFeed.style.display = 'grid';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        notesFeed.style.display = 'none';
    }

    function showErrorState(message) {
        loadingFeed.style.display = 'none';
        errorState.style.display = 'flex';
        errorMessage.textContent = message || 'An error occurred while communicating with the server.';
        emptyState.style.display = 'none';
        notesFeed.style.display = 'none';
    }

    function renderNotes() {
        loadingFeed.style.display = 'none';
        
        // Filter logic
        const filteredNotes = releaseNotes.filter(note => {
            const matchesType = currentFilter === 'all' || note.type.toLowerCase() === currentFilter.toLowerCase();
            const matchesSearch = searchQuery === '' || 
                note.content_text.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });

        if (filteredNotes.length === 0) {
            emptyState.style.display = 'flex';
            notesFeed.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        notesFeed.style.display = 'grid';
        notesFeed.innerHTML = '';

        filteredNotes.forEach(note => {
            const isSelected = selectedNoteIds.has(note.id);
            const card = document.createElement('div');
            card.className = `note-card ${isSelected ? 'selected' : ''}`;
            card.dataset.id = note.id;

            // Build Badge Class
            const typeClass = `badge-${note.type.toLowerCase()}`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="date-group">
                        <div class="custom-checkbox"></div>
                        <span class="card-date">${note.date}</span>
                    </div>
                    <span class="badge ${typeClass}">${note.type}</span>
                </div>
                <div class="card-body">
                    ${note.content_html}
                </div>
                <div class="card-footer">
                    <a href="${note.link}" class="card-link" target="_blank" rel="noopener noreferrer">
                        <span>Original Feed Link</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                    <div class="card-actions">
                        <button class="copy-action-btn" title="Copy update text" data-copy-id="${note.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <button class="tweet-action-btn" title="Tweet this update only" data-tweet-id="${note.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Make sure all generated links within the body open in a new tab
            const links = card.querySelectorAll('.card-body a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                // Stop propagation when links are clicked to avoid toggling card selection
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });

            // Card click to toggle selection (except footer actions)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-footer') || e.target.closest('a')) {
                    return;
                }
                toggleSelection(note.id);
            });

            // Individual tweet button click handler
            const cardTweetBtn = card.querySelector('.tweet-action-btn');
            cardTweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Clear other selections and select only this one
                selectedNoteIds.clear();
                selectedNoteIds.add(note.id);
                
                // Update selection state UI for all cards
                document.querySelectorAll('.note-card').forEach(c => {
                    if (c.dataset.id === note.id) {
                        c.classList.add('selected');
                    } else {
                        c.classList.remove('selected');
                    }
                });

                updateShareDrawer();
                tweetTextarea.focus();
            });

            // Individual copy button click handler
            const cardCopyBtn = card.querySelector('.copy-action-btn');
            cardCopyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const copyText = `[${note.date}] ${note.type}: ${note.content_text}`;
                navigator.clipboard.writeText(copyText).then(() => {
                    showToast('Copied update to clipboard!', 'success');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast('Failed to copy text.', 'error');
                });
            });

            notesFeed.appendChild(card);
        });
    }

    function toggleSelection(noteId) {
        if (selectedNoteIds.has(noteId)) {
            selectedNoteIds.delete(noteId);
        } else {
            selectedNoteIds.add(noteId);
        }
        
        // Find card element and toggle class
        const card = document.querySelector(`.note-card[data-id="${noteId}"]`);
        if (card) {
            card.classList.toggle('selected');
        }
        
        updateShareDrawer();
    }

    // --- Tweet Composer Logic ---
    function updateShareDrawer() {
        const count = selectedNoteIds.size;
        selectedCountSpan.textContent = count;

        if (count > 0) {
            shareDrawer.classList.add('open');
            
            // Get selected note data
            const selectedNotes = releaseNotes.filter(n => selectedNoteIds.has(n.id));
            const tweetContent = composeTweetText(selectedNotes);
            tweetTextarea.value = tweetContent;
            
            updateCharCounter(tweetContent.length);
        } else {
            shareDrawer.classList.remove('open');
        }
    }

    function composeTweetText(selectedNotes) {
        if (selectedNotes.length === 0) return "";
        
        const baseHashtags = "\n#BigQuery #GoogleCloud";
        
        if (selectedNotes.length === 1) {
            const note = selectedNotes[0];
            const header = `🚀 BigQuery ${note.type} Update (${note.date}):\n`;
            const footer = `\n\nRead: ${note.link}${baseHashtags}`;
            
            // Fit content text into X's 280-char limit
            const maxBodyLength = 280 - header.length - footer.length;
            let body = note.content_text;
            
            if (body.length > maxBodyLength) {
                body = body.substring(0, maxBodyLength - 3) + "...";
            }
            
            return `${header}${body}${footer}`;
        } else {
            // Multi select summary
            const header = `📊 New BigQuery Updates Summary:\n`;
            const footer = `\n\nDetails: ${selectedNotes[0].link}${baseHashtags}`;
            
            let body = "";
            selectedNotes.forEach(note => {
                const bullet = `• [${note.date}] ${note.type}: ${note.content_text}\n`;
                body += bullet;
            });
            
            const maxBodyLength = 280 - header.length - footer.length;
            if (body.length > maxBodyLength) {
                body = body.substring(0, maxBodyLength - 3) + "...";
            }
            
            return `${header}${body}${footer}`;
        }
    }

    function updateCharCounter(length) {
        charCounter.textContent = `${length} / 280`;
        if (length > 280) {
            charCounter.classList.add('warning');
        } else {
            charCounter.classList.remove('warning');
        }
    }

    // --- Toast Notifications ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '✓';
        if (type === 'error') icon = '⚠️';
        
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // --- Event Handlers ---
    refreshBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    exportCsvBtn.addEventListener('click', () => {
        if (releaseNotes.length === 0) {
            showToast('No data to export!', 'error');
            return;
        }

        // Get currently visible/filtered notes
        const filteredNotes = releaseNotes.filter(note => {
            const matchesType = currentFilter === 'all' || note.type.toLowerCase() === currentFilter.toLowerCase();
            const matchesSearch = searchQuery === '' || 
                note.content_text.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });

        if (filteredNotes.length === 0) {
            showToast('No matching records found to export.', 'error');
            return;
        }

        // Generate CSV file contents client-side
        let csvContent = "Date,Type,Description,Link\n";
        filteredNotes.forEach(note => {
            const escapeCSV = (str) => `"${str.replace(/"/g, '""')}"`;
            const row = [
                escapeCSV(note.date),
                escapeCSV(note.type),
                escapeCSV(note.content_text),
                escapeCSV(note.link)
            ].join(",");
            csvContent += row + "\n";
        });

        // Trigger file download using blob link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${filteredNotes.length} updates to CSV!`, 'success');
    });

    retryBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Filtering category click
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.type;
            renderNotes();
        });
    });

    // Search logic
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderNotes();
        searchInput.focus();
    });

    // Share Drawer actions
    clearSelectionBtn.addEventListener('click', () => {
        selectedNoteIds.clear();
        document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
        updateShareDrawer();
        showToast('Selection cleared.', 'success');
    });

    closeDrawerBtn.addEventListener('click', () => {
        selectedNoteIds.clear();
        document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
        updateShareDrawer();
    });

    tweetTextarea.addEventListener('input', (e) => {
        updateCharCounter(e.target.value.length);
    });

    tweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        if (tweetText.trim().length === 0) {
            showToast('Tweet content cannot be empty!', 'error');
            return;
        }

        // Open Twitter Web Intent
        const encodedText = encodeURIComponent(tweetText);
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        
        showToast('Opening sharing dialog on X...', 'success');
    });

    // --- Theme Mode Toggle ---
    const themeCheckbox = document.getElementById('theme-checkbox');
    
    // Load initial theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeCheckbox.checked = false;
    } else {
        document.body.classList.remove('light-theme');
        themeCheckbox.checked = true;
    }
    
    themeCheckbox.addEventListener('change', (e) => {
        if (!e.target.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast('Switched to Light Mode', 'success');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast('Switched to Dark Mode', 'success');
        }
    });

    // --- Initial Fetch ---
    fetchNotes(false);
});
