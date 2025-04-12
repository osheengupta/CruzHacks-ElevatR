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
  
  function processJobDescription(jobData) {
    // In a real implementation, this would call your backend API
    // For now, we'll simulate the API call with a timeout
    
    // Mock API call
    setTimeout(function() {
      try {
        // For demo purposes, we'll extract some basic info
        const extractedData = {
          title: jobData.title || "Software Engineer",
          company: jobData.company || "Tech Company",
          skills: ["JavaScript", "React", "Node.js", "API Design", "Problem Solving"]
        };
        
        // Save to local storage
        chrome.storage.local.get({savedJobs: []}, function(data) {
          const savedJobs = data.savedJobs;
          savedJobs.push({
            id: Date.now(),
            url: jobData.url,
            title: extractedData.title,
            company: extractedData.company,
            description: jobData.description,
            skills: extractedData.skills,
            dateAdded: new Date().toISOString()
          });
          
          chrome.storage.local.set({savedJobs: savedJobs}, function() {
            // Update UI with extracted info
            jobTitle.textContent = extractedData.title;
            companyName.textContent = extractedData.company;
            
            // Clear and populate skills list
            skillsList.innerHTML = '';
            extractedData.skills.forEach(function(skill) {
              const li = document.createElement('li');
              li.textContent = skill;
              skillsList.appendChild(li);
            });
            
            // Show success view
            showView(successView);
          });
        });
      } catch (err) {
        showError("Error processing job description: " + err.message);
      }
    }, 1500); // Simulate API delay
  }
});
