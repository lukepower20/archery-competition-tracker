/**
 * Archery Data Service
 * Handles all data operations using IndexedDB for improved storage and performance
 */
import { CATEGORIES, AGE_RANGES, DB, ERRORS } from './constants.js';
import { Logger, ErrorHandler } from './utilities.js';

export const ArcheryDataService = {
  // Configuration data - using constants
  categories: CATEGORIES,
  ageRanges: AGE_RANGES,
  
  // Database reference
  db: null,
  dbName: DB.NAME,
  
  // Active competition reference
  activeCompetition: null,
  
  /**
   * Initialize the database
   * @returns {Promise} Promise that resolves when DB is ready
   */
  initDatabase: function() {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        Logger.warn('IndexedDB not supported, falling back to localStorage');
        this.useLocalStorage = true;
        resolve();
        return;
      }
      
      this.useLocalStorage = false;
      Logger.info('Initializing IndexedDB...');
      
      // Update DB version to trigger onupgradeneeded
      const dbVersion = 4;
      const request = indexedDB.open(this.dbName, dbVersion);
      
      // Handle database upgrades/creation
      request.onupgradeneeded = (event) => {
        Logger.info('Database upgrade needed, creating object stores...');
        const db = event.target.result;
        
        // Create archers object store if it doesn't exist
        if (!db.objectStoreNames.contains('archers')) {
          Logger.info('Creating archers store...');
          const archerStore = db.createObjectStore('archers', { keyPath: 'id', autoIncrement: true });
          
          // Create indexes for faster searching
          archerStore.createIndex('name', 'name', { unique: false });
          archerStore.createIndex('competitionId', 'competitionId', { unique: false });
          archerStore.createIndex('category', 'category', { unique: false });
          archerStore.createIndex('age', 'age', { unique: false });
          archerStore.createIndex('club', 'club', { unique: false });
        } else if (event.oldVersion < 3) {
          // In version 3, add id as primary key instead of name for archers (to allow same name in different competitions)
          // And add competitionId field to associate archers with competitions
          
          // We need to get existing data, delete the store, recreate it, and reinsert data
          const transaction = event.target.transaction;
          const oldStore = transaction.objectStore('archers');
          const getAllRequest = oldStore.getAll();
          
          getAllRequest.onsuccess = () => {
            const archersData = getAllRequest.result;
            
            // Delete old store
            db.deleteObjectStore('archers');
            
            // Create new store with updated schema
            const newStore = db.createObjectStore('archers', { keyPath: 'id', autoIncrement: true });
            
            // Create indexes for faster searching
            newStore.createIndex('name', 'name', { unique: false });
            newStore.createIndex('competitionId', 'competitionId', { unique: false });
            newStore.createIndex('category', 'category', { unique: false });
            newStore.createIndex('age', 'age', { unique: false });
            newStore.createIndex('club', 'club', { unique: false });
            
            // Add back the data with default competitionId = 1 (for existing data)
            if (archersData && archersData.length > 0) {
              // Get new transaction since schema changed
              const newTx = db.transaction(['archers'], 'readwrite');
              const store = newTx.objectStore('archers');
              
              archersData.forEach(archer => {
                // Add competitionId to existing data
                archer.competitionId = 1;
                store.add(archer);
              });
            }
          };
        }
        
        // Create settings store for application configuration
        if (!db.objectStoreNames.contains('settings')) {
          Logger.info('Creating settings store...');
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Create competitions store for multiple competitions
        if (!db.objectStoreNames.contains('competitions')) {
          Logger.info('Creating competitions store...');
          const competitionsStore = db.createObjectStore('competitions', { keyPath: 'id', autoIncrement: true });
          competitionsStore.createIndex('name', 'name', { unique: true });
          competitionsStore.createIndex('date', 'date', { unique: false });
          
          // Add a default competition
          const defaultCompetition = {
            name: 'Default Competition',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            description: 'Default competition created automatically'
          };
          
          const addRequest = competitionsStore.add(defaultCompetition);
          addRequest.onsuccess = (e) => {
            const id = e.target.result;
            Logger.info(`Created default competition with ID: ${id}`);
          };
        }
        
        // Create saved competitors store for reusing competitor data
        if (!db.objectStoreNames.contains('savedCompetitors')) {
          Logger.info('Creating saved competitors store...');
          const savedCompetitorsStore = db.createObjectStore('savedCompetitors', { keyPath: 'name' });
          savedCompetitorsStore.createIndex('category', 'category', { unique: false });
          savedCompetitorsStore.createIndex('age', 'age', { unique: false });
          savedCompetitorsStore.createIndex('club', 'club', { unique: false });
          savedCompetitorsStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }
      };
      
      // Handle successful database open
      request.onsuccess = (event) => {
        this.db = event.target.result;
        Logger.info('Database initialized successfully');
        
        // Check if we need to migrate from localStorage
        this.migrateFromLocalStorage().then(() => {
          // Set active competition to the first one by default
          this.getCompetitions().then(competitions => {
            if (competitions.length > 0) {
              this.activeCompetition = competitions[0];
              Logger.info('Set active competition:', this.activeCompetition);
            } else {
              // Create a default competition if none exists
              this.createCompetition({
                name: 'Default Competition',
                date: new Date().toISOString(),
                description: 'Default competition created automatically'
              }).then(competitionId => {
                return this.getCompetitionById(competitionId);
              }).then(competition => {
                this.activeCompetition = competition;
                Logger.info('Created and set active competition:', this.activeCompetition);
              });
            }
            resolve();
          }).catch(error => {
            console.error('Error setting active competition:', error);
            resolve(); // Resolve anyway to allow app to continue
          });
        });
      };
      
      // Handle errors
      request.onerror = (event) => {
        Logger.error('Database error:', event.target.error);
        // Fall back to localStorage on error
        this.useLocalStorage = true;
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Migrate data from localStorage if needed
   * @returns {Promise} Promise that resolves when migration is complete
   */
  migrateFromLocalStorage: function() {
    return new Promise((resolve) => {
      // Check if we have data in localStorage
      const localData = localStorage.getItem('archeryScores');
      if (!localData) {
        Logger.info('No localStorage data to migrate');
        resolve();
        return;
      }
      
      // Parse the data
      try {
        const archers = JSON.parse(localData);
        if (!archers.length) {
          resolve();
          return;
        }
        
        Logger.info(`Migrating ${archers.length} archers from localStorage...`);
        
        // First, ensure we have a default competition
        this.getCompetitions().then(competitions => {
          let competitionId = competitions.length > 0 ? competitions[0].id : null;
          
          if (!competitionId) {
            // Create a default competition
            return this.createCompetition({
              name: 'Default Competition',
              date: new Date().toISOString(),
              description: 'Migrated from localStorage'
            });
          }
          
          return competitionId;
        }).then(competitionId => {
          // Start a transaction
          const transaction = this.db.transaction(['archers'], 'readwrite');
          const store = transaction.objectStore('archers');
          
          // Add each archer to the database
          archers.forEach(archer => {
            // Add competitionId before saving
            archer.competitionId = competitionId;
            store.add(archer);
          });
          
          // Handle transaction completion
          transaction.oncomplete = () => {
            Logger.info('Migration complete. Clearing localStorage data.');
            // Optionally clear localStorage to avoid duplication
            localStorage.removeItem('archeryScores');
            resolve();
          };
          
          // Handle transaction error
          transaction.onerror = (event) => {
            console.error('Migration error:', event.target.error);
            resolve(); // Resolve anyway so the app can continue
          };
        });
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
        resolve(); // Resolve anyway so the app can continue
      }
    });
  },
  
  /**
   * Create a new competition
   * @param {Object} competition - Competition object with name, date, etc.
   * @returns {Promise<number>} Promise resolving to the new competition ID
   */
  createCompetition: function(competition) {
    // Validate competition object
    if (!competition.name) {
      Logger.error('Cannot create competition without name');
      return Promise.reject(new Error('Competition name is required'));
    }
    
    // Add timestamps
    competition.createdAt = new Date().toISOString();
    if (!competition.date) {
      competition.date = new Date().toISOString();
    }
    
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const competitions = JSON.parse(localStorage.getItem('archeryCompetitions') || '[]');
      competition.id = competitions.length > 0 ? Math.max(...competitions.map(c => c.id)) + 1 : 1;
      competitions.push(competition);
      localStorage.setItem('archeryCompetitions', JSON.stringify(competitions));
      return Promise.resolve(competition.id);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['competitions'], 'readwrite');
        const store = transaction.objectStore('competitions');
        
        const request = store.add(competition);
        
        request.onsuccess = (event) => {
          const id = event.target.result;
          resolve(id);
        };
        
        request.onerror = (event) => {
          console.error('Error creating competition:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in createCompetition:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Get all competitions
   * @returns {Promise<Array>} Promise resolving to array of competition objects
   */
  getCompetitions: function() {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const competitions = JSON.parse(localStorage.getItem('archeryCompetitions') || '[]');
      return Promise.resolve(competitions);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized. Returning empty array.');
        resolve([]);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['competitions'], 'readonly');
        const store = transaction.objectStore('competitions');
        const request = store.getAll();
        
        request.onsuccess = () => {
          // Sort by date (most recent first)
          const competitions = request.result || [];
          competitions.sort((a, b) => new Date(b.date) - new Date(a.date));
          resolve(competitions);
        };
        
        request.onerror = (event) => {
          console.error('Error getting competitions:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in getCompetitions:', error);
        resolve([]); // Return empty array on error
      }
    });
  },
  
  /**
   * Get a competition by ID
   * @param {number} id - ID of the competition to get
   * @returns {Promise<Object|null>} Promise resolving to competition object or null
   */
  getCompetitionById: function(id) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const competitions = JSON.parse(localStorage.getItem('archeryCompetitions') || '[]');
      const competition = competitions.find(c => c.id === id) || null;
      return Promise.resolve(competition);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        resolve(null);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['competitions'], 'readonly');
        const store = transaction.objectStore('competitions');
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = (event) => {
          console.error('Error getting competition by ID:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in getCompetitionById:', error);
        resolve(null);
      }
    });
  },
  
  /**
   * Update a competition
   * @param {Object} competition - Competition object to update
   * @returns {Promise<Object>} Promise resolving to result object
   */
  updateCompetition: function(competition) {
    // Validate competition object
    if (!competition.id) {
      Logger.error('Cannot update competition without ID');
      return Promise.reject(new Error('Competition ID is required'));
    }
    
    // Add update timestamp
    competition.updatedAt = new Date().toISOString();
    
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const competitions = JSON.parse(localStorage.getItem('archeryCompetitions') || '[]');
      const index = competitions.findIndex(c => c.id === competition.id);
      
      if (index >= 0) {
        competitions[index] = competition;
        localStorage.setItem('archeryCompetitions', JSON.stringify(competitions));
        return Promise.resolve({ success: true });
      }
      
      return Promise.resolve({ success: false, message: 'Competition not found' });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['competitions'], 'readwrite');
        const store = transaction.objectStore('competitions');
        
        const request = store.put(competition);
        
        request.onsuccess = () => {
          // If this is the active competition, update it
          if (this.activeCompetition && this.activeCompetition.id === competition.id) {
            this.activeCompetition = competition;
          }
          resolve({ success: true });
        };
        
        request.onerror = (event) => {
          console.error('Error updating competition:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in updateCompetition:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Delete a competition
   * @param {number} id - ID of the competition to delete
   * @returns {Promise<Object>} Promise resolving to result object
   */
  deleteCompetition: function(id) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const competitions = JSON.parse(localStorage.getItem('archeryCompetitions') || '[]');
      const filteredCompetitions = competitions.filter(c => c.id !== id);
      
      localStorage.setItem('archeryCompetitions', JSON.stringify(filteredCompetitions));
      
      // Also remove associated archers
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      const filteredScores = scores.filter(s => s.competitionId !== id);
      
      localStorage.setItem('archeryScores', JSON.stringify(filteredScores));
      return Promise.resolve({ success: true });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        // First check if this is the only competition
        this.getCompetitions().then(competitions => {
          if (competitions.length <= 1) {
            resolve({ 
              success: false, 
              message: 'Cannot delete the only competition. Create a new one first.' 
            });
            return;
          }
          
          // Check if this is the active competition
          if (this.activeCompetition && this.activeCompetition.id === id) {
            // We need to set a different active competition first
            const newActive = competitions.find(c => c.id !== id);
            if (newActive) {
              this.activeCompetition = newActive;
            } else {
              resolve({ 
                success: false, 
                message: 'Cannot delete the active competition without another one available.' 
              });
              return;
            }
          }
          
          // Start transaction to delete competition
          const transaction = this.db.transaction(['competitions', 'archers'], 'readwrite');
          
          // Delete the competition
          const compStore = transaction.objectStore('competitions');
          const deleteRequest = compStore.delete(id);
          
          deleteRequest.onsuccess = () => {
            // Now delete all associated archers
            const archerStore = transaction.objectStore('archers');
            const archerIndex = archerStore.index('competitionId');
            const archerRequest = archerIndex.openCursor(IDBKeyRange.only(id));
            
            archerRequest.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                cursor.delete();
                cursor.continue();
              }
            };
          };
          
          transaction.oncomplete = () => {
            resolve({ success: true });
          };
          
          transaction.onerror = (event) => {
            console.error('Error deleting competition:', event.target.error);
            reject(event.target.error);
          };
        });
      } catch (error) {
        console.error('Transaction error in deleteCompetition:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Set active competition
   * @param {number} id - ID of the competition to set as active
   * @returns {Promise<Object>} Promise resolving to competition object
   */
  setActiveCompetition: function(id) {
    return this.getCompetitionById(id).then(competition => {
      if (!competition) {
        return Promise.reject(new Error('Competition not found'));
      }
      
      this.activeCompetition = competition;
      Logger.info('Active competition set to:', competition);
      return competition;
    });
  },
  
  /**
   * Get active competition
   * @returns {Object|null} The active competition or null
   */
  getActiveCompetition: function() {
    return this.activeCompetition;
  },
  
  /**
   * Get all archer scores from the database for the active competition
   * @returns {Promise<Array>} Promise resolving to array of archer objects
   */
  getAllScores: function() {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      const competitionId = this.activeCompetition ? this.activeCompetition.id : null;
      
      if (competitionId) {
        return Promise.resolve(scores.filter(s => s.competitionId === competitionId));
      }
      
      return Promise.resolve(scores);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized. Returning empty array.');
        resolve([]);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['archers'], 'readonly');
        const store = transaction.objectStore('archers');
        
        // If we have an active competition, filter by it
        if (this.activeCompetition) {
          const index = store.index('competitionId');
          const request = index.getAll(IDBKeyRange.only(this.activeCompetition.id));
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
          
          request.onerror = (event) => {
            console.error('Error getting scores for competition:', event.target.error);
            reject(event.target.error);
          };
        } else {
          // Fallback to getting all scores
          const request = store.getAll();
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
          
          request.onerror = (event) => {
            console.error('Error getting all scores:', event.target.error);
            reject(event.target.error);
          };
        }
      } catch (error) {
        console.error('Transaction error in getAllScores:', error);
        resolve([]); // Return empty array on error
      }
    });
  },
  
  /**
   * Get archer by name in the active competition
   * @param {string} name - Name of archer to find
   * @returns {Promise<Object|null>} Promise resolving to archer object or null
   */
  getArcherByName: function(name) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      const competitionId = this.activeCompetition ? this.activeCompetition.id : null;
      
      let filteredScores = scores;
      if (competitionId) {
        filteredScores = scores.filter(s => s.competitionId === competitionId);
      }
      
      const archer = filteredScores.find(s => s.name === name) || null;
      return Promise.resolve(archer);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        resolve(null);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['archers'], 'readonly');
        const store = transaction.objectStore('archers');
        const index = store.index('name');
        
        // Use a cursor to find the first matching archer in the active competition
        const range = IDBKeyRange.only(name);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const archer = cursor.value;
            
            // Check if it's in the active competition
            if (!this.activeCompetition || archer.competitionId === this.activeCompetition.id) {
              resolve(archer);
              return;
            }
            
            // Otherwise, continue to the next match
            cursor.continue();
          } else {
            // No match found
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          console.error('Error getting archer by name:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in getArcherByName:', error);
        resolve(null);
      }
    });
  },
  
  /**
   * Check if an archer with the given name exists in the active competition
   * @param {string} name - Name to check
   * @returns {Promise<boolean>} Promise resolving to true if archer exists
   */
  archerExists: function(name) {
    return this.getArcherByName(name).then(archer => !!archer);
  },
  
  /**
   * Save archer data
   * @param {Object} archer - Archer object to save
   * @returns {Promise<Object>} Promise resolving to result object
   */
  saveScore: function(archer) {
    // Validate archer object
    if (!archer.name) {
      Logger.error('Cannot save archer without name');
      return Promise.reject(new Error('Archer name is required'));
    }
    
    // Calculate total if not provided
    if (archer.day1 !== undefined && archer.day2 !== undefined && archer.total === undefined) {
      archer.total = (parseInt(archer.day1) || 0) + (parseInt(archer.day2) || 0);
    }
    
    // Ensure it's associated with the active competition
    if (this.activeCompetition) {
      archer.competitionId = this.activeCompetition.id;
    } else if (!archer.competitionId) {
      Logger.warn('No active competition; archer will not be associated with any competition');
    }
    
    // Add membership ID if not present (support for existing data)
    if (!archer.membershipId) {
      archer.membershipId = '';
    }
  
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      
      // For localStorage, we need to check by name AND competition
      const competitionId = this.activeCompetition ? this.activeCompetition.id : null;
      const existingIndex = scores.findIndex(s => 
        s.name === archer.name && 
        (competitionId ? s.competitionId === competitionId : true)
      );
      
      const isUpdate = existingIndex >= 0;
      
      if (isUpdate) {
        // Preserve the archer id if it exists
        if (scores[existingIndex].id !== undefined) {
          archer.id = scores[existingIndex].id;
        }
        scores[existingIndex] = archer;
      } else {
        // Generate an id for the new archer
        archer.id = scores.length > 0 ? Math.max(...scores.map(s => s.id || 0)) + 1 : 1;
        scores.push(archer);
      }
      
      localStorage.setItem('archeryScores', JSON.stringify(scores));
      return Promise.resolve({ success: true, isUpdate });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      // First check if archer exists
      this.getArcherByName(archer.name)
        .then(existingArcher => {
          // Create a NEW transaction for the update/add operation
          const transaction = this.db.transaction(['archers'], 'readwrite');
          const store = transaction.objectStore('archers');
          
          let request;
          if (existingArcher) {
            // This is an update - preserve the ID
            archer.id = existingArcher.id;
            request = store.put(archer);
          } else {
            // This is a new archer
            request = store.add(archer);
          }
          
          request.onsuccess = () => {
            const isUpdate = !!existingArcher;
            resolve({ success: true, isUpdate });
          };
          
          request.onerror = (event) => {
            console.error('Error saving archer:', event.target.error);
            reject(event.target.error);
          };
          
          // Add transaction error handler
          transaction.onerror = (event) => {
            console.error('Transaction error in saveScore:', event.target.error);
            reject(event.target.error);
          };
        })
        .catch(error => {
          console.error('Error checking if archer exists:', error);
          reject(error);
        });
    });
  },
  
  /**
   * Delete an archer by name
   * @param {string} name - Name of archer to delete
   * @returns {Promise<Object>} Promise resolving to result object
   */
  deleteArcherByName: function(name) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      const competitionId = this.activeCompetition ? this.activeCompetition.id : null;
      
      // Filter by name AND competition
      const existingIndex = scores.findIndex(s => 
        s.name === name && 
        (competitionId ? s.competitionId === competitionId : true)
      );
      
      if (existingIndex >= 0) {
        scores.splice(existingIndex, 1);
        localStorage.setItem('archeryScores', JSON.stringify(scores));
        return Promise.resolve({ success: true, name });
      }
      
      return Promise.resolve({ success: false, message: 'Archer not found' });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        // First find the archer to get their ID
        this.getArcherByName(name).then(archer => {
          if (!archer) {
            resolve({ success: false, message: 'Archer not found' });
            return;
          }
          
          const transaction = this.db.transaction(['archers'], 'readwrite');
          const store = transaction.objectStore('archers');
          
          // Delete by ID
          const request = store.delete(archer.id);
          
          request.onsuccess = () => {
            resolve({ success: true, name });
          };
          
          request.onerror = (event) => {
            console.error('Error deleting archer:', event.target.error);
            reject(event.target.error);
          };
        });
      } catch (error) {
        console.error('Transaction error in deleteArcherByName:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Get archer by index
   * @param {number} index - Index of the archer to get
   * @returns {Promise<Object>} Promise with archer data and name
   */
  getArcherAtIndex: function(index) {
    return this.getAllScores().then(scores => {
      if (index >= 0 && index < scores.length) {
        return { 
          success: true, 
          archer: scores[index],
          name: scores[index].name 
        };
      }
      return { success: false, message: 'Invalid index' };
    });
  },
  
  /**
   * Delete an archer by index
   * @param {number} index - Index of the archer to delete
   * @returns {Promise<Object>} Promise resolving to result object
   */
  deleteScore: function(index) {
    return this.getArcherAtIndex(index).then(result => {
      if (result.success) {
        // If we have the actual archer object, delete by ID instead of name for more accuracy
        if (result.archer && result.archer.id !== undefined) {
          return this.deleteArcherById(result.archer.id);
        }
        
        return this.deleteArcherByName(result.name);
      }
      return result;
    });
  },
  
  /**
   * Delete an archer by ID
   * @param {number} id - ID of the archer to delete
   * @returns {Promise<Object>} Promise resolving to result object
   */
  deleteArcherById: function(id) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
      const existingIndex = scores.findIndex(s => s.id === id);
      
      if (existingIndex >= 0) {
        const archerName = scores[existingIndex].name;
        scores.splice(existingIndex, 1);
        localStorage.setItem('archeryScores', JSON.stringify(scores));
        return Promise.resolve({ success: true, id, name: archerName });
      }
      
      return Promise.resolve({ success: false, message: 'Archer not found' });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['archers'], 'readwrite');
        const store = transaction.objectStore('archers');
        
        // First get the archer to fetch their name
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const archer = getRequest.result;
          if (!archer) {
            resolve({ success: false, message: 'Archer not found' });
            return;
          }
          
          // Now delete it
          const deleteRequest = store.delete(id);
          
          deleteRequest.onsuccess = () => {
            resolve({ success: true, id, name: archer.name });
          };
          
          deleteRequest.onerror = (event) => {
            console.error('Error deleting archer by ID:', event.target.error);
            reject(event.target.error);
          };
        };
        
        getRequest.onerror = (event) => {
          console.error('Error getting archer by ID:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in deleteArcherById:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Clear all scores in the active competition
   * @returns {Promise<Object>} Promise resolving to result object
   */
  clearAllScores: function() {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      // Only clear scores for the active competition
      if (this.activeCompetition) {
        const scores = JSON.parse(localStorage.getItem('archeryScores') || '[]');
        const filteredScores = scores.filter(
          s => !s.competitionId || s.competitionId !== this.activeCompetition.id
        );
        localStorage.setItem('archeryScores', JSON.stringify(filteredScores));
      } else {
        // No active competition - clear all scores
        localStorage.removeItem('archeryScores');
      }
      return Promise.resolve({ success: true });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['archers'], 'readwrite');
        const store = transaction.objectStore('archers');
        
        // If we have an active competition, only clear scores for that competition
        if (this.activeCompetition) {
          const index = store.index('competitionId');
          const request = index.openCursor(IDBKeyRange.only(this.activeCompetition.id));
          
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          
          transaction.oncomplete = () => {
            resolve({ success: true });
          };
          
          transaction.onerror = (event) => {
            console.error('Error clearing competition scores:', event.target.error);
            reject(event.target.error);
          };
        } else {
          // No active competition - clear all scores
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve({ success: true });
          };
          
          request.onerror = (event) => {
            console.error('Error clearing scores:', event.target.error);
            reject(event.target.error);
          };
        }
      } catch (error) {
        console.error('Transaction error in clearAllScores:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Generate sample competition data for the active competition
   * @returns {Promise<Object>} Promise resolving to result object
   */
  generateSampleData: function() {
    // Create sample names to avoid duplicates
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'Thomas', 'Anna', 'James', 'Maria', 'Richard', 'Emily', 'Daniel'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'];
    const clubs = ['Dunbrody Archers', 'City Bowmen', 'Forest Archers', 'Greenwood Archers', 'Valley Archers', 'Mountain Bow Club'];
    
    // Function to generate random membership ID
    const generateMembershipId = () => {
      // Generate a random 5-digit number
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      // Format options for membership IDs
      const formats = [
        `IFAA-${randomNum}`,
        `DA-${randomNum}`,
        `IBOF-${randomNum.toString().substring(0, 4)}`,
        `ARC-${randomNum}`
      ];
      // Randomly pick one format
      return formats[Math.floor(Math.random() * formats.length)];
    };
    
    // Ensure we have an active competition
    if (!this.activeCompetition) {
      return Promise.reject(new Error('No active competition to generate data for'));
    }
    
    // Clear existing data first
    return this.clearAllScores().then(() => {
      const sampleData = [];
      const usedNames = new Set();
      const usedMembershipIds = new Set();
      
      // Generate sample data
      for (let c = 0; c < 3; c++) {
        const cat = this.categories[c];
        for (let a = 0; a < 2; a++) {
          const age = this.ageRanges[a];
          // Add 2-3 archers per category/age
          const count = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < count; i++) {
            // Generate unique name
            let name;
            do {
              const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
              const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
              name = `${firstName} ${lastName}`;
            } while (usedNames.has(name));
            usedNames.add(name);
            
            // Generate unique membership ID
            let membershipId;
            do {
              membershipId = generateMembershipId();
            } while (usedMembershipIds.has(membershipId));
            usedMembershipIds.add(membershipId);
            
            const club = clubs[Math.floor(Math.random() * clubs.length)];
            const day1 = 200 + Math.floor(Math.random() * 300);
            const day2 = 200 + Math.floor(Math.random() * 300);
            
            sampleData.push({
              name: name,
              club: club,
              category: cat,
              age: age,
              day1: day1,
              day2: day2,
              total: day1 + day2,
              competitionId: this.activeCompetition.id,
              membershipId: membershipId
            });
          }
        }
      }
      
      // Create some draws for demonstration
      if (sampleData.length >= 2) {
        // Make two archers have the same score (a draw)
        const score = 550;
        sampleData[0].day1 = 275;
        sampleData[0].day2 = 275;
        sampleData[0].total = score;
        
        sampleData[1].day1 = 280;
        sampleData[1].day2 = 270;
        sampleData[1].total = score;
      }
      
      // Leave a few archers without membership IDs (to show it's optional)
      const noMembershipCount = Math.min(2, Math.floor(sampleData.length * 0.2));
      for (let i = 0; i < noMembershipCount; i++) {
        const randomIndex = Math.floor(Math.random() * sampleData.length);
        sampleData[randomIndex].membershipId = '';
      }
      
      // Process archers sequentially instead of in parallel
      return sampleData.reduce((promiseChain, archer) => {
        return promiseChain
          .then(() => this.saveScore(archer))
          .then(() => this.saveCompetitor(archer));
      }, Promise.resolve())
      .then(() => {
        return { success: true, count: sampleData.length };
      });
    })
    .catch(error => {
      console.error('Error generating sample data:', error);
      return { success: false, error };
    });
  },
  
  /**
   * Process archer data from a form
   * @param {boolean} isInlineForm - Whether data comes from the inline form
   * @returns {Object} Processed archer object with calculated total
   */
  processArcherData: function(isInlineForm = false) {
    const prefix = isInlineForm ? 'inline' : '';
    
    // Get form elements, with error handling
    const nameElement = document.getElementById(`${prefix}ArcherName`);
    const clubElement = document.getElementById(`${prefix}Club`);
    const categoryElement = document.getElementById(`${prefix}CategorySelect`);
    const ageElement = document.getElementById(`${prefix}AgeRangeSelect`);
    const day1Element = document.getElementById(`${prefix}ScoreDay1`);
    const day2Element = document.getElementById(`${prefix}ScoreDay2`);
    
    Logger.debug('Form elements:', {
      nameElement, clubElement, categoryElement, 
      ageElement, day1Element, day2Element
    });
    
    // Safely get values with fallbacks
    const name = nameElement && nameElement.value ? nameElement.value : 'Unknown Archer';
    const club = clubElement && clubElement.value ? clubElement.value : '';
    const category = categoryElement && categoryElement.value ? categoryElement.value : this.categories[0];
    const age = ageElement && ageElement.value ? ageElement.value : this.ageRanges[0];
    const day1 = day1Element && day1Element.value ? (parseInt(day1Element.value) || 0) : 0;
    const day2 = day2Element && day2Element.value ? (parseInt(day2Element.value) || 0) : 0;
    
    const archer = {
      name: name,
      club: club,
      category: category,
      age: age,
      day1: day1,
      day2: day2,
      total: day1 + day2
    };
    
    // Add competition ID if we have an active competition
    if (this.activeCompetition) {
      archer.competitionId = this.activeCompetition.id;
    }
    
    Logger.debug('Processed archer data:', archer);
    return archer;
  },
  
  /**
   * Validate category against available categories
   * @param {string} category - Category to validate
   * @returns {string} Valid category (or default if invalid)
   */
  validateCategory: function(category) {
    if (!category || this.categories.indexOf(category) === -1) {
      return this.categories[0]; // Default to first category
    }
    return category;
  },
  
  /**
   * Validate age range against available age ranges
   * @param {string} age - Age range to validate
   * @returns {string} Valid age range (or default if invalid)
   */
  validateAgeRange: function(age) {
    if (!age || this.ageRanges.indexOf(age) === -1) {
      return this.ageRanges[0]; // Default to first age range
    }
    return age;
  },
  
  /**
   * Save a competitor for future reuse
   * @param {Object} competitor - Competitor object to save
   * @returns {Promise<Object>} Promise resolving to result object
   */
  saveCompetitor: function(competitor) {
    // Validate competitor object
    if (!competitor.name) {
      Logger.error('Cannot save competitor without name');
      return Promise.reject(new Error('Competitor name is required'));
    }
    
    // Add timestamp for sorting
    competitor.lastUsed = new Date().toISOString();
    
    // Stripped version with just competitor info (no scores)
    const savedCompetitor = {
      name: competitor.name,
      club: competitor.club,
      category: competitor.category,
      age: competitor.age,
      lastUsed: competitor.lastUsed
    };
    
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const savedCompetitors = JSON.parse(localStorage.getItem('savedCompetitors') || '[]');
      const existingIndex = savedCompetitors.findIndex(c => c.name === savedCompetitor.name);
      
      if (existingIndex >= 0) {
        savedCompetitors[existingIndex] = savedCompetitor;
      } else {
        savedCompetitors.push(savedCompetitor);
      }
      
      localStorage.setItem('savedCompetitors', JSON.stringify(savedCompetitors));
      return Promise.resolve({ success: true });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['savedCompetitors'], 'readwrite');
        const store = transaction.objectStore('savedCompetitors');
        
        const request = store.put(savedCompetitor);
        
        request.onsuccess = () => {
          resolve({ success: true });
        };
        
        request.onerror = (event) => {
          console.error('Error saving competitor:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in saveCompetitor:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Get all saved competitors
   * @returns {Promise<Array>} Promise resolving to array of saved competitors
   */
  getSavedCompetitors: function() {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const savedCompetitors = JSON.parse(localStorage.getItem('savedCompetitors') || '[]');
      return Promise.resolve(savedCompetitors);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized. Returning empty array.');
        resolve([]);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['savedCompetitors'], 'readonly');
        const store = transaction.objectStore('savedCompetitors');
        const request = store.getAll();
        
        request.onsuccess = () => {
          // Sort by last used date (most recent first)
          const competitors = request.result || [];
          competitors.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
          resolve(competitors);
        };
        
        request.onerror = (event) => {
          console.error('Error getting saved competitors:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in getSavedCompetitors:', error);
        resolve([]); // Return empty array on error
      }
    });
  },
  
  /**
   * Get a saved competitor by name
   * @param {string} name - Name of competitor to find
   * @returns {Promise<Object|null>} Promise resolving to competitor object or null
   */
  getSavedCompetitorByName: function(name) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const savedCompetitors = JSON.parse(localStorage.getItem('savedCompetitors') || '[]');
      const competitor = savedCompetitors.find(c => c.name === name) || null;
      return Promise.resolve(competitor);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        resolve(null);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['savedCompetitors'], 'readonly');
        const store = transaction.objectStore('savedCompetitors');
        const request = store.get(name);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = (event) => {
          console.error('Error getting saved competitor by name:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in getSavedCompetitorByName:', error);
        resolve(null);
      }
    });
  },
  
  /**
   * Delete a saved competitor
   * @param {string} name - Name of competitor to delete
   * @returns {Promise<Object>} Promise resolving to result object
   */
  deleteSavedCompetitor: function(name) {
    // Use localStorage if IndexedDB is not available
    if (this.useLocalStorage) {
      const savedCompetitors = JSON.parse(localStorage.getItem('savedCompetitors') || '[]');
      const filteredCompetitors = savedCompetitors.filter(c => c.name !== name);
      
      localStorage.setItem('savedCompetitors', JSON.stringify(filteredCompetitors));
      return Promise.resolve({ success: true });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(['savedCompetitors'], 'readwrite');
        const store = transaction.objectStore('savedCompetitors');
        
        const request = store.delete(name);
        
        request.onsuccess = () => {
          resolve({ success: true });
        };
        
        request.onerror = (event) => {
          console.error('Error deleting saved competitor:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Transaction error in deleteSavedCompetitor:', error);
        reject(error);
      }
    });
  }
};

// Make it available globally
window.ArcheryDataService = ArcheryDataService;
