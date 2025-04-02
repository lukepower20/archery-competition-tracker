/**
 * Event Handlers for Archery Competition Tracker
 * Handles all event binding and initialization
 */
import { UIHelpers } from './ui-helpers.js';
import { ArcheryDataService } from './data-service.js';
import { FormHandlers } from './form-handlers.js';
import { TableHandlers } from './table-handlers.js';
import { ArcheryUIRenderer } from './ui-renderer.js';
import { ArcheryExportService } from './export-service.js';
// Bootstrap is loaded globally in the HTML file

export const EventHandlers = {
  /**
   * Initialize competition selector
   * @returns {Promise} Promise resolving when initialization is complete
   */
  initializeCompetitionSelector: async function() {
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
          await EventHandlers.refreshAllViews();
          
          // Get the competition name for display
          const activeCompetition = ArcheryDataService.getActiveCompetition();
          UIHelpers.showNotification('Competition Changed', `Active competition set to ${activeCompetition.name}`);
        } catch (error) {
          console.error('Error changing competition:', error);
          UIHelpers.showNotification('Error', 'Failed to change competition. Please try again.');
        }
      });
    }
    
    // Add event listeners for competition buttons
    const createBtn = document.getElementById('createCompetitionBtn');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        EventHandlers.showCompetitionModal();
      });
    }
    
    const editBtn = document.getElementById('editCompetitionBtn');
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (activeCompetition) {
          EventHandlers.showCompetitionModal(activeCompetition);
        } else {
          UIHelpers.showNotification('Error', 'No active competition to edit.');
        }
      });
    }
    
    const deleteBtn = document.getElementById('deleteCompetitionBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (activeCompetition) {
          UIHelpers.showConfirmation(`Are you sure you want to delete the competition "${activeCompetition.name}"? This will permanently delete all associated scores.`, async () => {
            try {
              const result = await ArcheryDataService.deleteCompetition(activeCompetition.id);
              
              if (result.success) {
                UIHelpers.showNotification('Competition Deleted', `Competition "${activeCompetition.name}" has been deleted.`);
                // Refresh the competition selector
                await EventHandlers.initializeCompetitionSelector();
                await EventHandlers.refreshAllViews();
              } else {
                UIHelpers.showNotification('Error', result.message || 'Failed to delete competition.');
              }
            } catch (error) {
              console.error('Error deleting competition:', error);
              UIHelpers.showNotification('Error', 'Failed to delete competition. Please try again.');
            }
          });
        } else {
          UIHelpers.showNotification('Error', 'No active competition to delete.');
        }
      });
    }
    
    // Add event listener for the "Create New Competition" button in alert
    const createNewCompetitionBtn = document.getElementById('createNewCompetitionBtn');
    if (createNewCompetitionBtn) {
      createNewCompetitionBtn.addEventListener('click', function() {
        EventHandlers.showCompetitionModal();
      });
    }
  },
  
  /**
   * Show competition modal for creating or editing
   * @param {Object|null} competition - Competition to edit, or null for new
   */
  showCompetitionModal: function(competition = null) {
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
            UIHelpers.showNotification('Competition Updated', `Competition "${name}" has been updated.`);
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
            UIHelpers.showNotification('Competition Created', `New competition "${name}" has been created and set as active.`);
          }
          
          // Hide the modal
          bootstrapModal.hide();
          
          // Refresh the competition selector and views
          await EventHandlers.initializeCompetitionSelector();
          await EventHandlers.refreshAllViews();
        } catch (error) {
          console.error('Error saving competition:', error);
          UIHelpers.showNotification('Error', 'Failed to save competition. Please try again.');
        }
      });
    }
    
    // Show the modal
    bootstrapModal.show();
  },
  
  /**
   * Refresh all views
   * @returns {Promise} Promise resolving when all views are refreshed
   */
  refreshAllViews: async function() {
    try {
      await TableHandlers.refreshScoresTable();
      await ArcheryUIRenderer.renderResults();
      await EventHandlers.refreshCompetitionsList();
    } catch (error) {
      console.error('Error refreshing views:', error);
    }
  },
  
  /**
   * Refresh the competitions list
   * @param {string} searchTerm - Optional search term
   * @returns {Promise} Promise resolving when list is refreshed
   */
  refreshCompetitionsList: async function(searchTerm = '') {
    const container = document.getElementById('competitionsListContainer');
    await ArcheryUIRenderer.renderCompetitionsList(container, searchTerm);
    TableHandlers.initializeCompetitionsEventHandlers();
  },
  
  /**
   * Initialize all event listeners
   */
  initializeEventListeners: function() {
    console.log('Initializing event listeners...');
    
    // Tab change handlers
    document.getElementById('view-tab').addEventListener('click', async function() {
      await TableHandlers.refreshScoresTable();
    });
    
    document.getElementById('results-tab').addEventListener('click', async function() {
      await ArcheryUIRenderer.renderResults();
    });
    
    document.getElementById('saved-tab').addEventListener('click', async function() {
      await ArcheryUIRenderer.renderSavedCompetitorsTable();
      TableHandlers.initializeSavedCompetitorsEventHandlers();
    });
    
    document.getElementById('competitions-tab').addEventListener('click', async function() {
      await EventHandlers.refreshCompetitionsList();
    });
    
    // Create New Competition button in the competitions tab
    document.getElementById('createNewCompetitionButton').addEventListener('click', function() {
      EventHandlers.showCompetitionModal();
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
    FormHandlers.setupFormHandlers();
    
    // New competition button (clearing scores)
    document.getElementById('newCompetition').addEventListener('click', function() {
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      const competitionName = activeCompetition ? activeCompetition.name : 'current competition';
      
      UIHelpers.showConfirmation(`This will delete all scores in ${competitionName}. Are you sure?`, async () => {
        try {
          await ArcheryDataService.clearAllScores();
          UIHelpers.showNotification('Scores Cleared', `All scores in ${competitionName} have been cleared.`);
          await TableHandlers.refreshScoresTable();
          await ArcheryUIRenderer.renderResults();
        } catch (error) {
          console.error('Error clearing scores:', error);
          UIHelpers.showNotification('Error', 'Failed to clear scores. Please try again.');
        }
      });
    });
    
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
          await EventHandlers.initializeCompetitionSelector();
          createdNewCompetition = true;
          
          console.log('Created new sample competition:', activeCompetition);
        } catch (error) {
          console.error('Error creating sample competition:', error);
          UIHelpers.showNotification('Error', 'Failed to create sample competition. Please try again.');
          return;
        }
      }
      
      // Now we should have an active competition
      const message = createdNewCompetition 
        ? `Created new competition "${activeCompetition.name}". Do you want to add sample data?` 
        : `Create sample data in ${activeCompetition.name}?`;
      
      UIHelpers.showConfirmation(message, async () => {
        try {
          const result = await ArcheryDataService.generateSampleData();
          if (result.success) {
            UIHelpers.showNotification('Sample Data', 'Sample data has been created successfully.');
            
            // Update the views
            await TableHandlers.refreshScoresTable();
            await ArcheryUIRenderer.renderResults();
            await FormHandlers.refreshSavedCompetitorsDropdowns();
            
            // Switch to the results tab
            document.getElementById('results-tab').click();
          } else {
            UIHelpers.showNotification('Error', 'Failed to create sample data.');
          }
        } catch (error) {
          console.error('Error generating sample data:', error);
          UIHelpers.showNotification('Error', 'Failed to generate sample data. Please try again.');
        }
      });
    });
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', async function() {
      await TableHandlers.refreshScoresTable(this.value.toLowerCase());
    });
    
    // Saved competitors search functionality
    document.getElementById('savedSearchInput').addEventListener('input', async function() {
      await ArcheryUIRenderer.renderSavedCompetitorsTable(this.value.toLowerCase());
      TableHandlers.initializeSavedCompetitorsEventHandlers();
    });
    
    // Competitions search functionality
    document.getElementById('competitionsSearchInput').addEventListener('input', async function() {
      await EventHandlers.refreshCompetitionsList(this.value.toLowerCase());
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
        UIHelpers.showNotification('Error', 'No active competition. Please select or create a competition first.');
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
          UIHelpers.showNotification('Export Successful', `Scores from ${activeCompetition.name} have been exported to Excel successfully.`);
        } else {
          UIHelpers.showNotification('Export Error', result.message || 'An error occurred during export.');
        }
      } catch (error) {
        console.error('Error during export:', error);
        UIHelpers.showNotification('Export Error', 'Failed to export data. Please try again.');
      }
    });
    
    // Excel Import functionality
    document.getElementById('importExcelFile').addEventListener('change', function(e) {
      if (!e.target.files || !e.target.files[0]) return;
      
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        UIHelpers.showNotification('Error', 'No active competition. Please select or create a competition first.');
        e.target.value = '';
        return;
      }
      
      const file = e.target.files[0];
      
      ArcheryExportService.importFromExcel(file)
        .then(result => {
          if (result.success) {
            UIHelpers.showConfirmation(`Do you want to replace existing data in ${activeCompetition.name} or merge with it?`, async () => {
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
                await TableHandlers.refreshScoresTable();
                await ArcheryUIRenderer.renderResults();
                await FormHandlers.refreshSavedCompetitorsDropdowns();
                
                // Show notification
                UIHelpers.showNotification('Import Successful', `Imported ${result.count} archer records into ${activeCompetition.name} successfully.`);
                
                // Reset file input
                e.target.value = '';
                
                // Switch to the table view
                document.getElementById('view-tab').click();
              } catch (error) {
                console.error('Error updating data after import:', error);
                UIHelpers.showNotification('Import Error', 'Failed to update data after import.');
              }
            });
          }
        })
        .catch(error => {
          console.error('Import error:', error);
          UIHelpers.showNotification('Import Error', error.message || 'Failed to import Excel file.');
          
          // Reset file input
          e.target.value = '';
        });
    });
    
    // Print results button
    document.getElementById('printResultsBtn').addEventListener('click', function() {
      ArcheryUIRenderer.printResults();
    });
  }
};

// Make it available globally
window.EventHandlers = EventHandlers;
