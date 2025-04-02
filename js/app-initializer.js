/**
 * Application Initializer for Archery Competition Tracker
 * Handles application startup and initialization
 */
import { UIHelpers } from './ui-helpers.js';
import { EventHandlers } from './event-handlers.js';
import { TableHandlers } from './table-handlers.js';
import { ArcheryDataService } from './data-service.js';
// Bootstrap is loaded globally in the HTML file

// Import all other modules to ensure they're loaded
import './constants.js';
import './models.js';
import './utilities.js';
import './components.js';
import './ui-renderer.js';
import './export-service.js';
import './debug-helper.js';
import './sync-service.js';
import './sync-ui-components.js';
import './dashboard.js';

export const AppInitializer = {
  /**
   * Initialize the application
   * @returns {Promise} Promise resolving when initialization is complete
   */
  initialize: async function() {
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
    
    // Initialize UI components
    await UIHelpers.initializeDropdowns();
    await EventHandlers.initializeCompetitionSelector();
    
    // Initialize event listeners
    EventHandlers.initializeEventListeners();
    
    // Initialize UI with data
    try {
      // Render scores table and results
      await TableHandlers.refreshScoresTable();
      console.log('Initial scores table rendered');
    } catch (error) {
      console.error('Error during initial rendering:', error);
    }
    
    console.log('Application initialization complete');
  }
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  AppInitializer.initialize().catch(error => {
    console.error('Error during application initialization:', error);
    UIHelpers.showNotification('Initialization Error', 'There was an error initializing the application. Some features may not work correctly.');
  });
});

// For backward compatibility during migration
if (typeof window !== 'undefined') {
  window.AppInitializer = AppInitializer;
}
