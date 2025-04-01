/**
 * Archery UI Renderer
 * Handles all UI rendering and display logic with async support for IndexedDB
 */
const ArcheryUIRenderer = {
  /**
   * Render the competition selector dropdown
   * @param {HTMLElement} container - Container element for the dropdown
   * @returns {Promise} Promise resolving when rendering is complete
   */
  renderCompetitionSelector: async function(container) {
    try {
      // Get all competitions
      const competitions = await ArcheryDataService.getCompetitions();
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      
      if (!competitions || competitions.length === 0) {
        container.innerHTML = `
          <div class="alert alert-warning" role="alert">
            <p>No competitions found. Please create a competition first.</p>
            <button type="button" class="btn btn-primary btn-sm" id="createNewCompetitionBtn">
              <i class="bi bi-plus-circle" aria-hidden="true"></i> Create New Competition
            </button>
          </div>
        `;
        return;
      }
      
      // Build the HTML for the dropdown
      let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="input-group me-2">
            <span class="input-group-text" id="competition-selector-label">
              <i class="bi bi-trophy" aria-hidden="true"></i>
            </span>
            <select class="form-select" id="competitionSelect" aria-labelledby="competition-selector-label">
      `;
      
      // Add options for each competition
      competitions.forEach(competition => {
        const isActive = activeCompetition && competition.id === activeCompetition.id;
        const formattedDate = new Date(competition.date).toLocaleDateString();
        
        html += `
          <option value="${competition.id}" ${isActive ? 'selected' : ''}>
            ${competition.name} (${formattedDate})
          </option>
        `;
      });
      
      html += `
            </select>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-success" id="createCompetitionBtn">
              <i class="bi bi-plus-circle" aria-hidden="true"></i> New
            </button>
            <button type="button" class="btn btn-warning" id="editCompetitionBtn">
              <i class="bi bi-pencil" aria-hidden="true"></i> Edit
            </button>
            <button type="button" class="btn btn-danger" id="deleteCompetitionBtn">
              <i class="bi bi-trash" aria-hidden="true"></i> Delete
            </button>
          </div>
        </div>
      `;
      
      // Insert the HTML into the container
      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering competition selector:', error);
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Error loading competitions. Please try refreshing the page.
        </div>
      `;
    }
  },
  
  /**
   * Render the list of competitions for management
   * @param {HTMLElement} container - Container to render into
   * @param {string} searchTerm - Optional search term to filter by
   * @returns {Promise} Promise resolving when rendering is complete
   */
  renderCompetitionsList: async function(container, searchTerm = '') {
    try {
      const competitions = await ArcheryDataService.getCompetitions();
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      
      if (competitions.length === 0) {
        container.innerHTML = `
          <div class="alert alert-info">
            <p>No competitions found. Create your first competition to get started.</p>
          </div>
        `;
        return;
      }
      
      // Filter by search term if provided
      const filteredCompetitions = searchTerm ? 
        competitions.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : 
        competitions;
      
      if (filteredCompetitions.length === 0) {
        container.innerHTML = `
          <p>No competitions found matching "${searchTerm}". Try a different search term.</p>
        `;
        return;
      }
      
      // Create the HTML for the competitions list
      let html = `
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Description</th>
                <th>Archers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Populate the competitions
      for (const competition of filteredCompetitions) {
        const formattedDate = new Date(competition.date).toLocaleDateString();
        const isActive = activeCompetition && competition.id === activeCompetition.id;
        
        // Count archers in this competition
        let archerCount = 0;
        try {
          // Temporarily set as active to get count
          if (!isActive) {
            await ArcheryDataService.setActiveCompetition(competition.id);
            const archers = await ArcheryDataService.getAllScores();
            archerCount = archers.length;
            // Restore the original active competition
            if (activeCompetition) {
              await ArcheryDataService.setActiveCompetition(activeCompetition.id);
            }
          } else {
            // Already active, just get the count
            const archers = await ArcheryDataService.getAllScores();
            archerCount = archers.length;
          }
        } catch (error) {
          console.error('Error counting archers for competition:', error);
        }
        
        html += `
          <tr data-competition-id="${competition.id}" class="${isActive ? 'table-primary' : ''}">
            <td>${competition.name}</td>
            <td>${formattedDate}</td>
            <td>${competition.description || ''}</td>
            <td>${archerCount} archers</td>
            <td>
              ${isActive ? 
                '<span class="badge bg-primary">Active</span>' : 
                '<button class="btn btn-sm btn-outline-primary activate-competition-btn">Activate</button>'}
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-warning edit-competition-btn">
                  <i class="bi bi-pencil" aria-hidden="true"></i> Edit
                </button>
                <button type="button" class="btn btn-danger delete-competition-btn" ${isActive ? 'disabled' : ''}>
                  <i class="bi bi-trash" aria-hidden="true"></i> Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      }
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering competitions list:', error);
      container.innerHTML = `
        <div class="alert alert-danger">
          Error loading competitions. Please try refreshing the page.
        </div>
      `;
    }
  },
  
  /**
   * Create or update a competition modal
   * @param {Object|null} competition - Competition to edit, or null for new
   * @returns {HTMLElement} The modal element
   */
  createCompetitionModal: function(competition = null) {
    // Create a modal for adding/editing competitions
    const modalId = 'competitionModal';
    const isEdit = !!competition;
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create the modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', `${modalId}Label`);
    modal.setAttribute('aria-hidden', 'true');
    
    // Format the date properly for the input
    let formattedDate = '';
    if (competition && competition.date) {
      const date = new Date(competition.date);
      formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } else {
      formattedDate = new Date().toISOString().split('T')[0];
    }
    
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">
              ${isEdit ? 'Edit Competition' : 'Create New Competition'}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="competitionForm">
              <input type="hidden" id="competitionId" value="${isEdit ? competition.id : ''}">
              
              <div class="mb-3">
                <label for="competitionName" class="form-label">Competition Name</label>
                <input type="text" class="form-control" id="competitionName" 
                  value="${isEdit ? competition.name : ''}" required>
              </div>
              
              <div class="mb-3">
                <label for="competitionDate" class="form-label">Date</label>
                <input type="date" class="form-control" id="competitionDate" 
                  value="${formattedDate}" required>
              </div>
              
              <div class="mb-3">
                <label for="competitionDescription" class="form-label">Description</label>
                <textarea class="form-control" id="competitionDescription" rows="3">${isEdit && competition.description ? competition.description : ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="saveCompetitionBtn">
              ${isEdit ? 'Update' : 'Create'} Competition
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  },
  
  /**
   * Render the scores table with search and highlighting
   * @param {string} searchTerm - Optional search term to filter results
   * @param {string} highlightName - Optional name to highlight in the table
   * @returns {Promise} Promise resolving when rendering is complete
   */
  // This function needs to be updated to include the membership ID field
renderScoresTable: async function(searchTerm = '', highlightName = null) {
  const scoresTable = document.getElementById('scoresTable');
  
  try {
    // Check if we have an active competition
    const activeCompetition = ArcheryDataService.getActiveCompetition();
    if (!activeCompetition) {
      scoresTable.innerHTML = `
        <div class="alert alert-warning">
          <p>No active competition selected. Please select or create a competition first.</p>
        </div>
      `;
      return;
    }
    
    // Get scores from the data service (now async)
    const scores = await ArcheryDataService.getAllScores();
    
    if (scores.length === 0) {
      scoresTable.innerHTML = `
        <p>No scores found in ${activeCompetition.name}. Add some scores first!</p>
      `;
      return;
    }
    
    const filteredScores = searchTerm ? 
      scores.filter(s => s.name.toLowerCase().includes(searchTerm)) : 
      scores;
    
    if (filteredScores.length === 0) {
      scoresTable.innerHTML = `<p>No archers found matching "${searchTerm}". Try a different search term.</p>`;
      return;
    }
    
    let html = `
      <table class="table table-striped" aria-label="Archer scores table">
        <caption>List of all registered archers and their scores in ${activeCompetition.name}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Club</th>
            <th scope="col">Membership #</th>
            <th scope="col">Category</th>
            <th scope="col">Age</th>
            <th scope="col">Day 1</th>
            <th scope="col">Day 2</th>
            <th scope="col">Total</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    filteredScores.forEach((score, index) => {
      const isHighlighted = highlightName && score.name === highlightName;
      const rowClass = isHighlighted ? 'highlight-row' : '';
      
      html += `
        <tr id="row-${index}" data-index="${index}" class="${rowClass}">
          <td><span class="view-mode">${score.name}</span><input type="text" class="form-control edit-mode" value="${score.name}" style="display:none;" aria-label="Edit Name"></td>
          <td><span class="view-mode">${score.club || ''}</span><input type="text" class="form-control edit-mode" value="${score.club || ''}" style="display:none;" aria-label="Edit Club"></td>
          <td><span class="view-mode">${score.membershipId || ''}</span><input type="text" class="form-control edit-mode" value="${score.membershipId || ''}" style="display:none;" aria-label="Edit Membership ID"></td>
          <td>
            <span class="view-mode">${score.category}</span>
            <select class="form-select edit-mode" style="display:none;" aria-label="Edit Category">
              ${ArcheryDataService.categories.map(cat => `<option value="${cat}" ${cat === score.category ? 'selected' : ''}>${cat}</option>`).join('')}
            </select>
          </td>
          <td>
            <span class="view-mode">${score.age}</span>
            <select class="form-select edit-mode" style="display:none;" aria-label="Edit Age Range">
              ${ArcheryDataService.ageRanges.map(age => `<option value="${age}" ${age === score.age ? 'selected' : ''}>${age}</option>`).join('')}
            </select>
          </td>
          <td><span class="view-mode">${score.day1}</span><input type="number" min="0" class="form-control edit-mode" value="${score.day1}" style="display:none;" aria-label="Edit Day 1 Score"></td>
          <td><span class="view-mode">${score.day2 || 0}</span><input type="number" min="0" class="form-control edit-mode" value="${score.day2 || 0}" style="display:none;" aria-label="Edit Day 2 Score"></td>
          <td><strong>${score.total}</strong></td>
          <td>
            <div class="normal-controls">
              <button class="btn btn-sm btn-warning edit-btn" data-index="${index}" aria-label="Edit ${score.name}">
                <i class="bi bi-pencil" aria-hidden="true"></i> Edit
              </button>
              <button class="btn btn-sm btn-danger delete-btn" data-index="${index}" aria-label="Delete ${score.name}">
                <i class="bi bi-trash" aria-hidden="true"></i> Delete
              </button>
            </div>
            <div class="edit-controls" style="display:none;">
              <button class="btn btn-sm btn-success save-btn" data-index="${index}" aria-label="Save changes for ${score.name}">
                <i class="bi bi-check-lg" aria-hidden="true"></i> Save
              </button>
              <button class="btn btn-sm btn-secondary cancel-btn" data-index="${index}" aria-label="Cancel editing ${score.name}">
                <i class="bi bi-x-lg" aria-hidden="true"></i> Cancel
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    scoresTable.innerHTML = html;
    
    // If highlighted name exists, scroll to it
    if (highlightName) {
      const highlightedRow = document.querySelector('.highlight-row');
      if (highlightedRow) {
        highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } catch (error) {
    console.error('Error rendering scores table:', error);
    scoresTable.innerHTML = '<p>Error loading scores. Please try refreshing the page.</p>';
  }
},
  
  /**
   * Render competition results with grouping and positioning
   * @returns {Promise} Promise resolving when rendering is complete
   */
  renderResults: async function() {
    const resultsContent = document.getElementById('resultsContent');
    
    try {
      // Check if we have an active competition
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        resultsContent.innerHTML = `
          <div class="alert alert-warning">
            <p>No active competition selected. Please select or create a competition first.</p>
          </div>
        `;
        return;
      }
      
      // Get scores from the data service (now async)
      const scores = await ArcheryDataService.getAllScores();
      
      if (scores.length === 0) {
        resultsContent.innerHTML = `
          <p>No scores found in ${activeCompetition.name}. Add some scores first!</p>
        `;
        return;
      }
      
      // Group scores by category and age
      const categories = {};
      scores.forEach(score => {
        const key = `${score.category}-${score.age}`;
        if (!categories[key]) {
          categories[key] = {
            category: score.category,
            age: score.age,
            archers: []
          };
        }
        categories[key].archers.push(score);
      });
      
      // Check for draws
      const draws = [];
      
      Object.values(categories).forEach(category => {
        // Sort archers by score (descending)
        category.archers.sort((a, b) => b.total - a.total);
        
        // Find draws in top 3
        const topScores = {};
        category.archers.slice(0, 3).forEach(archer => {
          if (!topScores[archer.total]) {
            topScores[archer.total] = [];
          }
          topScores[archer.total].push(archer.name);
        });
        
        // Record draws
        Object.entries(topScores).forEach(([score, names]) => {
          if (names.length > 1) {
            const position = category.archers.findIndex(a => a.total === parseInt(score)) + 1;
            draws.push({
              category: category.category,
              age: category.age,
              position: position,
              score: score,
              archers: names
            });
          }
        });
      });
      
      // Start building HTML
      let html = `
        <div class="mb-4">
          <h3>${activeCompetition.name}</h3>
          <p class="text-muted">
            ${new Date(activeCompetition.date).toLocaleDateString()}
            ${activeCompetition.description ? ` - ${activeCompetition.description}` : ''}
          </p>
        </div>
      `;
      
      // Draw warnings
      if (draws.length > 0) {
        html += `
          <div class="alert alert-warning mb-4" role="alert">
            <h3 class="h5"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Draws Detected</h3>
            <p>The following draws need to be resolved:</p>
            <ul>
              ${draws.map(draw => `
                <li><strong>${draw.category} - ${draw.age}</strong>: 
                  Draw for position ${draw.position} (${draw.score} points) between 
                  ${draw.archers.join(', ')}</li>
              `).join('')}
            </ul>
          </div>
        `;
      }
      
      // Results by category
      Object.values(categories).sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.age.localeCompare(b.age);
      }).forEach(category => {
        html += `
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h3 class="h5 mb-0">${category.category} - ${category.age}</h3>
            </div>
            <div class="card-body p-0">
              <table class="table table-striped mb-0" aria-label="Results for ${category.category} - ${category.age}">
                <caption class="visually-hidden">Results in ${category.category} - ${category.age}</caption>
                <thead>
                  <tr>
                    <th scope="col">Position</th>
                    <th scope="col">Name</th>
                    <th scope="col">Club</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
        `;
        
        // Display archers in reverse order for top 3 (3, 2, 1)
        let displayArchers = [...category.archers];
        
        if (displayArchers.length >= 3) {
          const topThree = displayArchers.slice(0, 3).reverse();
          const rest = displayArchers.slice(3);
          displayArchers = [...topThree, ...rest];
        } else {
          displayArchers.reverse();
        }
        
        // Calculate positions correctly
        const positionMap = new Map();
        let currentPosition = 1;
        let lastScore = null;
        let skipCount = 0;
        
        category.archers.forEach((archer, idx) => {
          if (idx === 0) {
            positionMap.set(archer.total, 1);
            lastScore = archer.total;
          } else if (archer.total === lastScore) {
            positionMap.set(archer.total, currentPosition);
            skipCount++;
          } else {
            currentPosition = idx + 1;
            positionMap.set(archer.total, currentPosition);
            lastScore = archer.total;
          }
        });
        
        // Render each archer
        displayArchers.forEach(archer => {
          const position = positionMap.get(archer.total);
          const isDraw = category.archers.filter(a => a.total === archer.total).length > 1;
          
          const rowClass = position === 1 ? 'position-1' : 
                          position === 2 ? 'position-2' : 
                          position === 3 ? 'position-3' : '';
          
          const medalIcon = position === 1 ? '🥇' : 
                            position === 2 ? '🥈' : 
                            position === 3 ? '🥉' : '';
          
          const medalText = position === 1 ? 'Gold medal' : 
                            position === 2 ? 'Silver medal' : 
                            position === 3 ? 'Bronze medal' : '';
          
          const drawText = isDraw && position <= 3 ? ' <span class="text-danger fw-bold">(DRAW)</span>' : '';
          
          html += `
            <tr class="${rowClass}">
              <td>
                ${position <= 3 ? `<span aria-label="${medalText}">${medalIcon}</span>` : ''} 
                ${position}${drawText}
              </td>
              <td>${archer.name}</td>
              <td>${archer.club || ""}</td>
              <td><strong>${archer.total}</strong></td>
            </tr>
          `;
        });
        
        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      });
      
      resultsContent.innerHTML = html;
    } catch (error) {
      console.error('Error rendering results:', error);
      resultsContent.innerHTML = '<p>Error loading results. Please try refreshing the page.</p>';
    }
  },
  
  /**
   * Activate edit mode for a table row
   * @param {number} index - Index of the row to activate
   */
  activateEditMode: function(index) {
    const row = document.getElementById(`row-${index}`);
    row.classList.add('edit-mode');
    
    // Show edit inputs, hide view spans
    row.querySelectorAll('.view-mode').forEach(el => {
      el.style.display = 'none';
    });
    
    const editInputs = row.querySelectorAll('.edit-mode');
    editInputs.forEach(el => {
      el.style.display = 'block';
    });
    
    // Focus on the first input
    editInputs[0].focus();
    
    // Show edit controls, hide normal controls
    row.querySelector('.normal-controls').style.display = 'none';
    row.querySelector('.edit-controls').style.display = 'block';
  },
  
  /**
   * Deactivate edit mode for a table row
   * @param {number} index - Index of the row to deactivate
   */
  deactivateEditMode: function(index) {
    const row = document.getElementById(`row-${index}`);
    row.classList.remove('edit-mode');
    
    // Hide edit inputs, show view spans
    row.querySelectorAll('.view-mode').forEach(el => {
      el.style.display = 'inline';
    });
    row.querySelectorAll('.edit-mode').forEach(el => {
      el.style.display = 'none';
    });
    
    // Hide edit controls, show normal controls
    row.querySelector('.normal-controls').style.display = 'block';
    row.querySelector('.edit-controls').style.display = 'none';
    
    // Return focus to the edit button
    row.querySelector('.edit-btn').focus();
  },
  
  /**
   * Populate dropdown elements with categories and age ranges
   * @param {HTMLSelectElement} categorySelect - Category select element
   * @param {HTMLSelectElement} ageSelect - Age range select element
   */
  populateDropdowns: function(categorySelect, ageSelect) {
    categorySelect.innerHTML = '';
    ageSelect.innerHTML = '';
    
    ArcheryDataService.categories.forEach(cat => {
      const option = document.createElement('option');
      option.textContent = cat;
      option.value = cat;
      categorySelect.appendChild(option);
    });
    
    ArcheryDataService.ageRanges.forEach(age => {
      const option = document.createElement('option');
      option.textContent = age;
      option.value = age;
      ageSelect.appendChild(option);
    });
  },
  
  /**
   * Populate saved competitors dropdowns
   * @param {HTMLSelectElement} selectElement - The select element to populate
   * @returns {Promise} Promise resolving when population is complete
   */
  populateSavedCompetitorsDropdown: async function(selectElement) {
    try {
      // Clear existing options, keeping the first one
      const firstOption = selectElement.options[0];
      selectElement.innerHTML = '';
      if (firstOption) {
        selectElement.appendChild(firstOption);
      }
      
      // Get saved competitors
      const competitors = await ArcheryDataService.getSavedCompetitors();
      
      // Add competitors to dropdown
      if (competitors.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No saved competitors found';
        option.value = '';
        option.disabled = true;
        selectElement.appendChild(option);
      } else {
        // Add each competitor
        competitors.forEach(competitor => {
          const option = document.createElement('option');
          option.textContent = `${competitor.name} (${competitor.club || 'No club'}) - ${competitor.category}`;
          option.value = competitor.name;
          selectElement.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error populating saved competitors dropdown:', error);
    }
  },
  
  /**
   * Render saved competitors table
   * @param {string} searchTerm - Optional search term
   * @returns {Promise} Promise resolving when rendering is complete
   */
  renderSavedCompetitorsTable: async function(searchTerm = '') {
    const tableContainer = document.getElementById('savedCompetitorsTable');
    
    try {
      // Get all saved competitors
      const competitors = await ArcheryDataService.getSavedCompetitors();
      
      if (competitors.length === 0) {
        tableContainer.innerHTML = '<p>No saved competitors found. When you save a competitor from the score entry forms, they will appear here.</p>';
        return;
      }
      
      const filteredCompetitors = searchTerm ? 
        competitors.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : 
        competitors;
      
      if (filteredCompetitors.length === 0) {
        tableContainer.innerHTML = `<p>No saved competitors found matching "${searchTerm}". Try a different search term.</p>`;
        return;
      }
      
      let html = `
        <table class="table table-striped" aria-label="Saved competitors table">
          <caption>List of all saved competitors</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Club</th>
              <th scope="col">Membership #</th>
              <th scope="col">Category</th>
              <th scope="col">Age Group</th>
              <th scope="col">Last Used</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      filteredCompetitors.forEach((competitor, index) => {
        // Format the date
        const lastUsed = competitor.lastUsed ? 
          new Date(competitor.lastUsed).toLocaleDateString() : 
          'Never';
        
        html += `
          <tr id="saved-row-${index}" data-name="${competitor.name}">
            <td>${competitor.name}</td>
            <td>${competitor.club || ''}</td>
            <td>${competitor.membershipId || ''}</td>
            <td>${competitor.category}</td>
            <td>${competitor.age}</td>
            <td>${lastUsed}</td>
            <td>
              <button class="btn btn-sm btn-primary use-competitor-btn" data-name="${competitor.name}" aria-label="Use ${competitor.name}">
                <i class="bi bi-person-plus" aria-hidden="true"></i> Use
              </button>
              <button class="btn btn-sm btn-danger delete-competitor-btn" data-name="${competitor.name}" aria-label="Delete ${competitor.name}">
                <i class="bi bi-trash" aria-hidden="true"></i> Delete
              </button>
            </td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
      
      tableContainer.innerHTML = html;
    } catch (error) {
      console.error('Error rendering saved competitors table:', error);
      tableContainer.innerHTML = '<p>Error loading saved competitors. Please try refreshing the page.</p>';
    }
  },

/**
 * Print the competition results
 * Updated to show only results content
 */
printResults: function() {
  // Add a class to the body for print-specific styling
  document.body.classList.add('printing-results');
  
  // Get the active competition for the title
  const activeCompetition = ArcheryDataService.getActiveCompetition();
  
  // Create a print-only header that will show at the top of the printout
  const printHeader = document.createElement('div');
  printHeader.classList.add('print-only');
  printHeader.style.textAlign = 'center';
  printHeader.style.marginBottom = '20px';
  
  // Create title
  const title = document.createElement('h1');
  title.style.fontSize = '24px';
  title.style.marginBottom = '8px';
  title.textContent = activeCompetition ? 
    `${activeCompetition.name} - Results` : 
    'Dunbrody Archers Competition Results';
  
  // Create date line
  const dateLine = document.createElement('p');
  dateLine.style.fontSize = '14px';
  dateLine.style.marginBottom = '20px';
  
  // Include competition date if available
  if (activeCompetition && activeCompetition.date) {
    const compDate = new Date(activeCompetition.date).toLocaleDateString();
    dateLine.textContent = `Competition Date: ${compDate} • Printed on: ${new Date().toLocaleDateString()}`;
  } else {
    dateLine.textContent = 'Printed on: ' + new Date().toLocaleDateString();
  }
  
  // Add description if available
  let descriptionLine = null;
  if (activeCompetition && activeCompetition.description) {
    descriptionLine = document.createElement('p');
    descriptionLine.style.fontSize = '14px';
    descriptionLine.style.fontStyle = 'italic';
    descriptionLine.style.marginBottom = '20px';
    descriptionLine.textContent = activeCompetition.description;
  }
  
  // Assemble the header
  printHeader.appendChild(title);
  printHeader.appendChild(dateLine);
  if (descriptionLine) {
    printHeader.appendChild(descriptionLine);
  }
  
  // Add a horizontal rule
  const hr = document.createElement('hr');
  hr.classList.add('print-only');
  printHeader.appendChild(hr);
  
  // Get the results content and insert the header at the top
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.insertBefore(printHeader, resultsContent.firstChild);
  
  // Switch to the results tab to ensure it's visible
  const resultsTab = document.getElementById('results-tab');
  if (resultsTab) {
    resultsTab.click();
  }
  
  // Brief delay to ensure styles apply
  setTimeout(() => {
    // Trigger print dialog
    window.print();
    
    // Clean up after printing (in a setTimeout to ensure it happens after print dialog)
    setTimeout(() => {
      // Remove the print mode class
      document.body.classList.remove('printing-results');
      
      // Remove the added elements
      document.querySelectorAll('.print-only').forEach(el => el.remove());
    }, 500);
  }, 100);
}
};

// Make it available globally
window.ArcheryUIRenderer = ArcheryUIRenderer;