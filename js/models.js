/**
 * Data Models for Archery Competition Tracker
 * Defines structured classes for the application's data entities
 */
import { ERRORS } from './constants.js';

/**
 * Archer model representing a competitor
 */
export class Archer {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name || '';
    this.club = data.club || '';
    this.category = data.category || '';
    this.age = data.age || '';
    this.day1 = parseInt(data.day1) || 0;
    this.day2 = parseInt(data.day2) || 0;
    this.total = (parseInt(data.day1) || 0) + (parseInt(data.day2) || 0);
    this.competitionId = data.competitionId;
    this.membershipId = data.membershipId || '';
  }
  
  /**
   * Validate the archer data
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];
    
    if (!this.name) errors.push(ERRORS.ARCHER_NAME_REQUIRED);
    if (!this.category) errors.push('Category is required');
    if (!this.age) errors.push('Age range is required');
    if (isNaN(this.day1) || this.day1 < 0) errors.push('Day 1 score must be a positive number');
    if (this.day2 !== undefined && (isNaN(this.day2) || this.day2 < 0)) errors.push('Day 2 score must be a positive number');
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Convert to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      club: this.club,
      category: this.category,
      age: this.age,
      day1: this.day1,
      day2: this.day2,
      total: this.total,
      competitionId: this.competitionId,
      membershipId: this.membershipId
    };
  }
}

/**
 * Competition model representing an archery competition
 */
export class Competition {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name || '';
    this.date = data.date || new Date().toISOString();
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt;
  }
  
  /**
   * Validate the competition data
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];
    
    if (!this.name) errors.push(ERRORS.COMPETITION_NAME_REQUIRED);
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Convert to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      date: this.date,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt || new Date().toISOString()
    };
  }
}

/**
 * SavedCompetitor model representing a saved archer for reuse
 */
export class SavedCompetitor {
  constructor(data = {}) {
    this.name = data.name || '';
    this.club = data.club || '';
    this.category = data.category || '';
    this.age = data.age || '';
    this.membershipId = data.membershipId || '';
    this.lastUsed = data.lastUsed || new Date().toISOString();
  }
  
  /**
   * Validate the saved competitor data
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];
    
    if (!this.name) errors.push(ERRORS.ARCHER_NAME_REQUIRED);
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Convert to a plain object for storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      name: this.name,
      club: this.club,
      category: this.category,
      age: this.age,
      membershipId: this.membershipId,
      lastUsed: this.lastUsed
    };
  }
  
  /**
   * Create a SavedCompetitor from an Archer
   * @param {Archer} archer - The archer to convert
   * @returns {SavedCompetitor} A new SavedCompetitor instance
   */
  static fromArcher(archer) {
    return new SavedCompetitor({
      name: archer.name,
      club: archer.club,
      category: archer.category,
      age: archer.age,
      membershipId: archer.membershipId,
      lastUsed: new Date().toISOString()
    });
  }
}

// For backward compatibility during migration
if (typeof window !== 'undefined') {
  window.Archer = Archer;
  window.Competition = Competition;
  window.SavedCompetitor = SavedCompetitor;
}
