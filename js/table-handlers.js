/**
 * Table Handlers for Archery Competition Tracker
 * Handles all table-related operations and event handling
 */
import { UIHelpers } from './ui-helpers.js';
import { ArcheryDataService } from './data-service.js';
import { FormHandlers } from './form-handlers.js';
import { ArcheryUIRenderer } from './ui-renderer.js';
// Bootstrap is loaded globally in the HTML file

export const TableHandlers = {
  /**
   * Save edited score
   * @param {number} index - Index of the score to save
   * @returns {Promise} Promise resolving when score is saved
   */
  saveEditedScore: async function(index) {
    try {
      // Get the archer at this index
      const archerResult = await ArcheryDataService.getArcherAtIndex(index);
      if (!archerResult.success) {
        UIHelpers.showNotification('Error', 'Could not find archer to update.');
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
      await TableHandlers.refreshScoresTable(searchTerm, updatedScore.name);
      await ArcheryUIRenderer.renderResults();
      await FormHandlers.refreshSavedCompetitorsDropdowns();
      
      // Notify user
      UIHelpers.showNotification('Score Updated', `${updatedScore.name}'s score has been updated.`);
    } catch (error) {
      console.error('Error saving edited score:', error);
      UIHelpers.showNotification('Error', 'Failed to save changes. Please try again.');
    }
  },
  
  /**
   * Delete score
   * @param {number} index - Index of the score to delete
   * @returns {Promise} Promise resolving when score is deleted
   */
  deleteScore: async function(index) {
    try {
      // Get the archer name
      const archerResult = await ArcheryDataService.getArcherAtIndex(index);
      if (!archerResult.success) {
        UIHelpers.showNotification('Error', 'Could not find archer to delete.');
        return;
      }
      
      const archerName = archerResult.name;
      
      UIHelpers.showConfirmation(`Are you sure you want to delete ${archerName}'s score?`, async () => {
        try {
          const result = await ArcheryDataService.deleteScore(index);
          
          if (result.success) {
            // Update views
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            await TableHandlers.refreshScoresTable(searchTerm);
            await ArcheryUIRenderer.renderResults();
            
            UIHelpers.showNotification('Score Deleted', `${archerName}'s score has been deleted.`);
          } else {
            UIHelpers.showNotification('Error', result.message || 'Failed to delete score.');
          }
        } catch (error) {
          console.error('Error deleting score:', error);
          UIHelpers.showNotification('Error', 'Failed to delete score. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error preparing to delete score:', error);
      UIHelpers.showNotification('Error', 'An error occurred. Please try again.');
    }
  },
  
  /**
   * Refresh the scores table with current data
   * @param {string} searchTerm - Optional search term
   * @param {string} highlightName - Optional name to highlight
   * @returns {Promise} Promise resolving when table is refreshed
   */
  refreshScoresTable: async function(searchTerm = '', highlightName = null) {
    try {
      await ArcheryUIRenderer.renderScoresTable(searchTerm, highlightName);
      TableHandlers.initializeTableEventHandlers();
      
      // If highlighted name exists, announce to screen reader
      if (highlightName) {
        const highlightedRow = document.querySelector('.highlight-row');
        if (highlightedRow) {
          UIHelpers.announceToScreenReader(`Added ${highlightName} to the list.`);
        }
      }
    } catch (error) {
      console.error('Error refreshing scores table:', error);
    }
  },
  
  /**
   * Initialize table event handlers
   * Must be called after rendering the table
   */
  initializeTableEventHandlers: function() {
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
        TableHandlers.saveEditedScore(index);
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
        TableHandlers.deleteScore(index);
      });
    });

    // Add keyboard event handlers for the row
    document.querySelectorAll('.edit-mode').forEach(input => {
      input.addEventListener('keydown', function(e) {
        const row = this.closest('tr');
        const index = parseInt(row.dataset.index);
        
        if (e.key === 'Enter') {
          TableHandlers.saveEditedScore(index);
          e.preventDefault();
        } else if (e.key === 'Escape') {
          ArcheryUIRenderer.deactivateEditMode(index);
          e.preventDefault();
        }
      });
    });
  },
  
  /**
   * Initialize saved competitors event handlers
   * Must be called after rendering the saved competitors table
   */
  initializeSavedCompetitorsEventHandlers: function() {
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
            UIHelpers.showNotification('Competitor Selected', `${competitor.name} is now ready for score entry.`);
          }
        } catch (error) {
          console.error('Error using saved competitor:', error);
          UIHelpers.showNotification('Error', 'Failed to load competitor details. Please try again.');
        }
      });
    });
    
    // Delete competitor button
    document.querySelectorAll('.delete-competitor-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const competitorName = this.dataset.name;
        UIHelpers.showConfirmation(`Delete ${competitorName} from saved competitors?`, async () => {
          try {
            await ArcheryDataService.deleteSavedCompetitor(competitorName);
            UIHelpers.showNotification('Competitor Deleted', `${competitorName} has been removed from saved competitors.`);
            
            // Refresh the saved competitors table
            await ArcheryUIRenderer.renderSavedCompetitorsTable(
              document.getElementById('savedSearchInput').value.toLowerCase()
            );
            
            // Refresh saved competitors dropdowns
            await FormHandlers.refreshSavedCompetitorsDropdowns();
            
            // Reinitialize event handlers
            TableHandlers.initializeSavedCompetitorsEventHandlers();
          } catch (error) {
            console.error('Error deleting saved competitor:', error);
            UIHelpers.showNotification('Error', 'Failed to delete competitor. Please try again.');
          }
        });
      });
    });
  },
  
  /**
   * Initialize competitions event handlers
   * Must be called after rendering the competitions list
   */
  initializeCompetitionsEventHandlers: function() {
    // Activate competition button
    document.querySelectorAll('.activate-competition-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const row = this.closest('tr');
        if (!row) return;
        
        const competitionId = parseInt(row.dataset.competitionId);
        if (isNaN(competitionId)) return;
        
        try {
          const competition = await ArcheryDataService.setActiveCompetition(competitionId);
          UIHelpers.showNotification('Competition Activated', `${competition.name} is now the active competition.`);
          
          // Refresh the views
          await EventHandlers.initializeCompetitionSelector();
          await EventHandlers.refreshAllViews();
        } catch (error) {
          console.error('Error activating competition:', error);
          UIHelpers.showNotification('Error', 'Failed to activate competition. Please try again.');
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
            EventHandlers.showCompetitionModal(competition);
          } else {
            UIHelpers.showNotification('Error', 'Competition not found.');
          }
        } catch (error) {
          console.error('Error getting competition for editing:', error);
          UIHelpers.showNotification('Error', 'Failed to load competition details. Please try again.');
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
        
        UIHelpers.showConfirmation('Are you sure you want to delete this competition? This will permanently delete all associated scores.', async () => {
          try {
            const result = await ArcheryDataService.deleteCompetition(competitionId);
            
            if (result.success) {
              UIHelpers.showNotification('Competition Deleted', 'The competition has been deleted.');
              // Refresh the views
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
      });
    });
  }
};

// Make it available globally
window.TableHandlers = TableHandlers;
