document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const initialView = document.getElementById('initial-view');
  const savingView = document.getElementById('saving-view');
  const successView = document.getElementById('success-view');
  const errorView = document.getElementById('error-view');
  
  const saveJobBtn = document.getElementById('saveJobBtn');
  const viewDashboardBtn = document.getElementById('viewDashboardBtn');
  const viewAllJobsBtn = document.getElementById('viewAllJobsBtn');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  
  const jobTitle = document.getElementById('job-title');
  const companyName = document.getElementById('company-name');
  const skillsList = document.getElementById('skills-list');
  const errorMessage = document.getElementById('error-message');
  
  // Backend API URL
  const API_BASE_URL = "http://localhost:8000";
  
  // Show initial view by default
  showView(initialView);
  
  // Button click handlers
  saveJobBtn.addEventListener('click', function() {
    showView(savingView);
    
    // Send message to content script to extract job description
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDescription"}, function(response) {
        if (chrome.runtime.lastError || !response || response.error) {
          showError("Could not extract job description. Please make sure you're on a job posting page.");
          return;
        }
        
        // Process the job description with our backend/LLM
        processJobDescription(response.jobData);
      });
    });
  });
  
  viewDashboardBtn.addEventListener('click', function() {
    // Open dashboard in a new tab
    chrome.tabs.create({url: 'dashboard.html'});
  });
  
  viewAllJobsBtn.addEventListener('click', function() {
    // Open dashboard in a new tab
    chrome.tabs.create({url: 'dashboard.html'});
  });
  
  tryAgainBtn.addEventListener('click', function() {
    showView(initialView);
  });
  
  // Helper functions
  function showView(viewToShow) {
    // Hide all views
    initialView.classList.add('hidden');
    savingView.classList.add('hidden');
    successView.classList.add('hidden');
    errorView.classList.add('hidden');
    
    // Show the requested view
    viewToShow.classList.remove('hidden');
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    showView(errorView);
  }
  
  async function processJobDescription(jobData) {
    try {
      console.log("Processing job data:", jobData);
      
      // Send to background script for processing with CrewAI
      chrome.runtime.sendMessage(
        {action: "processJobWithLLM", jobData: jobData},
        function(response) {
          if (chrome.runtime.lastError || !response || response.error) {
            console.error("Error processing job:", response ? response.error : chrome.runtime.lastError);
            showError("Error processing job description. Please try again.");
            return;
          }
          
          console.log("Processed job data:", response);
          
          // Save to local storage
          chrome.storage.local.get({savedJobs: []}, function(data) {
            const savedJobs = data.savedJobs;
            savedJobs.push({
              id: Date.now(),
              url: jobData.url,
              title: response.title || jobData.title,
              company: response.company || jobData.company,
              description: jobData.description,
              skills: response.skills || [],
              responsibilities: response.responsibilities || [],
              dateAdded: new Date().toISOString()
            });
            
            chrome.storage.local.set({savedJobs: savedJobs}, function() {
              // Update UI with extracted info
              jobTitle.textContent = response.title || jobData.title;
              companyName.textContent = response.company || jobData.company;
              
              // Clear and populate skills list
              skillsList.innerHTML = '';
              const skills = response.skills || [];
              skills.forEach(function(skill) {
                const li = document.createElement('li');
                li.textContent = typeof skill === 'string' ? skill : skill.name;
                skillsList.appendChild(li);
              });
              
              // Show success view
              showView(successView);
            });
          });
        }
      );
    } catch (err) {
      console.error("Error processing job description:", err);
      showError("Error processing job description: " + err.message);
    }
  }
});
