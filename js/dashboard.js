// Create a file called dashboard.js with this content
/**
 * Simple Dashboard for Archery Competition Tracker
 * This is a vanilla JavaScript implementation - no React required
 */

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Register the dashboard tab click handler
    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab) {
      dashboardTab.addEventListener('click', function() {
        // Initialize dashboard when tab is selected
        renderDashboard();
      });
      
      // Also initialize on first load if dashboard is the active tab
      if (dashboardTab.classList.contains('active')) {
        setTimeout(renderDashboard, 200);
      }
    }
  });
  
  /**
   * Render the dashboard with current competition data
   */
  async function renderDashboard() {
    const dashboardRoot = document.getElementById('dashboard-root');
    if (!dashboardRoot) return;
    
    try {
      // Show loading state
      dashboardRoot.innerHTML = `
        <div class="text-center p-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
      
      // Get active competition
      const activeCompetition = ArcheryDataService.getActiveCompetition();
      if (!activeCompetition) {
        dashboardRoot.innerHTML = `
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            No active competition selected. Please select or create a competition first.
          </div>
        `;
        return;
      }
      
      // Get all scores
      const scores = await ArcheryDataService.getAllScores();
      
      // Process data for dashboard
      const categoryCount = {};
      let totalArchers = scores.length;
      let highestScore = 0;
      let highestScorer = "";
      let averageScore = 0;
      
      scores.forEach(archer => {
        // Count by category
        if (!categoryCount[archer.category]) {
          categoryCount[archer.category] = 0;
        }
        categoryCount[archer.category]++;
        
        // Track highest score
        if (archer.total > highestScore) {
          highestScore = archer.total;
          highestScorer = archer.name;
        }
        
        // Sum scores for average
        averageScore += archer.total;
      });
      
      // Calculate average
      averageScore = totalArchers ? Math.round(averageScore / totalArchers) : 0;
      
      // Format date
      const competitionDate = new Date(activeCompetition.date).toLocaleDateString();
      
      // Create the HTML for the dashboard
      dashboardRoot.innerHTML = `
        <div class="dashboard-overview">
          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-header bg-primary text-white">
                  <h3 class="h5 mb-0">Competition Overview</h3>
                </div>
                <div class="card-body">
                  <h4 class="h3 mb-3">${activeCompetition.name}</h4>
                  <p class="text-muted">${competitionDate}</p>
                  
                  <div class="row text-center mt-4">
                    <div class="col-4">
                      <div class="stat-item p-2 rounded bg-light">
                        <span class="stat-value">${totalArchers}</span>
                        <span class="stat-label d-block">Archers</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="stat-item p-2 rounded bg-light">
                        <span class="stat-value">${highestScore}</span>
                        <span class="stat-label d-block">Top Score</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="stat-item p-2 rounded bg-light">
                        <span class="stat-value">${averageScore}</span>
                        <span class="stat-label d-block">Average</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-4">
                    <h5>Highest Scorer</h5>
                    <div class="d-flex align-items-center">
                      <div class="badge bg-success p-2 me-2">
                        <i class="bi bi-trophy fs-5"></i>
                      </div>
                      <div>
                        <div class="fw-bold">${highestScorer}</div>
                        <div>Score: ${highestScore}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-header bg-primary text-white">
                  <h3 class="h5 mb-0">Participation by Category</h3>
                </div>
                <div class="card-body">
                  <div class="chart-container" style="height: 250px">
                    <canvas id="categoryChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header bg-primary text-white">
                  <h3 class="h5 mb-0">Quick Actions</h3>
                </div>
                <div class="card-body p-0">
                  <div class="row g-0 text-center">
                    <div class="col-4 border-end py-3">
                      <button class="btn btn-link text-decoration-none" id="dashboard-add-archer">
                        <div class="quick-action-icon mb-2">
                          <i class="bi bi-person-plus-fill fs-1"></i>
                        </div>
                        <span class="d-block">Add Archer</span>
                      </button>
                    </div>
                    <div class="col-4 border-end py-3">
                      <button class="btn btn-link text-decoration-none" id="dashboard-print-results">
                        <div class="quick-action-icon mb-2">
                          <i class="bi bi-printer-fill fs-1"></i>
                        </div>
                        <span class="d-block">Print Results</span>
                      </button>
                    </div>
                    <div class="col-4 py-3">
                      <button class="btn btn-link text-decoration-none" id="dashboard-export-data">
                        <div class="quick-action-icon mb-2">
                          <i class="bi bi-file-earmark-excel fs-1"></i>
                        </div>
                        <span class="d-block">Export Data</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners to quick action buttons
      document.getElementById('dashboard-add-archer').addEventListener('click', function() {
        document.getElementById('enter-tab').click();
      });
      
      document.getElementById('dashboard-print-results').addEventListener('click', function() {
        document.getElementById('results-tab').click();
        setTimeout(() => {
          const printBtn = document.getElementById('printResultsBtn');
          if (printBtn) printBtn.click();
        }, 300);
      });
      
      document.getElementById('dashboard-export-data').addEventListener('click', function() {
        document.getElementById('exportExcelBtn').click();
      });
      
      // Create category chart using Chart.js
      createCategoryChart(Object.keys(categoryCount).map(category => ({
        category: category.split('.')[1] || category,
        count: categoryCount[category]
      })));
      
    } catch (error) {
      console.error('Error rendering dashboard:', error);
      dashboardRoot.innerHTML = `
        <div class="alert alert-danger">
          <p><strong>Error loading dashboard:</strong> ${error.message}</p>
          <p>Please check browser console for details and try refreshing the page.</p>
        </div>
      `;
    }
  }
  
  /**
   * Create a chart showing category distribution
   * @param {Array} data - Array of category data objects
   */
  function createCategoryChart(data) {
    // If Chart.js is not available, add it
    if (typeof Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
      script.onload = function() {
        renderChart(data);
      };
      document.head.appendChild(script);
    } else {
      renderChart(data);
    }
    
    function renderChart(chartData) {
      const ctx = document.getElementById('categoryChart').getContext('2d');
      
      // Destroy existing chart if any
      if (window.categoryChart instanceof Chart) {
        window.categoryChart.destroy();
      }
      
      // Create new chart
      window.categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.map(item => item.category),
          datasets: [{
            label: 'Number of Archers',
            data: chartData.map(item => item.count),
            backgroundColor: '#2b5797',
            borderColor: '#1e3c6a',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }