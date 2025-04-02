/**
 * Utilities for Archery Competition Tracker
 * Provides helper functions, error handling, and logging
 */
import { UI, ERRORS } from './constants.js';

/**
 * Error Handler for centralized error management
 */
export const ErrorHandler = {
  /**
   * Handle an error with consistent logging and user feedback
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @returns {Object} Result object with success flag and message
   */
  handleError: function(error, context) {
    Logger.error(`Error in ${context}:`, error);
    
    // Show user-friendly message
    this.showUserMessage(error, context);
    
    return { 
      success: false, 
      message: error.message || 'An unexpected error occurred' 
    };
  },
  
  /**
   * Show a user-friendly error message
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   */
  showUserMessage: function(error, context) {
    // Use existing notification system if available
    if (window.showNotification) {
      window.showNotification('Error', this.getUserFriendlyMessage(error, context));
      return;
    }
    
    // Fallback to toast if available
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    if (toastTitle && toastMessage) {
      toastTitle.textContent = 'Error';
      toastMessage.textContent = this.getUserFriendlyMessage(error, context);
      // Bootstrap is loaded globally in the HTML file
      const toast = bootstrap.Toast.getOrCreateInstance(document.getElementById('notificationToast'));
      toast.show();
      return;
    }
    
    // Last resort: console
    console.error(this.getUserFriendlyMessage(error, context));
  },
  
  /**
   * Get a user-friendly error message
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @returns {string} User-friendly error message
   */
  getUserFriendlyMessage: function(error, context) {
    // Map technical errors to user-friendly messages
    const errorMap = {
      'IndexedDB not available': 'Your browser does not support offline storage. Some features may not work properly.',
      'Database not initialized': 'Storage system is not ready. Please refresh the page.',
      'No active competition': 'Please select or create a competition first.',
      'Competition not found': 'The selected competition could not be found.',
      'Archer not found': 'The selected archer could not be found.'
    };
    
    return errorMap[error.message] || `Error in ${context}: ${error.message}`;
  }
};

/**
 * Logger for consistent logging throughout the application
 */
export const Logger = {
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  
  currentLevel: 1, // INFO by default
  
  /**
   * Set the logging level
   * @param {number} level - The logging level to set
   */
  setLevel: function(level) {
    this.currentLevel = level;
  },
  
  /**
   * Log a debug message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  debug: function(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  info: function(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  warn: function(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  error: function(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
};

/**
 * UI Utilities for common UI operations
 */
export const UIUtils = {
  /**
   * Show a loading indicator in a container
   * @param {string} containerId - ID of the container element
   * @param {string} message - Optional loading message
   */
  showLoading: function(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">${message}</span>
        </div>
        <p class="mt-2">${message}</p>
      </div>
    `;
  },
  
  /**
   * Hide the loading indicator and set content
   * @param {string} containerId - ID of the container element
   * @param {string} content - HTML content to set
   */
  hideLoading: function(containerId, content) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = content;
  },
  
  /**
   * Announce a message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announceToScreenReader: function(message, priority = 'polite') {
    const statusMessages = document.getElementById('statusMessages');
    if (!statusMessages) return;
    
    // Create a new element for each announcement to ensure it's read
    const announcement = document.createElement('div');
    announcement.textContent = message;
    announcement.setAttribute('aria-live', priority);
    
    // Clear previous announcements
    statusMessages.innerHTML = '';
    statusMessages.appendChild(announcement);
    
    // Remove after a delay
    setTimeout(() => {
      if (statusMessages.contains(announcement)) {
        statusMessages.removeChild(announcement);
      }
    }, UI.NOTIFICATION_DURATION);
  },
  
  /**
   * Create a data table with common functionality
   * @param {string} containerId - ID of the container element
   * @param {Array} columns - Array of column definitions
   * @param {Array} data - Array of data objects
   * @param {Object} options - Additional options
   * @returns {HTMLElement} The created table element
   */
  createDataTable: function(containerId, columns, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    const table = document.createElement('table');
    table.className = 'table table-striped';
    if (options.responsive !== false) {
      table.className += ' table-responsive';
    }
    
    // Add table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.label;
      if (column.width) th.style.width = column.width;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    
    data.forEach(item => {
      const row = document.createElement('tr');
      
      columns.forEach(column => {
        const cell = document.createElement('td');
        
        if (column.render) {
          // Custom renderer
          cell.innerHTML = column.render(item);
        } else {
          // Default renderer
          cell.textContent = item[column.field] || '';
        }
        
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
    
    // Add pagination if needed
    if (options.pagination) {
      this.renderPagination(container, options.pagination);
    }
    
    return table;
  },
  
  /**
   * Render pagination controls
   * @param {HTMLElement} container - Container element
   * @param {Object} pagination - Pagination options
   */
  renderPagination: function(container, pagination) {
    const { currentPage, totalPages, onPageChange } = pagination;
    
    const paginationContainer = document.createElement('nav');
    paginationContainer.setAttribute('aria-label', 'Table pagination');
    
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.setAttribute('aria-label', 'Previous');
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    
    if (currentPage > 1) {
      prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        onPageChange(currentPage - 1);
      });
    }
    
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
      
      const pageLink = document.createElement('a');
      pageLink.className = 'page-link';
      pageLink.href = '#';
      pageLink.textContent = i;
      
      if (i !== currentPage) {
        pageLink.addEventListener('click', (e) => {
          e.preventDefault();
          onPageChange(i);
        });
      }
      
      pageLi.appendChild(pageLink);
      ul.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.setAttribute('aria-label', 'Next');
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    
    if (currentPage < totalPages) {
      nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        onPageChange(currentPage + 1);
      });
    }
    
    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);
    
    paginationContainer.appendChild(ul);
    container.appendChild(paginationContainer);
  }
};

/**
 * State Management for application state
 */
export const AppState = (function() {
  let state = {
    activeCompetition: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    currentUser: null
  };
  
  const listeners = [];
  
  /**
   * Notify all listeners of state changes
   * @param {Array} changedProps - Array of property names that changed
   */
  function notifyListeners(changedProps) {
    listeners.forEach(listener => listener(state, changedProps));
  }
  
  return {
    /**
     * Get the current state
     * @returns {Object} Copy of the current state
     */
    getState: () => ({...state}),
    
    /**
     * Update the state
     * @param {Object} newState - New state properties to set
     */
    setState: (newState) => {
      const changedProps = [];
      for (const key in newState) {
        if (state[key] !== newState[key]) {
          changedProps.push(key);
          state[key] = newState[key];
        }
      }
      if (changedProps.length > 0) {
        notifyListeners(changedProps);
      }
    },
    
    /**
     * Subscribe to state changes
     * @param {Function} listener - Listener function
     * @returns {Function} Unsubscribe function
     */
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    }
  };
})();

/**
 * DOM Utilities for working with the DOM
 */
export const DOMUtils = {
  /**
   * Add event delegation to a container
   * @param {string} containerId - ID of the container element
   * @param {string} selector - CSS selector for target elements
   * @param {string} eventType - Type of event to listen for
   * @param {Function} handler - Event handler function
   */
  delegateEvent: function(containerId, selector, eventType, handler) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener(eventType, function(event) {
      const target = event.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, event, target);
      }
    });
  },
  
  /**
   * Create an element with attributes and content
   * @param {string} tag - Tag name
   * @param {Object} attributes - Element attributes
   * @param {string|HTMLElement|Array} content - Element content
   * @returns {HTMLElement} The created element
   */
  createElement: function(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    for (const key in attributes) {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'style' && typeof attributes[key] === 'object') {
        Object.assign(element.style, attributes[key]);
      } else {
        element.setAttribute(key, attributes[key]);
      }
    }
    
    // Set content
    if (content !== null) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        element.appendChild(content);
      } else if (Array.isArray(content)) {
        content.forEach(item => {
          if (typeof item === 'string') {
            element.innerHTML += item;
          } else if (item instanceof HTMLElement) {
            element.appendChild(item);
          }
        });
      }
    }
    
    return element;
  },
  
  /**
   * Get form values as an object
   * @param {string} formId - ID of the form element
   * @returns {Object} Form values
   */
  getFormValues: function(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const formData = new FormData(form);
    const values = {};
    
    for (const [key, value] of formData.entries()) {
      values[key] = value;
    }
    
    return values;
  }
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate an archer object
   * @param {Object} archer - Archer object to validate
   * @returns {Object} Validation result
   */
  validateArcher: function(archer) {
    const errors = [];
    
    if (!archer.name) errors.push(ERRORS.ARCHER_NAME_REQUIRED);
    if (!archer.category) errors.push('Category is required');
    if (!archer.age) errors.push('Age range is required');
    if (isNaN(archer.day1) || archer.day1 < 0) errors.push('Day 1 score must be a positive number');
    if (archer.day2 !== undefined && (isNaN(archer.day2) || archer.day2 < 0)) errors.push('Day 2 score must be a positive number');
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * Validate a competition object
   * @param {Object} competition - Competition object to validate
   * @returns {Object} Validation result
   */
  validateCompetition: function(competition) {
    const errors = [];
    
    if (!competition.name) errors.push(ERRORS.COMPETITION_NAME_REQUIRED);
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * Show validation errors in a form
   * @param {string} formId - ID of the form element
   * @param {Array} errors - Array of error messages
   */
  showValidationErrors: function(formId, errors) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Remove existing error messages
    const existingErrors = form.querySelectorAll('.validation-error');
    existingErrors.forEach(el => el.remove());
    
    // Add error container if not exists
    let errorContainer = form.querySelector('.validation-errors');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.className = 'validation-errors alert alert-danger mt-3';
      form.prepend(errorContainer);
    }
    
    // Add errors
    errorContainer.innerHTML = '';
    if (errors.length > 0) {
      const errorList = document.createElement('ul');
      errorList.className = 'mb-0';
      
      errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        errorList.appendChild(li);
      });
      
      errorContainer.appendChild(errorList);
    } else {
      errorContainer.remove();
    }
  }
};

// For backward compatibility during migration
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
  window.Logger = Logger;
  window.UIUtils = UIUtils;
  window.AppState = AppState;
  window.DOMUtils = DOMUtils;
  window.ValidationUtils = ValidationUtils;
}
