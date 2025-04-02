/**
 * Form Handlers for Archery Competition Tracker
 * Handles all form processing and submission logic
 */
import { UIHelpers } from './ui-helpers.js';
import { ArcheryDataService } from './data-service.js';
import { TableHandlers } from './table-handlers.js';
import { ArcheryUIRenderer } from './ui-renderer.js';
import { Logger } from './utilities.js';
// Bootstrap is loaded globally in the HTML file

export const FormHandlers = {
  /**
   * Process archer data from a form
   * @param {boolean} isInlineForm - Whether data comes from the inline form
   * @returns {Object} Processed archer object with calculated total
   */
  processArcherData: function(isInlineForm = false) {
    const prefix = isInlineForm ? 'inline' : '';
    
    // Get form elements
    const nameElement = document.getElementById(`${prefix}ArcherName`);
    const clubElement = document.getElementById(`${prefix}Club`);
    const categoryElement = document.getElementById(`${prefix}CategorySelect`);
    const ageElement = document.getElementById(`${prefix}AgeRangeSelect`);
    const day1Element = document.getElementById(`${prefix}ScoreDay1`);
    const day2Element = document.getElementById(`${prefix}ScoreDay2`);
    const membershipIdElement = document.getElementById(`${prefix}MembershipId`);
    
    Logger.debug('Form elements:', {
      nameElement, clubElement, categoryElement, 
      ageElement, day1Element, day2Element, membershipIdElement
    });
    
    // Safely get values with fallbacks
    const name = nameElement && nameElement.value ? nameElement.value : 'Unknown Archer';
    const club = clubElement && clubElement.value ? clubElement.value : '';
    const category = categoryElement && categoryElement.value ? categoryElement.value : ArcheryDataService.categories[0];
    const age = ageElement && ageElement.value ? ageElement.value : ArcheryDataService.ageRanges[0];
    const day1 = day1Element && day1Element.value ? (parseInt(day1Element.value) || 0) : 0;
    const day2 = day2Element && day2Element.value ? (parseInt(day2Element.value) || 0) : 0;
    const membershipId = membershipIdElement && membershipIdElement.value ? membershipIdElement.value : '';
    
    const archer = {
      name: name,
      club: club,
      category: category,
      age: age,
      day1: day1,
      day2: day2,
      total: day1 + day2,
      membershipId: membershipId
    };
    
    // Add competition ID if we have an active competition
    const activeCompetition = ArcheryDataService.getActiveCompetition();
    if (activeCompetition) {
      archer.competitionId = activeCompetition.id;
    }
    
    Logger.debug('Processed archer data:', archer);
    return archer;
  },
  
  /**
   * Add archer data from form
   * @param {Object} archer - Archer data object
   * @param {HTMLFormElement} form - Form element to reset
   * @param {boolean} isInlineForm - Whether data comes from inline form
   * @returns {Promise} Promise resolving when archer is added
   */
  addArcher: async function(archer, form, isInlineForm = false) {
    try {
      // Check if we have an active competition
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        UIHelpers.showNotification('Error', 'No active competition. Please select or create a competition first.');
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
        UIHelpers.showConfirmation('This archer already exists in the current competition. Update their score?', async () => {
          try {
            await ArcheryDataService.saveScore(archer);
            
            // Save competitor if checkbox is checked
            if (saveCompetitor) {
              await ArcheryDataService.saveCompetitor(archer);
            }
            
            UIHelpers.showNotification('Score Updated', 'Archer score has been updated successfully.');
            form.reset();
            
            if (isInlineForm) {
              // Hide inline form
              document.getElementById('inlineAddForm').style.display = 'none';
              document.getElementById('toggleInlineForm').setAttribute('aria-expanded', 'false');
              document.getElementById('toggleInlineForm').classList.add('collapsed');
              
              // Refresh the table
              const searchTerm = document.getElementById('searchInput').value.toLowerCase();
              await TableHandlers.refreshScoresTable(searchTerm, archer.name);
            } else {
              document.getElementById('archerName').focus();
            }
            
            // Refresh saved competitors dropdowns
            await FormHandlers.refreshSavedCompetitorsDropdowns();
            await ArcheryUIRenderer.renderResults();
          } catch (error) {
            console.error('Error updating archer:', error);
            UIHelpers.showNotification('Error', 'Failed to update archer. Please try again.');
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
          
          UIHelpers.showNotification('Score Added', 'New archer score has been added successfully.');
          form.reset();
          
          if (isInlineForm) {
            // Hide inline form
            document.getElementById('inlineAddForm').style.display = 'none';
            document.getElementById('toggleInlineForm').setAttribute('aria-expanded', 'false');
            document.getElementById('toggleInlineForm').classList.add('collapsed');
            
            // Refresh the table
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            await TableHandlers.refreshScoresTable(searchTerm, archer.name);
          } else {
            document.getElementById('archerName').focus();
          }
          
          // Refresh saved competitors dropdowns
          await FormHandlers.refreshSavedCompetitorsDropdowns();
          await ArcheryUIRenderer.renderResults();
        } catch (error) {
          console.error('Error adding archer:', error);
          UIHelpers.showNotification('Error', 'Failed to add archer. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error checking if archer exists:', error);
      UIHelpers.showNotification('Error', 'An error occurred. Please try again.');
    }
  },
  
  /**
   * Refresh saved competitors dropdowns
   * @returns {Promise} Promise resolving when dropdowns are refreshed
   */
  refreshSavedCompetitorsDropdowns: async function() {
    const savedCompetitorSelect = document.getElementById('savedCompetitorSelect');
    const inlineSavedCompetitorSelect = document.getElementById('inlineSavedCompetitorSelect');
    
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(savedCompetitorSelect);
    await ArcheryUIRenderer.populateSavedCompetitorsDropdown(inlineSavedCompetitorSelect);
  },
  
  /**
   * Set up form handlers for main and inline forms
   */
  setupFormHandlers: function() {
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
          UIHelpers.showNotification('Error', 'No active competition. Please select or create a competition first.');
          return;
        }
        
        // Process form data
        const archer = FormHandlers.processArcherData(false);
        await FormHandlers.addArcher(archer, this, false);
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
          UIHelpers.showNotification('Error', 'No active competition. Please select or create a competition first.');
          return;
        }
        
        // Process form data
        const archer = FormHandlers.processArcherData(true);
        await FormHandlers.addArcher(archer, this, true);
      });
      
      console.log('Inline form handler attached');
    } else {
      console.error('Could not find inlineScoreForm element');
    }
  }
};

// Make it available globally
window.FormHandlers = FormHandlers;
