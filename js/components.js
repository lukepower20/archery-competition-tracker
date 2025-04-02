/**
 * UI Components for Archery Competition Tracker
 * Provides reusable UI components for the application
 */
import { UIUtils } from './utilities.js';
import { DOMUtils } from './utilities.js';
import { UI } from './constants.js';

/**
 * DataTable component for displaying tabular data
 */
export const DataTable = {
  /**
   * Render a data table
   * @param {string} containerId - ID of the container element
   * @param {Array} columns - Array of column definitions
   * @param {Array} data - Array of data objects
   * @param {Object} options - Additional options
   * @returns {HTMLElement} The created table
   */
  render: function(containerId, columns, data, options = {}) {
    return UIUtils.createDataTable(containerId, columns, data, options);
  },
  
  /**
   * Create a paginated data table
   * @param {string} containerId - ID of the container element
   * @param {Array} columns - Array of column definitions
   * @param {Array} data - Array of data objects
   * @param {number} pageSize - Number of items per page
   * @param {Function} onPageChange - Page change callback
   * @returns {Object} Table control object
   */
  createPaginated: function(containerId, columns, data, pageSize = UI.DEFAULT_PAGE_SIZE, onPageChange = null) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    let currentPage = 1;
    const totalPages = Math.ceil(data.length / pageSize);
    
    // Default page change handler
    const defaultPageChange = (page) => {
      currentPage = page;
      renderCurrentPage();
    };
    
    // Use provided handler or default
    const pageChangeHandler = onPageChange || defaultPageChange;
    
    // Function to render the current page
    const renderCurrentPage = () => {
      const startIndex = (currentPage - 1) * pageSize;
      const pagedData = data.slice(startIndex, startIndex + pageSize);
      
      UIUtils.createDataTable(containerId, columns, pagedData, {
        pagination: {
          currentPage,
          totalPages,
          onPageChange: pageChangeHandler
        }
      });
    };
    
    // Initial render
    renderCurrentPage();
    
    // Return control object
    return {
      refresh: function(newData = null) {
        if (newData) {
          data = newData;
          currentPage = 1;
        }
        renderCurrentPage();
      },
      setPage: function(page) {
        currentPage = Math.max(1, Math.min(page, totalPages));
        renderCurrentPage();
      },
      getCurrentPage: function() {
        return currentPage;
      },
      getTotalPages: function() {
        return totalPages;
      }
    };
  }
};

/**
 * Modal component for creating and managing modals
 */
export const Modal = {
  /**
   * Create a modal
   * @param {Object} options - Modal options
   * @returns {Object} Modal control object
   */
  create: function(options = {}) {
    const {
      id = 'dynamicModal',
      title = 'Modal Title',
      content = '',
      size = '', // '', 'modal-sm', 'modal-lg', 'modal-xl'
      buttons = [],
      closeButton = true,
      backdrop = true,
      keyboard = true,
      onShow = null,
      onHide = null
    } = options;
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal element
    const modal = DOMUtils.createElement('div', {
      id,
      className: 'modal fade',
      tabindex: '-1',
      'aria-labelledby': `${id}Label`,
      'aria-hidden': 'true'
    });
    
    // Create modal dialog
    const modalDialog = DOMUtils.createElement('div', {
      className: `modal-dialog ${size}`
    });
    
    // Create modal content
    const modalContent = DOMUtils.createElement('div', {
      className: 'modal-content'
    });
    
    // Create modal header
    const modalHeader = DOMUtils.createElement('div', {
      className: 'modal-header'
    });
    
    const modalTitle = DOMUtils.createElement('h5', {
      className: 'modal-title',
      id: `${id}Label`
    }, title);
    
    modalHeader.appendChild(modalTitle);
    
    if (closeButton) {
      const closeBtn = DOMUtils.createElement('button', {
        type: 'button',
        className: 'btn-close',
        'data-bs-dismiss': 'modal',
        'aria-label': 'Close'
      });
      
      modalHeader.appendChild(closeBtn);
    }
    
    modalContent.appendChild(modalHeader);
    
    // Create modal body
    const modalBody = DOMUtils.createElement('div', {
      className: 'modal-body'
    }, content);
    
    modalContent.appendChild(modalBody);
    
    // Create modal footer if there are buttons
    if (buttons.length > 0) {
      const modalFooter = DOMUtils.createElement('div', {
        className: 'modal-footer'
      });
      
      buttons.forEach(button => {
        const {
          text = 'Button',
          type = 'secondary',
          dismiss = false,
          onClick = null
        } = button;
        
        const btn = DOMUtils.createElement('button', {
          type: 'button',
          className: `btn btn-${type}`
        }, text);
        
        if (dismiss) {
          btn.setAttribute('data-bs-dismiss', 'modal');
        }
        
        if (onClick) {
          btn.addEventListener('click', onClick);
        }
        
        modalFooter.appendChild(btn);
      });
      
      modalContent.appendChild(modalFooter);
    }
    
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    document.body.appendChild(modal);
    
    // Create Bootstrap modal instance
    const bootstrapModal = new bootstrap.Modal(modal, {
      backdrop,
      keyboard
    });
    
    // Add event listeners
    if (onShow) {
      modal.addEventListener('shown.bs.modal', onShow);
    }
    
    if (onHide) {
      modal.addEventListener('hidden.bs.modal', onHide);
    }
    
    // Return control object
    return {
      show: function() {
        bootstrapModal.show();
      },
      hide: function() {
        bootstrapModal.hide();
      },
      toggle: function() {
        bootstrapModal.toggle();
      },
      getElement: function() {
        return modal;
      },
      setTitle: function(newTitle) {
        modalTitle.textContent = newTitle;
      },
      setContent: function(newContent) {
        if (typeof newContent === 'string') {
          modalBody.innerHTML = newContent;
        } else if (newContent instanceof HTMLElement) {
          modalBody.innerHTML = '';
          modalBody.appendChild(newContent);
        }
      },
      dispose: function() {
        bootstrapModal.dispose();
        modal.remove();
      }
    };
  },
  
  /**
   * Create a confirmation modal
   * @param {Object} options - Confirmation options
   * @returns {Object} Modal control object
   */
  confirm: function(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmType = 'primary',
      size = '',
      onConfirm = null,
      onCancel = null,
      onDismiss = null
    } = options;
    
    return this.create({
      id: 'confirmationModal',
      title,
      content: message,
      size,
      buttons: [
        {
          text: cancelText,
          type: 'secondary',
          dismiss: true,
          onClick: () => {
            if (onCancel) onCancel();
          }
        },
        {
          text: confirmText,
          type: confirmType,
          dismiss: true,
          onClick: () => {
            if (onConfirm) onConfirm();
          }
        }
      ],
      onHide: () => {
        if (onDismiss) onDismiss();
      }
    });
  },
  
  /**
   * Create an alert modal
   * @param {Object} options - Alert options
   * @returns {Object} Modal control object
   */
  alert: function(options = {}) {
    const {
      title = 'Alert',
      message = '',
      buttonText = 'OK',
      buttonType = 'primary',
      size = '',
      onClose = null
    } = options;
    
    return this.create({
      id: 'alertModal',
      title,
      content: message,
      size,
      buttons: [
        {
          text: buttonText,
          type: buttonType,
          dismiss: true,
          onClick: () => {
            if (onClose) onClose();
          }
        }
      ]
    });
  }
};

/**
 * Toast component for notifications
 */
export const Toast = {
  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   */
  show: function(options = {}) {
    const {
      title = 'Notification',
      message = '',
      type = 'primary', // primary, success, danger, warning, info
      duration = 3000,
      position = 'bottom-end' // top-start, top-center, top-end, bottom-start, bottom-center, bottom-end
    } = options;
    
    // Use existing toast if available
    const existingToast = document.getElementById('notificationToast');
    if (existingToast) {
      const toastTitle = document.getElementById('toastTitle');
      const toastMessage = document.getElementById('toastMessage');
      
      if (toastTitle) toastTitle.textContent = title;
      if (toastMessage) toastMessage.textContent = message;
      
      // Update toast class for type
      existingToast.className = `toast border-${type}`;
      
      // Show the toast
      const toast = bootstrap.Toast.getOrCreateInstance(existingToast, {
        delay: duration
      });
      
      toast.show();
      return;
    }
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = DOMUtils.createElement('div', {
        className: 'toast-container position-fixed p-3'
      });
      
      // Set position
      switch (position) {
        case 'top-start':
          toastContainer.style.top = '0';
          toastContainer.style.left = '0';
          break;
        case 'top-center':
          toastContainer.style.top = '0';
          toastContainer.style.left = '50%';
          toastContainer.style.transform = 'translateX(-50%)';
          break;
        case 'top-end':
          toastContainer.style.top = '0';
          toastContainer.style.right = '0';
          break;
        case 'bottom-start':
          toastContainer.style.bottom = '0';
          toastContainer.style.left = '0';
          break;
        case 'bottom-center':
          toastContainer.style.bottom = '0';
          toastContainer.style.left = '50%';
          toastContainer.style.transform = 'translateX(-50%)';
          break;
        case 'bottom-end':
        default:
          toastContainer.style.bottom = '0';
          toastContainer.style.right = '0';
          break;
      }
      
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = DOMUtils.createElement('div', {
      className: `toast border-${type}`,
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true'
    });
    
    // Create toast header
    const toastHeader = DOMUtils.createElement('div', {
      className: 'toast-header'
    });
    
    // Add icon based on type
    let icon = 'info-circle';
    switch (type) {
      case 'success': icon = 'check-circle'; break;
      case 'danger': icon = 'exclamation-circle'; break;
      case 'warning': icon = 'exclamation-triangle'; break;
      default: icon = 'info-circle';
    }
    
    const iconElement = DOMUtils.createElement('i', {
      className: `bi bi-${icon} me-2 text-${type}`
    });
    
    toastHeader.appendChild(iconElement);
    
    // Add title
    const titleElement = DOMUtils.createElement('strong', {
      className: 'me-auto'
    }, title);
    
    toastHeader.appendChild(titleElement);
    
    // Add close button
    const closeButton = DOMUtils.createElement('button', {
      type: 'button',
      className: 'btn-close',
      'data-bs-dismiss': 'toast',
      'aria-label': 'Close'
    });
    
    toastHeader.appendChild(closeButton);
    toast.appendChild(toastHeader);
    
    // Create toast body
    const toastBody = DOMUtils.createElement('div', {
      className: 'toast-body'
    }, message);
    
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, {
      delay: duration
    });
    
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  },
  
  /**
   * Show a success toast
   * @param {string} message - Toast message
   * @param {string} title - Toast title
   */
  success: function(message, title = 'Success') {
    this.show({
      title,
      message,
      type: 'success'
    });
  },
  
  /**
   * Show an error toast
   * @param {string} message - Toast message
   * @param {string} title - Toast title
   */
  error: function(message, title = 'Error') {
    this.show({
      title,
      message,
      type: 'danger'
    });
  },
  
  /**
   * Show a warning toast
   * @param {string} message - Toast message
   * @param {string} title - Toast title
   */
  warning: function(message, title = 'Warning') {
    this.show({
      title,
      message,
      type: 'warning'
    });
  },
  
  /**
   * Show an info toast
   * @param {string} message - Toast message
   * @param {string} title - Toast title
   */
  info: function(message, title = 'Information') {
    this.show({
      title,
      message,
      type: 'info'
    });
  }
};

/**
 * Form component for creating and managing forms
 */
export const Form = {
  /**
   * Create a form with validation
   * @param {Object} options - Form options
   * @returns {Object} Form control object
   */
  create: function(options = {}) {
    const {
      id = 'dynamicForm',
      fields = [],
      buttons = [],
      onSubmit = null,
      onReset = null,
      className = ''
    } = options;
    
    // Create form element
    const form = DOMUtils.createElement('form', {
      id,
      className: `needs-validation ${className}`,
      novalidate: 'novalidate'
    });
    
    // Add fields
    fields.forEach(field => {
      const {
        type = 'text',
        name,
        label,
        value = '',
        placeholder = '',
        required = false,
        disabled = false,
        readonly = false,
        options = [],
        min = '',
        max = '',
        step = '',
        pattern = '',
        helpText = '',
        className = '',
        containerClass = 'mb-3',
        labelClass = 'form-label',
        inputClass = 'form-control',
        validFeedback = 'Looks good!',
        invalidFeedback = 'Please provide a valid value.'
      } = field;
      
      // Create field container
      const container = DOMUtils.createElement('div', {
        className: containerClass
      });
      
      // Create label if provided
      if (label) {
        const labelElement = DOMUtils.createElement('label', {
          for: name,
          className: labelClass
        }, label);
        
        if (required) {
          const requiredSpan = DOMUtils.createElement('span', {
            className: 'text-danger ms-1'
          }, '*');
          
          labelElement.appendChild(requiredSpan);
        }
        
        container.appendChild(labelElement);
      }
      
      // Create input element based on type
      let input;
      
      switch (type) {
        case 'select':
          input = DOMUtils.createElement('select', {
            id: name,
            name,
            className: `${inputClass} ${className}`,
            required: required ? 'required' : null,
            disabled: disabled ? 'disabled' : null,
            readonly: readonly ? 'readonly' : null
          });
          
          // Add options
          options.forEach(option => {
            const optionElement = DOMUtils.createElement('option', {
              value: option.value,
              selected: option.value === value ? 'selected' : null
            }, option.label);
            
            input.appendChild(optionElement);
          });
          break;
          
        case 'textarea':
          input = DOMUtils.createElement('textarea', {
            id: name,
            name,
            className: `${inputClass} ${className}`,
            placeholder,
            required: required ? 'required' : null,
            disabled: disabled ? 'disabled' : null,
            readonly: readonly ? 'readonly' : null,
            rows: field.rows || 3
          }, value);
          break;
          
        case 'checkbox':
          const checkContainer = DOMUtils.createElement('div', {
            className: 'form-check'
          });
          
          input = DOMUtils.createElement('input', {
            type,
            id: name,
            name,
            className: `form-check-input ${className}`,
            checked: value ? 'checked' : null,
            required: required ? 'required' : null,
            disabled: disabled ? 'disabled' : null,
            readonly: readonly ? 'readonly' : null
          });
          
          const checkLabel = DOMUtils.createElement('label', {
            for: name,
            className: 'form-check-label'
          }, label);
          
          checkContainer.appendChild(input);
          checkContainer.appendChild(checkLabel);
          container.innerHTML = ''; // Remove the label we added earlier
          container.appendChild(checkContainer);
          break;
          
        case 'radio':
          const radioContainer = DOMUtils.createElement('div', {
            className: ''
          });
          
          // Add label at the top for radio groups
          if (label) {
            const radioGroupLabel = DOMUtils.createElement('div', {
              className: labelClass
            }, label);
            
            radioContainer.appendChild(radioGroupLabel);
          }
          
          // Add radio options
          options.forEach(option => {
            const radioItemContainer = DOMUtils.createElement('div', {
              className: 'form-check'
            });
            
            const radioInput = DOMUtils.createElement('input', {
              type: 'radio',
              id: `${name}_${option.value}`,
              name,
              value: option.value,
              className: `form-check-input ${className}`,
              checked: option.value === value ? 'checked' : null,
              required: required ? 'required' : null,
              disabled: disabled ? 'disabled' : null
            });
            
            const radioLabel = DOMUtils.createElement('label', {
              for: `${name}_${option.value}`,
              className: 'form-check-label'
            }, option.label);
            
            radioItemContainer.appendChild(radioInput);
            radioItemContainer.appendChild(radioLabel);
            radioContainer.appendChild(radioItemContainer);
          });
          
          container.innerHTML = ''; // Remove the label we added earlier
          container.appendChild(radioContainer);
          input = radioContainer.querySelector('input'); // For validation
          break;
          
        default:
          // Default to text input
          input = DOMUtils.createElement('input', {
            type,
            id: name,
            name,
            className: `${inputClass} ${className}`,
            value,
            placeholder,
            required: required ? 'required' : null,
            disabled: disabled ? 'disabled' : null,
            readonly: readonly ? 'readonly' : null,
            min,
            max,
            step,
            pattern
          });
          break;
      }
      
      // Don't add input again for checkbox and radio
      if (type !== 'checkbox' && type !== 'radio') {
        container.appendChild(input);
      }
      
      // Add help text if provided
      if (helpText) {
        const helpTextElement = DOMUtils.createElement('div', {
          className: 'form-text'
        }, helpText);
        
        container.appendChild(helpTextElement);
      }
      
      // Add validation feedback
      if (required || pattern || min || max) {
        const validFeedbackElement = DOMUtils.createElement('div', {
          className: 'valid-feedback'
        }, validFeedback);
        
        const invalidFeedbackElement = DOMUtils.createElement('div', {
          className: 'invalid-feedback'
        }, invalidFeedback);
        
        container.appendChild(validFeedbackElement);
        container.appendChild(invalidFeedbackElement);
      }
      
      form.appendChild(container);
    });
    
    // Add buttons container
    if (buttons.length > 0) {
      const buttonsContainer = DOMUtils.createElement('div', {
        className: 'mt-3'
      });
      
      buttons.forEach(button => {
        const {
          type = 'button',
          text = 'Button',
          buttonType = 'primary',
          className = '',
          onClick = null
        } = button;
        
        const btn = DOMUtils.createElement('button', {
          type,
          className: `btn btn-${buttonType} ${className} me-2`
        }, text);
        
        if (onClick) {
          btn.addEventListener('click', onClick);
        }
        
        buttonsContainer.appendChild(btn);
      });
      
      form.appendChild(buttonsContainer);
    }
    
    // Add form validation
    form.addEventListener('submit', function(event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      form.classList.add('was-validated');
      
      if (form.checkValidity() && onSubmit) {
        onSubmit(event, DOMUtils.getFormValues(id));
      }
    });
    
    // Add reset handler
    if (onReset) {
      form.addEventListener('reset', function(event) {
        onReset(event);
        form.classList.remove('was-validated');
      });
    }
    
    // Return form control object
    return {
      getElement: function() {
        return form;
      },
      getValue: function(fieldName) {
        const field = form.elements[fieldName];
        if (!field) return null;
        
        if (field.type === 'checkbox') {
          return field.checked;
        } else if (field.type === 'radio') {
          const checkedRadio = form.querySelector(`input[name="${fieldName}"]:checked`);
          return checkedRadio ? checkedRadio.value : null;
        } else {
          return field.value;
        }
      },
      setValue: function(fieldName, value) {
        const field = form.elements[fieldName];
        if (!field) return;
        
        if (field.type === 'checkbox') {
          field.checked = !!value;
        } else if (field.type === 'radio') {
          const radio = form.querySelector(`input[name="${fieldName}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = value;
        }
      },
      reset: function() {
        form.reset();
        form.classList.remove('was-validated');
      },
      validate: function() {
        form.classList.add('was-validated');
        return form.checkValidity();
      },
      getValues: function() {
        return DOMUtils.getFormValues(id);
      },
      setValues: function(values) {
        for (const key in values) {
          this.setValue(key, values[key]);
        }
      }
    };
  }
};

// Bootstrap is loaded globally in the HTML file

// Make components available globally
window.DataTable = DataTable;
window.Modal = Modal;
window.Toast = Toast;
window.Form = Form;
