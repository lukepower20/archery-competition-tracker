/**
 * Constants for Archery Competition Tracker
 * Centralizes configuration values and constants used throughout the application
 */
const CONSTANTS = {
  // Categories for archers
  CATEGORIES: [
    "01. Barebow Compound (BB-C)",
    "02. Barebow Recurve (BB-R)",
    "03. Bowhunter Compound (BH-C)",
    "04. Bowhunter Recurve (BH-R)",
    "05. Bowhunter Limited (BL)",
    "06. Bowhunter Unlimited (BU)",
    "07. Freestyle Ltd. Compound (FS-C)",
    "08. Freestyle Ltd. Recurve (FS-R)",
    "09. Freestyle Unlimited (FU)",
    "10. Longbow (LB)",
    "11. Historical Bow (HB)",
    "12. Trad. Recurve IFAA (TR - IFAA)"
  ],
  
  // Age ranges for archers
  AGE_RANGES: [
    "0. Senior Male",
    "1. Senior Female",
    "2. Veteran Male",
    "3. Veteran Female",
    "4. Adult Male",
    "5. Adult Female",
    "6. Young Adult Male",
    "7. Young Adult Female",
    "8. Junior Male",
    "9. Junior Female",
    "10. Cub Male",
    "11. Cub Female"
  ],
  
  // Database configuration
  DB: {
    NAME: 'ArcheryTrackerDB',
    VERSION: 4,
    STORES: {
      ARCHERS: 'archers',
      SETTINGS: 'settings',
      COMPETITIONS: 'competitions',
      SAVED_COMPETITORS: 'savedCompetitors'
    },
    INDEXES: {
      NAME: 'name',
      COMPETITION_ID: 'competitionId',
      CATEGORY: 'category',
      AGE: 'age',
      CLUB: 'club',
      LAST_USED: 'lastUsed'
    }
  },
  
  // Error messages
  ERRORS: {
    DB_NOT_INITIALIZED: 'Database not initialized',
    NO_ACTIVE_COMPETITION: 'No active competition selected',
    ARCHER_NAME_REQUIRED: 'Archer name is required',
    COMPETITION_NAME_REQUIRED: 'Competition name is required',
    COMPETITION_ID_REQUIRED: 'Competition ID is required',
    COMPETITION_NOT_FOUND: 'Competition not found',
    ARCHER_NOT_FOUND: 'Archer not found',
    INVALID_INDEX: 'Invalid index'
  },
  
  // UI related constants
  UI: {
    ANIMATION_DURATION: 200,
    NOTIFICATION_DURATION: 3000,
    DEFAULT_PAGE_SIZE: 20,
    HIGHLIGHT_CLASS: 'highlight-row',
    POSITION_CLASSES: ['position-1', 'position-2', 'position-3']
  },
  
  // Sync related constants
  SYNC: {
    CONFLICT_RESOLUTION: {
      REMOTE: 'remote',
      LOCAL: 'local',
      NEWER: 'newer',
      ASK: 'ask'
    },
    STATUS: {
      READY: 'ready',
      SYNCING: 'syncing',
      SUCCESS: 'success',
      ERROR: 'error',
      WARNING: 'warning',
      PENDING: 'pending',
      INACTIVE: 'inactive'
    }
  }
};

// Make it available globally
window.CONSTANTS = CONSTANTS;
