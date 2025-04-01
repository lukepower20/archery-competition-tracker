/**
 * UI Components for Sync Functionality
 */

const ArcherySyncUI = {
    /**
     * Initialize sync UI components
     */
    initialize: function() {
      this.createSyncSettingsTab();
      this.createSyncControls();
      this.createSyncModals();
      
      // Add listeners for sync events
      window.addEventListener('remote-data-updated', (event) => {
        // Show a notification of updates
        const { entityType, changeType, data } = event.detail;
        let message = '';
        
        if (entityType === 'archer' && changeType === 'update') {
          message = `Score for ${data.name} updated from another device`;
        } else if (entityType === 'competition' && changeType === 'update') {
          message = `Competition "${data.name}" updated from another device`;
        }
        
        if (message) {
          // Use the existing notification system
          const toastTitle = document.getElementById('toastTitle');
          const toastMessage = document.getElementById('toastMessage');
          if (toastTitle && toastMessage) {
            toastTitle.textContent = 'Remote Update';
            toastMessage.textContent = message;
            const toast = bootstrap.Toast.getOrCreateInstance(document.getElementById('notificationToast'));
            toast.show();
          }
        }
        
        // Update UI as needed depending on what changed
        this.refreshViewsAfterRemoteUpdate(entityType);
      });
    },
    
    /**
     * Create a new tab for sync settings
     */
    createSyncSettingsTab: function() {
      // Add a new tab in the navigation
      const tabList = document.getElementById('archerTabs');
      if (!tabList) return;
      
      // Check if tab already exists
      if (document.getElementById('sync-tab')) return;
      
      // Create the tab
      const tabItem = document.createElement('li');
      tabItem.className = 'nav-item';
      tabItem.role = 'presentation';
      
      tabItem.innerHTML = `
        <button class="nav-link" id="sync-tab" data-bs-toggle="tab" data-bs-target="#sync" type="button" role="tab" aria-controls="sync" aria-selected="false">
          <i class="bi bi-cloud-arrow-up-down me-1"></i> Sync
        </button>
      `;
      
      tabList.appendChild(tabItem);
      
      // Create the tab content
      const tabContent = document.getElementById('archerTabContent');
      if (!tabContent) return;
      
      const syncPane = document.createElement('div');
      syncPane.className = 'tab-pane fade';
      syncPane.id = 'sync';
      syncPane.role = 'tabpanel';
      syncPane.setAttribute('aria-labelledby', 'sync-tab');
      
      syncPane.innerHTML = `
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h2 class="h5 mb-0">Multi-device Synchronization</h2>
          </div>
          <div class="card-body">
            <div id="sync-auth-section" class="mb-4">
              <h3 class="h5">Account</h3>
              <div id="sync-logged-out" style="display: none;">
                <p>Sign in to enable synchronization across multiple devices.</p>
                <button id="signInBtn" class="btn btn-primary">
                  <i class="bi bi-google me-2"></i> Sign in with Google
                </button>
              </div>
              <div id="sync-logged-in" style="display: none;">
                <div class="d-flex align-items-center mb-3">
                  <img id="user-photo" src="" alt="Profile" class="rounded-circle me-3" width="48" height="48">
                  <div>
                    <div id="user-name" class="fw-bold"></div>
                    <div id="user-email" class="text-muted small"></div>
                  </div>
                  <button id="signOutBtn" class="btn btn-outline-danger ms-auto">Sign Out</button>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="h5">Sync Status</h3>
              <div class="card bg-light">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <span id="sync-status-badge" class="badge rounded-pill bg-secondary me-2">
                        Offline
                      </span>
                      <span id="sync-status-text">Not connected</span>
                    </div>
                    <button id="syncNowButton" class="btn btn-primary btn-sm">
                      <i class="bi bi-arrow-repeat me-1"></i> Sync Now
                    </button>
                  </div>
                  
                  <div class="row text-center g-3">
                    <div class="col-4">
                      <div class="border rounded py-2">
                        <div id="competitions-count" class="fw-bold">-</div>
                        <div class="text-muted small">Competitions</div>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="border rounded py-2">
                        <div id="archers-count" class="fw-bold">-</div>
                        <div class="text-muted small">Archers</div>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="border rounded py-2">
                        <div id="pending-changes" class="fw-bold">0</div>
                        <div class="text-muted small">Pending Changes</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-3">
                    <div class="text-muted small">
                      <i class="bi bi-clock-history me-1"></i>
                      Last synced: <span id="last-sync-time">Never</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="h5">Sync Options</h3>
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="autoSyncToggle" checked>
                <label class="form-check-label" for="autoSyncToggle">
                  Automatically sync changes
                </label>
              </div>
              
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="notifyChangesToggle" checked>
                <label class="form-check-label" for="notifyChangesToggle">
                  Show notifications for remote changes
                </label>
              </div>
              
              <div class="row mb-3">
                <label for="conflictResolutionSelect" class="col-sm-4 col-form-label">Conflict Resolution</label>
                <div class="col-sm-8">
                  <select class="form-select" id="conflictResolutionSelect">
                    <option value="remote" selected>Remote changes take priority</option>
                    <option value="local">Local changes take priority</option>
                    <option value="newer">Newer changes take priority</option>
                    <option value="ask">Ask me every time</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="h5">Sharing</h3>
              <p>Share access to competitions with other scorekeepers.</p>
              
              <div class="mb-3">
                <label for="shareCompetitionSelect" class="form-label">Select Competition to Share</label>
                <select class="form-select mb-2" id="shareCompetitionSelect">
                  <option value="" selected>-- Select a competition --</option>
                  <!-- Will be populated dynamically -->
                </select>
                
                <div class="input-group mb-3">
                  <input type="email" class="form-control" id="shareEmailInput" placeholder="Enter email address" aria-label="Email to share with">
                  <button class="btn btn-outline-primary" type="button" id="shareCompetitionBtn">
                    <i class="bi bi-share"></i> Share
                  </button>
                </div>
              </div>
              
              <div id="sharedWithSection">
                <h6>Shared With</h6>
                <p class="text-muted" id="noSharingMsg">This competition is not shared with anyone.</p>
                <ul class="list-group" id="sharedUsersList">
                  <!-- Will be populated dynamically -->
                </ul>
              </div>
            </div>
            
            <div>
              <h3 class="h5">Backup & Restore</h3>
              <p>Create manual backups or restore from a previous backup.</p>
              
              <div class="d-flex gap-2">
                <button class="btn btn-primary" id="createBackupBtn">
                  <i class="bi bi-download me-1"></i> Create Backup
                </button>
                <button class="btn btn-secondary" id="restoreBackupBtn">
                  <i class="bi bi-upload me-1"></i> Restore from Backup
                </button>
                <input type="file" id="restoreFileInput" class="visually-hidden" accept=".json">
              </div>
            </div>
          </div>
        </div>
      `;
      
      tabContent.appendChild(syncPane);
      
      // Add event listeners for the new tab
      document.getElementById('sync-tab').addEventListener('click', () => {
        this.updateSyncUI();
      });
    },
    
    /**
     * Create shared controls for sync status
     */
    createSyncControls: function() {
      // Create status indicator in the header
      const header = document.querySelector('header .d-flex');
      if (!header) return;
      
      // Check if it already exists
      if (document.getElementById('sync-indicator')) return;
      
      const syncIndicator = document.createElement('div');
      syncIndicator.id = 'sync-indicator';
      syncIndicator.className = 'ms-3 d-flex align-items-center';
      
      syncIndicator.innerHTML = `
        <span class="badge rounded-pill bg-secondary">
          <i class="bi bi-cloud-slash"></i> Offline
        </span>
      `;
      
      header.appendChild(syncIndicator);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        #sync-indicator .badge {
          cursor: pointer;
          transition: all 0.2s;
        }
        
        #sync-indicator .badge:hover {
          opacity: 0.8;
        }
        
        .sync-status-syncing {
          animation: spin 1.5s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        #sharedUsersList .shared-user-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .conflict-item {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .conflict-item:last-child {
          border-bottom: none;
        }
        
        .conflict-resolution-buttons {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
      `;
      
      document.head.appendChild(style);
      
      // Add click event to show sync tab
      syncIndicator.addEventListener('click', () => {
        document.getElementById('sync-tab').click();
      });
    },
    
    /**
     * Create modals for sync functions
     */
    createSyncModals: function() {
      // Create conflict resolution modal
      const conflictModal = document.createElement('div');
      conflictModal.className = 'modal fade';
      conflictModal.id = 'conflictResolutionModal';
      conflictModal.tabIndex = '-1';
      conflictModal.setAttribute('aria-labelledby', 'conflictResolutionModalLabel');
      conflictModal.setAttribute('aria-hidden', 'true');
      
      conflictModal.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="conflictResolutionModalLabel">Resolve Sync Conflicts</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>The following items have conflicts between local and remote versions:</p>
              <div id="conflictsList">
                <!-- Will be populated dynamically -->
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="resolveAllLocalBtn">Use All Local</button>
              <button type="button" class="btn btn-success" id="resolveAllRemoteBtn">Use All Remote</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(conflictModal);
    },
    
    /**
     * Update sync UI based on current status
     */
    updateSyncUI: function() {
      if (!window.ArcherySyncService) return;
      
      const status = ArcherySyncService.getStatus();
      
      // Update auth section
      const loggedInSection = document.getElementById('sync-logged-in');
      const loggedOutSection = document.getElementById('sync-logged-out');
      
      if (status.user) {
        // User is logged in
        loggedInSection.style.display = 'block';
        loggedOutSection.style.display = 'none';
        
        // Update user info
        document.getElementById('user-name').textContent = status.user.displayName;
        document.getElementById('user-email').textContent = status.user.email;
        document.getElementById('user-photo').src = status.user.photoURL || 'https://via.placeholder.com/48';
      } else {
        // User is logged out
        loggedInSection.style.display = 'none';
        loggedOutSection.style.display = 'block';
      }
      
      // Update sync status
      const statusBadge = document.getElementById('sync-status-badge');
      const statusText = document.getElementById('sync-status-text');
      
      if (status.isSyncing) {
        statusBadge.className = 'badge rounded-pill bg-primary';
        statusBadge.innerHTML = '<i class="bi bi-arrow-repeat sync-status-syncing"></i> Syncing';
        statusText.textContent = 'Synchronizing data...';
      } else if (!status.isOnline) {
        statusBadge.className = 'badge rounded-pill bg-secondary';
        statusBadge.innerHTML = '<i class="bi bi-cloud-slash"></i> Offline';
        statusText.textContent = 'Working in offline mode. Changes will sync when you reconnect.';
      } else if (!status.user) {
        statusBadge.className = 'badge rounded-pill bg-warning';
        statusBadge.innerHTML = '<i class="bi bi-person-x"></i> Not Signed In';
        statusText.textContent = 'Sign in to enable sync.';
      } else if (status.pendingChanges > 0) {
        statusBadge.className = 'badge rounded-pill bg-warning';
        statusBadge.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Pending';
        statusText.textContent = `${status.pendingChanges} changes waiting to be synced.`;
      } else {
        statusBadge.className = 'badge rounded-pill bg-success';
        statusBadge.innerHTML = '<i class="bi bi-cloud-check"></i> Synced';
        statusText.textContent = 'All changes are synced.';
      }
      
      // Update counts
      document.getElementById('pending-changes').textContent = status.pendingChanges;
      
      // Update last sync time
      const lastSyncElem = document.getElementById('last-sync-time');
      if (status.lastSyncTime) {
        const syncDate = new Date(status.lastSyncTime);
        lastSyncElem.textContent = syncDate.toLocaleString();
      } else {
        lastSyncElem.textContent = 'Never';
      }
      
      // Update header indicator
      const indicator = document.querySelector('#sync-indicator .badge');
      if (indicator) {
        if (status.isSyncing) {
          indicator.className = 'badge rounded-pill bg-primary';
          indicator.innerHTML = '<i class="bi bi-arrow-repeat sync-status-syncing"></i>';
        } else if (!status.isOnline) {
          indicator.className = 'badge rounded-pill bg-secondary';
          indicator.innerHTML = '<i class="bi bi-cloud-slash"></i> Offline';
        } else if (!status.user) {
          indicator.className = 'badge rounded-pill bg-warning';
          indicator.innerHTML = '<i class="bi bi-person-x"></i>';
        } else if (status.pendingChanges > 0) {
          indicator.className = 'badge rounded-pill bg-warning';
          indicator.innerHTML = `<i class="bi bi-cloud-arrow-up"></i> ${status.pendingChanges}`;
        } else {
          indicator.className = 'badge rounded-pill bg-success';
          indicator.innerHTML = '<i class="bi bi-cloud-check"></i>';
        }
      }
      
      // Update competition sharing dropdown
      this.updateSharingUI();
    },
    
    /**
     * Update sharing UI
     */
    updateSharingUI: async function() {
      const selectElem = document.getElementById('shareCompetitionSelect');
      if (!selectElem) return;
      
      // Clear existing options (keep the first one)
      const firstOption = selectElem.options[0];
      selectElem.innerHTML = '';
      selectElem.appendChild(firstOption);
      
      try {
        // Get competitions
        const competitions = await ArcheryDataService.getCompetitions();
        
        competitions.forEach(comp => {
          const option = document.createElement('option');
          option.value = comp.id;
          option.textContent = comp.name;
          selectElem.appendChild(option);
        });
      } catch (error) {
        console.error('Error updating sharing UI:', error);
      }
    },
    
    /**
     * Refresh views after remote update
     * @param {string} entityType - Type of entity that was updated
     */
    refreshViewsAfterRemoteUpdate: function(entityType) {
      switch(entityType) {
        case 'competition':
          // Refresh competition selector and list
          const container = document.getElementById('competitionSelectorContainer');
          if (container) {
            ArcheryUIRenderer.renderCompetitionSelector(container);
          }
          
          const compListContainer = document.getElementById('competitionsListContainer');
          if (compListContainer) {
            ArcheryUIRenderer.renderCompetitionsList(compListContainer);
          }
          break;
          
        case 'archer':
          // Refresh scores table and results
          ArcheryUIRenderer.renderScoresTable();
          ArcheryUIRenderer.renderResults();
          break;
          
        case 'savedCompetitor':
          // Refresh saved competitors table and dropdowns
          ArcheryUIRenderer.renderSavedCompetitorsTable();
          
          const savedSelect = document.getElementById('savedCompetitorSelect');
          const inlineSavedSelect = document.getElementById('inlineSavedCompetitorSelect');
          
          if (savedSelect) {
            ArcheryUIRenderer.populateSavedCompetitorsDropdown(savedSelect);
          }
          
          if (inlineSavedSelect) {
            ArcheryUIRenderer.populateSavedCompetitorsDropdown(inlineSavedSelect);
          }
          break;
      }
      
      // Also refresh dashboard if it's visible
      const dashboardTab = document.getElementById('dashboard-tab');
      if (dashboardTab.classList.contains('active')) {
        renderDashboard();
      }
    }
  };
  
  // Make it available globally
  window.ArcherySyncUI = ArcherySyncUI;