/**
 * Debug Helper for Archery Competition Tracker
 * Provides debugging tools and utilities
 */
import { ArcheryDataService } from './data-service.js';
// Bootstrap is loaded globally in the HTML file

export const ArcheryDebugHelper = {
    /**
     * Test all form functions and data flow
     */
    testAddScoreFunction: function() {
      console.group('🔍 TESTING ADD SCORE FUNCTIONALITY');
      
      // Check if all required elements exist
      const elements = {
        scoreForm: document.getElementById('scoreForm'),
        archerName: document.getElementById('archerName'),
        club: document.getElementById('club'),
        categorySelect: document.getElementById('categorySelect'),
        ageRangeSelect: document.getElementById('ageRangeSelect'),
        scoreDay1: document.getElementById('scoreDay1'),
        scoreDay2: document.getElementById('scoreDay2'),
        addScoreBtn: document.getElementById('addScoreBtn')
      };
      
      console.log('Required elements:', elements);
      
      // Check for any missing elements
      const missingElements = [];
      for (const [key, element] of Object.entries(elements)) {
        if (!element) missingElements.push(key);
      }
      
      if (missingElements.length > 0) {
        console.error('❌ Missing elements:', missingElements);
      } else {
        console.log('✅ All required elements found');
      }
      
      // Test data processing
      if (ArcheryDataService && typeof ArcheryDataService.processArcherData === 'function') {
        console.log('Testing processArcherData...');
        
        // Fill in form with test data
        if (elements.archerName) elements.archerName.value = 'Test Archer';
        if (elements.club) elements.club.value = 'Debug Club';
        if (elements.scoreDay1) elements.scoreDay1.value = '100';
        if (elements.scoreDay2) elements.scoreDay2.value = '95';
        
        // Process data
        try {
          const archer = ArcheryDataService.processArcherData(false);
          console.log('✅ Processed data:', archer);
        } catch (error) {
          console.error('❌ Error processing data:', error);
        }
      } else {
        console.error('❌ ArcheryDataService or processArcherData not available');
      }
      
      // Test score saving
      if (ArcheryDataService && typeof ArcheryDataService.saveScore === 'function') {
        console.log('Testing saveScore...');
        
        const testArcher = {
          name: 'Debug Archer',
          club: 'Debug Club',
          category: ArcheryDataService.categories[0],
          age: ArcheryDataService.ageRanges[0],
          day1: 100,
          day2: 95,
          total: 195
        };
        
        try {
          const result = ArcheryDataService.saveScore(testArcher);
          console.log('✅ Save result:', result);
          
          // Verify data was saved
          const allScores = ArcheryDataService.getAllScores();
          const found = allScores.find(a => a.name === 'Debug Archer');
          console.log('Verification - archer in data:', found);
        } catch (error) {
          console.error('❌ Error saving score:', error);
        }
      } else {
        console.error('❌ ArcheryDataService or saveScore not available');
      }
      
      console.groupEnd();
      
      return "Debug tests completed. Check browser console for results.";
    }
  };
  
  // Make it available globally
  window.ArcheryDebugHelper = ArcheryDebugHelper;
