/**
 * Main Application Logic
 * Handles all event listeners and application initialization
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Starting application initialization...');
  
  // Initialize database first
  try {
    await ArcheryDataService.initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    // Continue anyway - we'll fall back to localStorage
  }
  
  // Initialize Bootstrap components
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  const notificationToast = new bootstrap.Toast(document.getElementById('notificationToast'));
  
  // Screen reader announcements
  const statusMessages = document.getElementById('statusMessages');
  
  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {boolean} temporary - Whether to remove message after timeout
   */
  function announceToScreenReader(message, temporary = true) {
    statusMessages.textContent = message;
    statusMessages.setAttribute('aria-hidden', 'false');
    
    if (temporary) {
      setTimeout(() => {
        statusMessages.textContent = '';
        statusMessages.setAttribute('aria-hidden', 'true');
      }, 3000);
    }
  }
  
  /**
   * Show toast notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  function showNotification(title, message) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    notificationToast.show();
    announceToScreenReader(message);
  }
  
  /**
   * Show confirmation modal
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Function to call when confirmed
   */
  function showConfirmation(message, onConfirm) {
    document.getElementById('confirmationModalBody').textContent = message;
    
    // Remove old event listener if exists
    const confirmBtn = document.getElementById('confirmationModalConfirm');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add new event listener
    newConfirmBtn.addEventListener('click', () => {
      confirmationModal.hide();
      onConfirm();
    });
    
    confirmationModal.show();
  }
  
  /**
   * Initialize dropdown elements
   */
  async function initializeDropdowns() {
    console.log('Initializing dropdowns...');
    // Populate main form dropdowns
    const categorySelect = document.getElementById('categorySelect');
    const ageSelect = document.getElementById('ageRangeSelect');
    ArcheryUIRenderer.populateDropdowns(categorySelect, ageSelect);
    
    // Populate inline form dropdowns
    const inlineCategorySelect = document.getElementById('inlineCategorySelect');
    const inlineAgeSelect = document.getElementById('inlineAgeRangeSelect');
    ArcheryUIRenderer.populateDropdowns(inlineCategorySelect, inlineAgeSelect);
    
    // Populate saved competitors dropdowns
    const savedCompetitorSelect = document.getElementById('savedCompetitorSelect');
    const inlineSavedCompetitorSelect = document.getElementById('inlineSavedCompetitorSelect');
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(savedCompetitorSelect);
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(inlineSavedCompetitorSelect);
  }
  
  /**
   * Initialize competition selector
   */
  async function initializeCompetitionSelector() {
    console.log('Initializing competition selector...');
    const container = document.getElementById('competitionSelectorContainer');
    await ArcheryUIRenderer.renderCompetitionSelector(container);
    
    // Add event listener for competition selector
    const competitionSelect = document.getElementById('competitionSelect');
    if (competitionSelect) {
      competitionSelect.addEventListener('change', async function() {
        const competitionId = parseInt(this.value);
        try {
          await ArcheryDataService.setActiveCompetition(competitionId);
          await refreshAllViews();
          
          // Get the competition name for display
          const activeCompetition = ArcheryDataService.getActiveCompetition();
          showNotification('Competition Changed', `Active competition set to ${activeCompetition.name}`);
        } catch (error) {
          console.error('Error changing competition:', error);
          showNotification('Error', 'Failed to change competition. Please try again.');
        }
      });
    }
    
    // Add event listeners for competition buttons
    const createBtn = document.getElementById('createCompetitionBtn');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        showCompetitionModal();
      });
    }
    
    const editBtn = document.getElementById('editCompetitionBtn');
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (activeCompetition) {
          showCompetitionModal(activeCompetition);
        } else {
          showNotification('Error', 'No active competition to edit.');
        }
      });
    }
    
    const deleteBtn = document.getElementById('deleteCompetitionBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (activeCompetition) {
          showConfirmation(`Are you sure you want to delete the competition "${activeCompetition.name}"? This will permanently delete all associated scores.`, async () => {
            try {
              const result = await ArcheryDataService.deleteCompetition(activeCompetition.id);
              
              if (result.success) {
                showNotification('Competition Deleted', `Competition "${activeCompetition.name}" has been deleted.`);
                // Refresh the competition selector
                await initializeCompetitionSelector();
                await refreshAllViews();
              } else {
                showNotification('Error', result.message || 'Failed to delete competition.');
              }
            } catch (error) {
              console.error('Error deleting competition:', error);
              showNotification('Error', 'Failed to delete competition. Please try again.');
            }
          });
        } else {
          showNotification('Error', 'No active competition to delete.');
        }
      });
    }
    
    // Add event listener for the "Create New Competition" button in alert
    const createNewCompetitionBtn = document.getElementById('createNewCompetitionBtn');
    if (createNewCompetitionBtn) {
      createNewCompetitionBtn.addEventListener('click', function() {
        showCompetitionModal();
      });
    }
  }
  
  /**
   * Show competition modal for creating or editing
   * @param {Object|null} competition - Competition to edit, or null for new
   */
  function showCompetitionModal(competition = null) {
    // Create the modal
    const modal = ArcheryUIRenderer.createCompetitionModal(competition);
    const bootstrapModal = new bootstrap.Modal(modal);
    
    // Add event listener for save button
    const saveBtn = document.getElementById('saveCompetitionBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async function() {
        const competitionForm = document.getElementById('competitionForm');
        
        // Check form validity
        if (!competitionForm.checkValidity()) {
          competitionForm.reportValidity();
          return;
        }
        
        // Get form values
        const name = document.getElementById('competitionName').value;
        const date = document.getElementById('competitionDate').value;
        const description = document.getElementById('competitionDescription').value;
        
        // Get competition ID for edits
        const idInput = document.getElementById('competitionId');
        const id = idInput && idInput.value ? parseInt(idInput.value) : null;
        
        try {
          if (id) {
            // Update existing competition
            const competition = {
              id: id,
              name: name,
              date: new Date(date).toISOString(),
              description: description,
              updatedAt: new Date().toISOString()
            };
            
            await ArcheryDataService.updateCompetition(competition);
            showNotification('Competition Updated', `Competition "${name}" has been updated.`);
          } else {
            // Create new competition
            const competition = {
              name: name,
              date: new Date(date).toISOString(),
              description: description,
              createdAt: new Date().toISOString()
            };
            
            const newId = await ArcheryDataService.createCompetition(competition);
            await ArcheryDataService.setActiveCompetition(newId);
            showNotification('Competition Created', `New competition "${name}" has been created and set as active.`);
          }
          
          // Hide the modal
          bootstrapModal.hide();
          
          // Refresh the competition selector and views
          await initializeCompetitionSelector();
          await refreshAllViews();
        } catch (error) {
          console.error('Error saving competition:', error);
          showNotification('Error', 'Failed to save competition. Please try again.');
        }
      });
    }
    
    // Show the modal
    bootstrapModal.show();
  }
  
  /**
   * Save edited score
   * @param {number} index - Index of the score to save
   */
  async function saveEditedScore(index) {
    try {
      // Get the archer at this index
      const archerResult = await ArcheryDataService.getArcherAtIndex(index);
      if (!archerResult.success) {
        showNotification('Error', 'Could not find archer to update.');
        return;
      }
      
      const row = document.getElementById(`row-${index}`);
      const inputs = row.querySelectorAll('.edit-mode');
      
      // Update the score with new values
      const updatedScore = {
        name: inputs[0].value,
        club: inputs[1].value,
        membershipId: inputs[2].value || '', // Add membership ID
        category: inputs[3].value,
        age: inputs[4].value,
        day1: parseInt(inputs[5].value) || 0,
        day2: parseInt(inputs[6].value) || 0
      };
      
      // Calculate total
      updatedScore.total = updatedScore.day1 + updatedScore.day2;
      
      // Preserve competition ID
      if (archerResult.archer.competitionId) {
        updatedScore.competitionId = archerResult.archer.competitionId;
      } else {
        // Use active competition if available
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (activeCompetition) {
          updatedScore.competitionId = activeCompetition.id;
        }
      }
      
      // Preserve ID for update
      if (archerResult.archer.id !== undefined) {
        updatedScore.id = archerResult.archer.id;
      }
      
      // Handle name change - need to delete old record and add new one
      const originalName = archerResult.name;
      
      if (originalName !== updatedScore.name) {
        // Delete the original record
        await ArcheryDataService.deleteArcherByName(originalName);
      }
      
      // Save the updated record
      await ArcheryDataService.saveScore(updatedScore);
      
      // Also update saved competitor if it exists
      await ArcheryDataService.saveCompetitor(updatedScore);
      
      // Update the view
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      await refreshScoresTable(searchTerm, updatedScore.name);
      await refreshResults();
      await refreshSavedCompetitorsDropdowns();
      
      // Notify user
      showNotification('Score Updated', `${updatedScore.name}'s score has been updated.`);
    } catch (error) {
      console.error('Error saving edited score:', error);
      showNotification('Error', 'Failed to save changes. Please try again.');
    }
  }
  
  /**
   * Delete score
   * @param {number} index - Index of the score to delete
   */
  async function deleteScore(index) {
    try {
      // Get the archer name
      const archerResult = await ArcheryDataService.getArcherAtIndex(index);
      if (!archerResult.success) {
        showNotification('Error', 'Could not find archer to delete.');
        return;
      }
      
      const archerName = archerResult.name;
      
      showConfirmation(`Are you sure you want to delete ${archerName}'s score?`, async () => {
        try {
          const result = await ArcheryDataService.deleteScore(index);
          
          if (result.success) {
            // Update views
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            await refreshScoresTable(searchTerm);
            await refreshResults();
            
            showNotification('Score Deleted', `${archerName}'s score has been deleted.`);
          } else {
            showNotification('Error', result.message || 'Failed to delete score.');
          }
        } catch (error) {
          console.error('Error deleting score:', error);
          showNotification('Error', 'Failed to delete score. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error preparing to delete score:', error);
      showNotification('Error', 'An error occurred. Please try again.');
    }
  }
  
  /**
   * Add archer data from form
   * @param {Object} archer - Archer data object
   * @param {HTMLFormElement} form - Form element to reset
   * @param {boolean} isInlineForm - Whether data comes from inline form
   */
  async function addArcher(archer, form, isInlineForm = false) {
    try {
      // Check if we have an active competition
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        showNotification('Error', 'No active competition. Please select or create a competition first.');
        return;
      }
      
      // Add competition ID
      archer.competitionId = activeCompetition.id;
      
      // Get save preference
      const saveCompetitor = isInlineForm
        ? document.getElementById('inlineSaveCompetitor').checked
        : document.getElementById('saveCompetitor').checked;
      
      // First check if archer already exists in this competition
      const exists = await ArcheryDataService.archerExists(archer.name);
      
      if (exists) {
        showConfirmation('This archer already exists in the current competition. Update their score?', async () => {
          try {
            await ArcheryDataService.saveScore(archer);
            
            // Save competitor if checkbox is checked
            if (saveCompetitor) {
              await ArcheryDataService.saveCompetitor(archer);
            }
            
            showNotification('Score Updated', 'Archer score has been updated successfully.');
            form.reset();
            
            if (isInlineForm) {
              // Hide inline form
              document.getElementById('inlineAddForm').style.display = 'none';
              document.getElementById('toggleInlineForm').setAttribute('aria-expanded', 'false');
              document.getElementById('toggleInlineForm').classList.add('collapsed');
              
              // Refresh the table
              const searchTerm = document.getElementById('searchInput').value.toLowerCase();
              await refreshScoresTable(searchTerm, archer.name);
            } else {
              document.getElementById('archerName').focus();
            }
            
            // Refresh saved competitors dropdowns
            await refreshSavedCompetitorsDropdowns();
            await refreshResults();
          } catch (error) {
            console.error('Error updating archer:', error);
            showNotification('Error', 'Failed to update archer. Please try again.');
          }
        });
      } else {
        // New archer
        try {
          await ArcheryDataService.saveScore(archer);
          
          // Save competitor if checkbox is checked
          if (saveCompetitor) {
            await ArcheryDataService.saveCompetitor(archer);
          }
          
          showNotification('Score Added', 'New archer score has been added successfully.');
          form.reset();
          
          if (isInlineForm) {
            // Hide inline form
            document.getElementById('inlineAddForm').style.display = 'none';
            document.getElementById('toggleInlineForm').setAttribute('aria-expanded', 'false');
            document.getElementById('toggleInlineForm').classList.add('collapsed');
            
            // Refresh the table
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            await refreshScoresTable(searchTerm, archer.name);
          } else {
            document.getElementById('archerName').focus();
          }
          
          // Refresh saved competitors dropdowns
          await refreshSavedCompetitorsDropdowns();
          await refreshResults();
        } catch (error) {
          console.error('Error adding archer:', error);
          showNotification('Error', 'Failed to add archer. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error checking if archer exists:', error);
      showNotification('Error', 'An error occurred. Please try again.');
    }
  }
  
  /**
   * Refresh saved competitors dropdowns
   */
  async function refreshSavedCompetitorsDropdowns() {
    const savedCompetitorSelect = document.getElementById('savedCompetitorSelect');
    const inlineSavedCompetitorSelect = document.getElementById('inlineSavedCompetitorSelect');
    
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(savedCompetitorSelect);
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(inlineSavedCompetitorSelect);
  }
  
  /**
   * Refresh the competitions list
   * @param {string} searchTerm - Optional search term
   */
  async function refreshCompetitionsList(searchTerm = '') {
    const container = document.getElementById('competitionsListContainer');
    await ArcheryUIRenderer.renderCompetitionsList(container, searchTerm);
    initializeCompetitionsEventHandlers();
  }
  
  /**
   * Refresh the scores table with current data
   * @param {string} searchTerm - Optional search term
   * @param {string} highlightName - Optional name to highlight
   */
  async function refreshScoresTable(searchTerm = '', highlightName = null) {
    try {
      await ArcheryUIRenderer.renderScoresTable(searchTerm, highlightName);
      initializeTableEventHandlers();
      
      // If highlighted name exists, announce to screen reader
      if (highlightName) {
        const highlightedRow = document.querySelector('.highlight-row');
        if (highlightedRow) {
          announceToScreenReader(`Added ${highlightName} to the list.`);
        }
      }
    } catch (error) {
      console.error('Error refreshing scores table:', error);
    }
  }
  
  /**
   * Refresh the results view with current data
   */
  async function refreshResults() {
    try {
      await ArcheryUIRenderer.renderResults();
    } catch (error) {
      console.error('Error refreshing results:', error);
    }
  }
  
  /**
   * Refresh all views
   */
  async function refreshAllViews() {
    try {
      await refreshScoresTable();
      await refreshResults();
      await refreshCompetitionsList();
    } catch (error) {
      console.error('Error refreshing views:', error);
    }
  }
  
  /**
   * Initialize saved competitors event handlers
   * Must be called after rendering the saved competitors table
   */
  function initializeSavedCompetitorsEventHandlers() {
    // Use competitor button
    document.querySelectorAll('.use-competitor-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const competitorName = this.dataset.name;
        try {
          const competitor = await ArcheryDataService.getSavedCompetitorByName(competitorName);
          if (competitor) {
            // Navigate to Enter Scores tab
            document.getElementById('enter-tab').click();
            
            // Fill in the form with competitor details
            document.getElementById('archerName').value = competitor.name;
            document.getElementById('club').value = competitor.club || '';
            document.getElementById('categorySelect').value = competitor.category;
            document.getElementById('ageRangeSelect').value = competitor.age;
            
            // Focus on day 1 score for quick entry
            document.getElementById('scoreDay1').focus();
            
            // Update dropdown to match
            const savedCompetitorSelect = document.getElementById('savedCompetitorSelect');
            if (savedCompetitorSelect) {
              savedCompetitorSelect.value = competitor.name;
            }
            
            // Notify user
            showNotification('Competitor Selected', `${competitor.name} is now ready for score entry.`);
          }
        } catch (error) {
          console.error('Error using saved competitor:', error);
          showNotification('Error', 'Failed to load competitor details. Please try again.');
        }
      });
    });
    
    // Delete competitor button
    document.querySelectorAll('.delete-competitor-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const competitorName = this.dataset.name;
        showConfirmation(`Delete ${competitorName} from saved competitors?`, async () => {
          try {
            await ArcheryDataService.deleteSavedCompetitor(competitorName);
            showNotification('Competitor Deleted', `${competitorName} has been removed from saved competitors.`);
            
            // Refresh the saved competitors table
            await ArcheryUIRenderer.renderSavedCompetitorsTable(
              document.getElementById('savedSearchInput').value.toLowerCase()
            );
            
            // Refresh saved competitors dropdowns
            await refreshSavedCompetitorsDropdowns();
            
            // Reinitialize event handlers
            initializeSavedCompetitorsEventHandlers();
          } catch (error) {
            console.error('Error deleting saved competitor:', error);
            showNotification('Error', 'Failed to delete competitor. Please try again.');
          }
        });
      });
    });
  }
  
  /**
   * Initialize competitions event handlers
   * Must be called after rendering the competitions list
   */
  function initializeCompetitionsEventHandlers() {
    // Activate competition button
    document.querySelectorAll('.activate-competition-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const row = this.closest('tr');
        if (!row) return;
        
        const competitionId = parseInt(row.dataset.competitionId);
        if (isNaN(competitionId)) return;
        
        try {
          const competition = await ArcheryDataService.setActiveCompetition(competitionId);
          showNotification('Competition Activated', `${competition.name} is now the active competition.`);
          
          // Refresh the views
          await initializeCompetitionSelector();
          await refreshAllViews();
        } catch (error) {
          console.error('Error activating competition:', error);
          showNotification('Error', 'Failed to activate competition. Please try again.');
        }
      });
    });
    
    // Edit competition button
    document.querySelectorAll('.edit-competition-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const row = this.closest('tr');
        if (!row) return;
        
        const competitionId = parseInt(row.dataset.competitionId);
        if (isNaN(competitionId)) return;
        
        try {
          const competition = await ArcheryDataService.getCompetitionById(competitionId);
          if (competition) {
            showCompetitionModal(competition);
          } else {
            showNotification('Error', 'Competition not found.');
          }
        } catch (error) {
          console.error('Error getting competition for editing:', error);
          showNotification('Error', 'Failed to load competition details. Please try again.');
        }
      });
    });
    
    // Delete competition button
    document.querySelectorAll('.delete-competition-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const row = this.closest('tr');
        if (!row) return;
        
        const competitionId = parseInt(row.dataset.competitionId);
        if (isNaN(competitionId)) return;
        
        showConfirmation('Are you sure you want to delete this competition? This will permanently delete all associated scores.', async () => {
          try {
            const result = await ArcheryDataService.deleteCompetition(competitionId);
            
            if (result.success) {
              showNotification('Competition Deleted', 'The competition has been deleted.');
              // Refresh the views
              await initializeCompetitionSelector();
              await refreshAllViews();
            } else {
              showNotification('Error', result.message || 'Failed to delete competition.');
            }
          } catch (error) {
            console.error('Error deleting competition:', error);
            showNotification('Error', 'Failed to delete competition. Please try again.');
          }
        });
      });
    });
  }
  
  /**
   * Initialize all event listeners
   */
  function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Tab change handlers
    document.getElementById('view-tab').addEventListener('click', async function() {
      await refreshScoresTable();
    });
    
    document.getElementById('results-tab').addEventListener('click', async function() {
      await refreshResults();
    });
    
    document.getElementById('saved-tab').addEventListener('click', async function() {
      await ArcheryUIRenderer.renderSavedCompetitorsTable();
      initializeSavedCompetitorsEventHandlers();
    });
    
    document.getElementById('competitions-tab').addEventListener('click', async function() {
      await refreshCompetitionsList();
    });
    
    // Create New Competition button in the competitions tab
    document.getElementById('createNewCompetitionButton').addEventListener('click', function() {
      showCompetitionModal();
    });
    
    // Toggle inline form visibility
    const toggleInlineForm = document.getElementById('toggleInlineForm');
    const inlineAddForm = document.getElementById('inlineAddForm');
    
    toggleInlineForm.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        inlineAddForm.style.display = 'none';
        this.setAttribute('aria-expanded', 'false');
        this.classList.add('collapsed');
      } else {
        inlineAddForm.style.display = 'block';
        this.setAttribute('aria-expanded', 'true');
        this.classList.remove('collapsed');
        document.getElementById('inlineArcherName').focus();
      }
    });
    
    // Cancel button for inline form
    document.getElementById('inlineCancelBtn').addEventListener('click', function() {
      inlineAddForm.style.display = 'none';
      toggleInlineForm.setAttribute('aria-expanded', 'false');
      toggleInlineForm.classList.add('collapsed');
      document.getElementById('inlineScoreForm').reset();
    });
    
    // Direct form handlers
    setupFormHandlers();
    
    // New competition button (clearing scores)
    document.getElementById('newCompetition').addEventListener('click', function() {
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      const competitionName = activeCompetition ? activeCompetition.name : 'current competition';
      
      showConfirmation(`This will delete all scores in ${competitionName}. Are you sure?`, async () => {
        try {
          await ArcheryDataService.clearAllScores();
          showNotification('Scores Cleared', `All scores in ${competitionName} have been cleared.`);
          await refreshScoresTable();
          await refreshResults();
        } catch (error) {
          console.error('Error clearing scores:', error);
          showNotification('Error', 'Failed to clear scores. Please try again.');
        }
      });
    });
    
// Replace the existing Sample Competition button code in app.js with this updated version:

// Sample competition button
document.getElementById('sampleBtn').addEventListener('click', async function() {
  let activeCompetition = ArcheryDataService.getActiveCompetition();
  let createdNewCompetition = false;
  
  // If no active competition, create a new one first
  if (!activeCompetition) {
    try {
      // Create a sample competition
      const sampleCompetition = {
        name: "Sample Competition " + new Date().toLocaleDateString(),
        date: new Date().toISOString(),
        description: "Automatically created sample competition"
      };
      
      const newId = await ArcheryDataService.createCompetition(sampleCompetition);
      await ArcheryDataService.setActiveCompetition(newId);
      activeCompetition = ArcheryDataService.getActiveCompetition();
      
      // Refresh the competition selector
      await initializeCompetitionSelector();
      createdNewCompetition = true;
      
      console.log('Created new sample competition:', activeCompetition);
    } catch (error) {
      console.error('Error creating sample competition:', error);
      showNotification('Error', 'Failed to create sample competition. Please try again.');
      return;
    }
  }
  
  // Now we should have an active competition
  const message = createdNewCompetition 
    ? `Created new competition "${activeCompetition.name}". Do you want to add sample data?` 
    : `Create sample data in ${activeCompetition.name}?`;
  
  showConfirmation(message, async () => {
    try {
      const result = await ArcheryDataService.generateSampleData();
      if (result.success) {
        showNotification('Sample Data', 'Sample data has been created successfully.');
        
        // Update the views
        await refreshScoresTable();
        await refreshResults();
        await refreshSavedCompetitorsDropdowns();
        
        // Switch to the results tab
        document.getElementById('results-tab').click();
      } else {
        showNotification('Error', 'Failed to create sample data.');
      }
    } catch (error) {
      console.error('Error generating sample data:', error);
      showNotification('Error', 'Failed to generate sample data. Please try again.');
    }
  });
});
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', async function() {
      await refreshScoresTable(this.value.toLowerCase());
    });
    
    // Saved competitors search functionality
    document.getElementById('savedSearchInput').addEventListener('input', async function() {
      await ArcheryUIRenderer.renderSavedCompetitorsTable(this.value.toLowerCase());
      initializeSavedCompetitorsEventHandlers();
    });
    
    // Competitions search functionality
    document.getElementById('competitionsSearchInput').addEventListener('input', async function() {
      await refreshCompetitionsList(this.value.toLowerCase());
    });
    
    // Saved competitors selection dropdown event handlers
    document.getElementById('savedCompetitorSelect').addEventListener('change', async function() {
      const selectedName = this.value;
      if (selectedName) {
        try {
          const competitor = await ArcheryDataService.getSavedCompetitorByName(selectedName);
          if (competitor) {
            // Fill in the form fields
            document.getElementById('archerName').value = competitor.name;
            document.getElementById('club').value = competitor.club || '';
            document.getElementById('categorySelect').value = competitor.category;
            document.getElementById('ageRangeSelect').value = competitor.age;
            
            // Focus on day 1 score field to speed up the workflow
            document.getElementById('scoreDay1').focus();
          }
        } catch (error) {
          console.error('Error loading saved competitor:', error);
        }
      }
    });
    
    document.getElementById('inlineSavedCompetitorSelect').addEventListener('change', async function() {
      const selectedName = this.value;
      if (selectedName) {
        try {
          const competitor = await ArcheryDataService.getSavedCompetitorByName(selectedName);
          if (competitor) {
            // Fill in the form fields
            document.getElementById('inlineArcherName').value = competitor.name;
            document.getElementById('inlineClub').value = competitor.club || '';
            document.getElementById('inlineCategorySelect').value = competitor.category;
            document.getElementById('inlineAgeRangeSelect').value = competitor.age;
            
            // Focus on day 1 score field to speed up the workflow
            document.getElementById('inlineScoreDay1').focus();
          }
        } catch (error) {
          console.error('Error loading saved competitor:', error);
        }
      }
    });
    
    // Excel Export button
    document.getElementById('exportExcelBtn').addEventListener('click', async function() {
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        showNotification('Error', 'No active competition. Please select or create a competition first.');
        return;
      }
      
      try {
        const scores = await ArcheryDataService.getAllScores();
        
        // Add competition information to the scores
        const enhancedScores = scores.map(score => ({
          ...score,
          competition: activeCompetition.name,
          competitionDate: new Date(activeCompetition.date).toLocaleDateString()
        }));
        
        ArcheryExportService.setScoresData(enhancedScores);
        
        const result = await ArcheryExportService.exportToExcel();
        
        if (result.success) {
          showNotification('Export Successful', `Scores from ${activeCompetition.name} have been exported to Excel successfully.`);
        } else {
          showNotification('Export Error', result.message || 'An error occurred during export.');
        }
      } catch (error) {
        console.error('Error during export:', error);
        showNotification('Export Error', 'Failed to export data. Please try again.');
      }
    });
    
    // Excel Import functionality
    document.getElementById('importExcelFile').addEventListener('change', function(e) {
      if (!e.target.files || !e.target.files[0]) return;
      
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        showNotification('Error', 'No active competition. Please select or create a competition first.');
        e.target.value = '';
        return;
      }
      
      const file = e.target.files[0];
      
      ArcheryExportService.importFromExcel(file)
        .then(result => {
          if (result.success) {
            showConfirmation(`Do you want to replace existing data in ${activeCompetition.name} or merge with it?`, async () => {
              try {
                // Clear existing data first
                await ArcheryDataService.clearAllScores();
                
                // Add each imported archer with current competition ID
                for (const archer of result.data) {
                  // Add competition ID
                  archer.competitionId = activeCompetition.id;
                  
                  await ArcheryDataService.saveScore(archer);
                  // Also save as a saved competitor
                  await ArcheryDataService.saveCompetitor(archer);
                }
                
                // Update views
                await refreshScoresTable();
                await refreshResults();
                await refreshSavedCompetitorsDropdowns();
                
                // Show notification
                showNotification('Import Successful', `Imported ${result.count} archer records into ${activeCompetition.name} successfully.`);
                
                // Reset file input
                e.target.value = '';
                
                // Switch to the table view
                document.getElementById('view-tab').click();
              } catch (error) {
                console.error('Error updating data after import:', error);
                showNotification('Import Error', 'Failed to update data after import.');
              }
            });
          }
        })
        .catch(error => {
          console.error('Import error:', error);
          showNotification('Import Error', error.message || 'Failed to import Excel file.');
          
          // Reset file input
          e.target.value = '';
        });
    });
  }
  
  /**
   * Set up direct form handlers
   */
  function setupFormHandlers() {
    console.log('Setting up form handlers...');
    
    // Main form submission
    const scoreForm = document.getElementById('scoreForm');
    if (scoreForm) {
      // Remove any existing listeners to avoid duplicates
      const newForm = scoreForm.cloneNode(true);
      scoreForm.parentNode.replaceChild(newForm, scoreForm);
      
      // Add the new listener
      newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        // Check if we have an active competition
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (!activeCompetition) {
          showNotification('Error', 'No active competition. Please select or create a competition first.');
          return;
        }
        
        // Directly collect data from form
        const name = document.getElementById('archerName').value;
        const club = document.getElementById('club').value;
        const category = document.getElementById('categorySelect').value;
        const age = document.getElementById('ageRangeSelect').value;
        const day1 = parseInt(document.getElementById('scoreDay1').value) || 0;
        const day2 = parseInt(document.getElementById('scoreDay2').value) || 0;
        
        console.log('Form values:', { name, club, category, age, day1, day2 });
        
        // Create archer object
        const archer = {
          name: name,
          club: club,
          category: category,
          age: age,
          day1: day1,
          day2: day2,
          total: day1 + day2,
          competitionId: activeCompetition.id
        };
        
        await addArcher(archer, this, false);
      });
      
      console.log('Main form handler attached');
    } else {
      console.error('Could not find scoreForm element');
    }
    
    // Inline form submission
    const inlineScoreForm = document.getElementById('inlineScoreForm');
    if (inlineScoreForm) {
      // Remove any existing listeners
      const newInlineForm = inlineScoreForm.cloneNode(true);
      inlineScoreForm.parentNode.replaceChild(newInlineForm, inlineScoreForm);
      
      // Add the new listener
      newInlineForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Inline form submitted');
        
        // Check if we have an active competition
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (!activeCompetition) {
          showNotification('Error', 'No active competition. Please select or create a competition first.');
          return;
        }
        
        // Directly collect data from form
        const name = document.getElementById('inlineArcherName').value;
        const club = document.getElementById('inlineClub').value;
        const category = document.getElementById('inlineCategorySelect').value;
        const age = document.getElementById('inlineAgeRangeSelect').value;
        const day1 = parseInt(document.getElementById('inlineScoreDay1').value) || 0;
        const day2 = parseInt(document.getElementById('inlineScoreDay2').value) || 0;
        
        // Create archer object
        const archer = {
          name: name,
          club: club,
          category: category,
          age: age,
          day1: day1,
          day2: day2,
          total: day1 + day2,
          competitionId: activeCompetition.id
        };
        
        await addArcher(archer, this, true);
      });
      
      console.log('Inline form handler attached');
    } else {
      console.error('Could not find inlineScoreForm element');
    }
  }
  
  /**
   * Initialize table event handlers
   * Must be called after rendering the table
   */
  function initializeTableEventHandlers() {
    // Add event listeners for inline editing
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        ArcheryUIRenderer.activateEditMode(index);
      });
    });
    
    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        saveEditedScore(index);
      });
    });
    
    document.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        ArcheryUIRenderer.deactivateEditMode(index);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        deleteScore(index);
      });
    });

    // Add keyboard event handlers for the row
    document.querySelectorAll('.edit-mode').forEach(input => {
      input.addEventListener('keydown', function(e) {
        const row = this.closest('tr');
        const index = parseInt(row.dataset.index);
        
        if (e.key === 'Enter') {
          saveEditedScore(index);
          e.preventDefault();
        } else if (e.key === 'Escape') {
          ArcheryUIRenderer.deactivateEditMode(index);
          e.preventDefault();
        }
      });
    });
  }
  
  // Initialize the application
  console.log('Initializing application...');
  await initializeDropdowns();
  await initializeCompetitionSelector();
  initializeEventListeners();
  
  // Print results button
  document.getElementById('printResultsBtn').addEventListener('click', function() {
    ArcheryUIRenderer.printResults();
  });
  
  // Initialize UI with data
  try {
    // Render scores table and results
    await refreshScoresTable();
    console.log('Initial scores table rendered');
  } catch (error) {
    console.error('Error during initial rendering:', error);
  }
  
  console.log('Application initialization complete');
});