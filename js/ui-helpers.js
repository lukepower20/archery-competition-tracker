/**
 * UI Helpers for Archery Competition Tracker
 * Provides common UI utility functions and notifications
 */

const UIHelpers = {
  /**
   * Show toast notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  showNotification: function(title, message) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    const notificationToast = bootstrap.Toast.getOrCreateInstance(document.getElementById('notificationToast'));
    notificationToast.show();
    UIHelpers.announceToScreenReader(message);
  },
  
  /**
   * Show confirmation modal
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Function to call when confirmed
   */
  showConfirmation: function(message, onConfirm) {
    document.getElementById('confirmationModalBody').textContent = message;
    
    // Remove old event listener if exists
    const confirmBtn = document.getElementById('confirmationModalConfirm');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add new event listener
    newConfirmBtn.addEventListener('click', () => {
      const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
      confirmationModal.hide();
      onConfirm();
    });
    
    const confirmationModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmationModal'));
    confirmationModal.show();
  },
  
  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {boolean} temporary - Whether to remove message after timeout
   */
  announceToScreenReader: function(message, temporary = true) {
    const statusMessages = document.getElementById('statusMessages');
    statusMessages.textContent = message;
    statusMessages.setAttribute('aria-hidden', 'false');
    
    if (temporary) {
      setTimeout(() => {
        statusMessages.textContent = '';
        statusMessages.setAttribute('aria-hidden', 'true');
      }, 3000);
    }
  },
  
  /**
   * Initialize dropdown elements
   * @returns {Promise} Promise resolving when initialization is complete
   */
  initializeDropdowns: async function() {
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
  },
  
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

// Make it available globally
window.UIHelpers = UIHelpers;
