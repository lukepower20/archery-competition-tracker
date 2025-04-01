/**
 * Archery Sync Service
 * Handles synchronization between local IndexedDB and cloud storage
 */
const ArcherySyncService = {
    // Configuration
    isOnline: window.navigator.onLine,
    isSyncing: false,
    syncInProgress: false,
    lastSyncTime: null,
    pendingChanges: [],
    
    /**
     * Initialize the sync service
     * @returns {Promise} Promise resolving when initialization is complete
     */
    initialize: function() {
      return new Promise(async (resolve) => {
        // Set up online/offline event listeners
        window.addEventListener('online', () => {
          this.isOnline = true;
          this.showSyncStatus('Connected', 'success');
          this.syncData(); // Trigger sync when coming back online
        });
        
        window.addEventListener('offline', () => {
          this.isOnline = false;
          this.showSyncStatus('Offline - Changes will sync when connection returns', 'warning');
        });
        
        // Set up auth state listener
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            this.currentUser = user;
            this.setupSyncListeners();
            this.syncData(); // Initial sync after auth
          } else {
            this.currentUser = null;
            this.showSyncStatus('Sign in to enable sync', 'inactive');
          }
        });
        
        // Initial status check
        if (this.isOnline) {
          this.showSyncStatus('Ready to sync', 'ready');
        } else {
          this.showSyncStatus('Offline - Working in local mode', 'warning');
        }
        
        resolve();
      });
    },
    
    /**
     * Setup real-time listeners for cloud changes
     */
    setupSyncListeners: function() {
      if (!this.currentUser) return;
      
      // Listen for competition changes
      const competitionsRef = firebase.firestore()
        .collection('users')
        .doc(this.currentUser.uid)
        .collection('competitions');
        
      this.competitionsUnsubscribe = competitionsRef.onSnapshot((snapshot) => {
        if (this.syncInProgress) return; // Avoid recursion
        
        // Process remote changes
        snapshot.docChanges().forEach(async (change) => {
          const competition = {
            id: parseInt(change.doc.id),
            ...change.doc.data()
          };
          
          if (change.type === 'added' || change.type === 'modified') {
            await this.processRemoteChange('competition', 'update', competition);
          } else if (change.type === 'removed') {
            await this.processRemoteChange('competition', 'delete', competition);
          }
        });
      });
      
      // Similar listeners for archers, savedCompetitors, etc.
    },
    
    /**
     * Process a change that came from the cloud
     * @param {string} entityType - Type of entity (competition, archer, etc)
     * @param {string} changeType - Type of change (update, delete)
     * @param {Object} data - The entity data
     */
    processRemoteChange: async function(entityType, changeType, data) {
      this.syncInProgress = true;
      
      try {
        switch(entityType) {
          case 'competition':
            if (changeType === 'update') {
              await ArcheryDataService.updateCompetition(data);
            } else if (changeType === 'delete') {
              await ArcheryDataService.deleteCompetition(data.id);
            }
            break;
            
          case 'archer':
            if (changeType === 'update') {
              await ArcheryDataService.saveScore(data);
            } else if (changeType === 'delete') {
              await ArcheryDataService.deleteArcherById(data.id);
            }
            break;
            
          case 'savedCompetitor':
            if (changeType === 'update') {
              await ArcheryDataService.saveCompetitor(data);
            } else if (changeType === 'delete') {
              await ArcheryDataService.deleteSavedCompetitor(data.name);
            }
            break;
        }
        
        // Force UI refresh
        const event = new CustomEvent('remote-data-updated', { 
          detail: { entityType, changeType, data } 
        });
        window.dispatchEvent(event);
        
      } catch (error) {
        console.error('Error processing remote change:', error);
        this.showSyncStatus('Error syncing: ' + error.message, 'error');
      } finally {
        this.syncInProgress = false;
      }
    },
    
    /**
     * Record a local change to be synced
     * @param {string} entityType - Type of entity changed
     * @param {string} changeType - Type of change
     * @param {Object} data - The changed data
     */
    recordChange: function(entityType, changeType, data) {
      if (!this.currentUser) return; // Don't record if not logged in
      
      this.pendingChanges.push({
        entityType,
        changeType,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Show sync pending status
      this.showSyncStatus('Changes pending sync...', 'pending');
      
      // Trigger sync if online
      if (this.isOnline && !this.syncInProgress && !this.isSyncing) {
        this.syncData();
      }
    },
    
    /**
     * Sync data with cloud
     * @returns {Promise} Promise resolving when sync is complete
     */
    syncData: async function() {
      if (!this.currentUser || !this.isOnline || this.isSyncing) return;
      
      this.isSyncing = true;
      this.showSyncStatus('Syncing...', 'syncing');
      
      try {
        // Process pending local changes
        const changes = [...this.pendingChanges];
        this.pendingChanges = [];
        
        for (const change of changes) {
          await this.pushChangeToCloud(change);
        }
        
        // Pull complete data if this is the first sync
        if (!this.lastSyncTime) {
          await this.pullInitialData();
        }
        
        this.lastSyncTime = new Date().toISOString();
        this.showSyncStatus('Last synced: ' + new Date().toLocaleTimeString(), 'success');
        
      } catch (error) {
        console.error('Sync error:', error);
        this.showSyncStatus('Sync failed: ' + error.message, 'error');
        
        // Put changes back in the queue
        this.pendingChanges = [...changes, ...this.pendingChanges];
      } finally {
        this.isSyncing = false;
      }
    },
    
    /**
     * Push a single change to the cloud
     * @param {Object} change - The change to push
     */
    pushChangeToCloud: async function(change) {
      const { entityType, changeType, data } = change;
      const db = firebase.firestore();
      const userDoc = db.collection('users').doc(this.currentUser.uid);
      
      switch(entityType) {
        case 'competition':
          if (changeType === 'update' || changeType === 'add') {
            await userDoc.collection('competitions').doc(data.id.toString()).set({
              ...data,
              syncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          } else if (changeType === 'delete') {
            await userDoc.collection('competitions').doc(data.id.toString()).delete();
          }
          break;
          
        case 'archer':
          if (changeType === 'update' || changeType === 'add') {
            await userDoc.collection('archers').doc(data.id.toString()).set({
              ...data,
              syncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          } else if (changeType === 'delete') {
            await userDoc.collection('archers').doc(data.id.toString()).delete();
          }
          break;
          
        case 'savedCompetitor':
          if (changeType === 'update' || changeType === 'add') {
            await userDoc.collection('savedCompetitors').doc(data.name).set({
              ...data,
              syncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          } else if (changeType === 'delete') {
            await userDoc.collection('savedCompetitors').doc(data.name).delete();
          }
          break;
      }
    },
    
    /**
     * Pull all data from cloud on first sync
     */
    pullInitialData: async function() {
      const db = firebase.firestore();
      const userDoc = db.collection('users').doc(this.currentUser.uid);
      
      // Pull competitions
      const competitionsSnapshot = await userDoc.collection('competitions').get();
      const competitions = [];
      
      competitionsSnapshot.forEach(doc => {
        competitions.push({
          id: parseInt(doc.id),
          ...doc.data()
        });
      });
      
      if (competitions.length > 0) {
        // Clear existing data and import new data
        // This would need careful implementation to avoid data loss
        // Ideally with a merge strategy
        console.log('Initial data pull: received competitions', competitions.length);
      }
      
      // Pull archers, savedCompetitors, etc.
    },
    
    /**
     * Show sync status in the UI
     * @param {string} message - Status message
     * @param {string} status - Status type (ready, syncing, success, error, etc)
     */
    showSyncStatus: function(message, status) {
      const statusBar = document.getElementById('syncStatusBar');
      
      if (!statusBar) {
        // Create status bar if it doesn't exist
        this.createStatusBar();
        return this.showSyncStatus(message, status);
      }
      
      // Update status message
      const statusText = statusBar.querySelector('.sync-status-text');
      if (statusText) statusText.textContent = message;
      
      // Update status icon
      const statusIcon = statusBar.querySelector('.sync-status-icon');
      if (statusIcon) {
        // Clear existing classes
        statusIcon.className = 'bi sync-status-icon';
        
        // Add appropriate icon
        switch(status) {
          case 'ready':
            statusIcon.classList.add('bi-cloud');
            break;
          case 'syncing':
            statusIcon.classList.add('bi-arrow-repeat', 'rotating');
            break;
          case 'success':
            statusIcon.classList.add('bi-cloud-check');
            break;
          case 'error':
            statusIcon.classList.add('bi-cloud-slash');
            break;
          case 'warning':
            statusIcon.classList.add('bi-cloud-exclamation');
            break;
          case 'pending':
            statusIcon.classList.add('bi-clock-history');
            break;
          case 'inactive':
            statusIcon.classList.add('bi-cloud-slash');
            break;
        }
      }
      
      // Update general status class
      statusBar.className = 'sync-status-bar';
      statusBar.classList.add('status-' + status);
    },
    
    /**
     * Create sync status bar in the UI
     */
    createStatusBar: function() {
      // Don't create if it already exists
      if (document.getElementById('syncStatusBar')) return;
      
      const statusBar = document.createElement('div');
      statusBar.id = 'syncStatusBar';
      statusBar.className = 'sync-status-bar';
      
      statusBar.innerHTML = `
        <i class="bi bi-cloud sync-status-icon"></i>
        <span class="sync-status-text">Initializing sync...</span>
        <button id="syncNowBtn" class="btn btn-sm btn-link" title="Sync now">
          <i class="bi bi-arrow-repeat"></i>
        </button>
      `;
      
      // Insert after the header
      const header = document.querySelector('header');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(statusBar, header.nextSibling);
      } else {
        // Fallback to beginning of main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.insertBefore(statusBar, mainContent.firstChild);
        }
      }
      
      // Add event listener for sync button
      const syncNowBtn = document.getElementById('syncNowBtn');
      if (syncNowBtn) {
        syncNowBtn.addEventListener('click', () => {
          this.syncData();
        });
      }
      
      // Add CSS styles
      const styleSheet = document.createElement('style');
      styleSheet.type = 'text/css';
      styleSheet.textContent = `
        .sync-status-bar {
          display: flex;
          align-items: center;
          padding: 5px 10px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          font-size: 0.875rem;
          margin-bottom: 15px;
        }
        
        .sync-status-icon {
          margin-right: 8px;
          font-size: 1rem;
        }
        
        .sync-status-text {
          flex: 1;
        }
        
        .status-syncing .sync-status-icon {
          color: #0d6efd;
          animation: spin 1.5s linear infinite;
        }
        
        .status-success .sync-status-icon {
          color: #198754;
        }
        
        .status-error .sync-status-icon {
          color: #dc3545;
        }
        
        .status-warning .sync-status-icon {
          color: #fd7e14;
        }
        
        .status-pending .sync-status-icon {
          color: #6c757d;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleSheet);
    },
    
    /**
     * Force a full sync now
     * @returns {Promise} Promise resolving when sync is complete
     */
    forceSyncNow: async function() {
      if (this.isSyncing) return;
      
      // Clear last sync time to force a full pull
      this.lastSyncTime = null;
      return this.syncData();
    },
    
    /**
     * Sign in user to enable sync
     * @returns {Promise} Promise resolving when authentication completes
     */
    signIn: async function() {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      try {
        await firebase.auth().signInWithPopup(provider);
        // Auth state listener will handle the rest
        return { success: true };
      } catch (error) {
        console.error('Auth error:', error);
        return { 
          success: false,
          error: error.message 
        };
      }
    },
    
    /**
     * Sign out current user
     * @returns {Promise} Promise resolving when sign out completes
     */
    signOut: async function() {
      try {
        await firebase.auth().signOut();
        // Clean up listeners
        if (this.competitionsUnsubscribe) {
          this.competitionsUnsubscribe();
        }
        // Auth state listener will handle the rest
        return { success: true };
      } catch (error) {
        console.error('Sign out error:', error);
        return { 
          success: false,
          error: error.message 
        };
      }
    },
    
    /**
     * Get current sync status
     * @returns {Object} Current sync status
     */
    getStatus: function() {
      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime,
        pendingChanges: this.pendingChanges.length,
        user: this.currentUser ? {
          displayName: this.currentUser.displayName,
          email: this.currentUser.email,
          photoURL: this.currentUser.photoURL
        } : null
      };
    }
  };
  
  // Make it available globally
  window.ArcherySyncService = ArcherySyncService;