/**
 * Export Service for Archery Competition Tracker
 * Handles exporting and importing data to/from Excel
 */
import { ArcheryDataService } from './data-service.js';
// Bootstrap is loaded globally in the HTML file

export const ArcheryExportService = {
  // Cache for scores data to avoid passing large datasets
  scoresData: null,
  
  /**
   * Set scores data for export operations
   * @param {Array} scores - Array of archer score objects
   */
  setScoresData: function(scores) {
    this.scoresData = scores;
    console.log('Data set for export:', scores ? scores.length : 0, 'records');
  },
  
  /**
   * Export archer data to Excel file in IFAF format with better error handling
   * @returns {Promise<Object>} Promise resolving to result object
   */
  exportToExcel: function() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting export process...');
        
        if (!this.scoresData || this.scoresData.length === 0) {
          console.warn('No data available for export');
          resolve({ success: false, message: 'No data to export. Add some scores first!' });
          return;
        }
        
        // Get active competition info
        const activeCompetition = ArcheryDataService.getActiveCompetition();
        if (!activeCompetition) {
          console.warn('No active competition');
          resolve({ success: false, message: 'No active competition selected.' });
          return;
        }
        
        console.log('Active competition:', activeCompetition);
        
        // Create a new workbook - Basic format
        const workbook = XLSX.utils.book_new();
        
        // Instead of complex formatting, start with a simpler approach:
        // Convert data directly to worksheet rows
        const rows = [
          ["USE FOR ALL IFAF SHOOTS"], 
          ["EMAIL RESULTS TO THE EMAIL ADDRESSES LISTED TO SUPPORT WEBSITE, GAINS AND RECORDS."],
          ["pro@ifaf.ie", "", "", "membersec@ifaf.ie"],
          [], // Empty row
          ["Host Club:", activeCompetition.name || "Aos Dana Archers"],
          ["Round:", "1x28 UAR", "# of competitors:", this.scoresData.length],
          ["Max Score:", "560", "Date:", new Date(activeCompetition.date).toLocaleDateString('en-GB')],
          [] // Empty row
        ];
        
        // Add all archers to a simple table format
        rows.push(["Category", "", "Name", "Membership #", "Club", "Score"]);
        
        // Group the data
        const categories = {};
        this.scoresData.forEach(score => {
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
        
        // Add each category
        Object.values(categories).forEach(category => {
          rows.push([category.category, category.age]);
          
          // Sort archers by score (descending)
          category.archers.sort((a, b) => b.total - a.total);
          
          // Add each archer in this category
          category.archers.forEach(archer => {
            rows.push(["", "", archer.name, archer.membershipId || "", archer.club || "", archer.total]);
          });
          
          // Add a blank row between categories
          rows.push([]);
        });
        
        console.log('Created worksheet data with', rows.length, 'rows');
        
        // Create basic worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        
        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
        
        console.log('Created worksheet and added to workbook');
        
        // Generate Excel file and trigger download
        try {
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          console.log('Excel buffer created, size:', excelBuffer.length);
          
          this.saveExcelFile(excelBuffer, `IFAF_Results_${Date.now()}.xlsx`);
          console.log('File saved successfully');
          
          resolve({ success: true });
        } catch (writeError) {
          console.error('Error writing Excel:', writeError);
          reject({ success: false, message: 'Error generating Excel file: ' + writeError.message });
        }
      } catch (error) {
        console.error('Export error:', error);
        reject({ success: false, message: 'An error occurred during export: ' + error.message });
      }
    });
  },
  
  /**
   * Helper function to save Excel file with improved error handling
   * @param {ArrayBuffer} buffer - Excel file buffer
   * @param {string} fileName - Name of the file to save
   */
  saveExcelFile: function(buffer, fileName) {
    try {
      const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // For IE/Edge
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(data, fileName);
        return;
      }
      
      // For other browsers
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(data);
      link.download = fileName;
      document.body.appendChild(link); // Ensure link is in the document
      link.click();
      
      // Cleanup
      setTimeout(function() {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }, 100);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file: ' + error.message);
    }
  },
  
  /**
   * Import archer data from Excel file (unchanged)
   */
  importFromExcel: function(file) {
    // Keep the existing implementation
  }
};

// Make it available globally
window.ArcheryExportService = ArcheryExportService;
