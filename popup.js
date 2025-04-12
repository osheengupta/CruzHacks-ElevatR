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
    // Show loading state
    const loadingText = document.querySelector('#savingText');
    loadingText.textContent = 'Analyzing job description...';
    
    // Get the API base URL
    const API_BASE_URL = "http://localhost:8000";
    
    // Call our backend API to extract skills from the job description
    fetch(`${API_BASE_URL}/extract-job-skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        job_description: jobData.description,
        job_title: jobData.title,
        company: jobData.company
      })
    })
    .then(response => response.json())
    .then(data => {
      try {
        console.log('Backend response:', data);
        
        // Check if there's an error
        if (data.error) {
          // Check if it's an OpenAI API error
          if (data.error.includes('OpenAI')) {
            throw new Error('AI Service Error: There was an issue with the AI service. Please try again later.');
          } else {
            throw new Error(data.error);
          }
        }
        
        // Use the extracted skills from the backend
        const extractedData = {
          title: jobData.title || "Software Engineer",
          company: jobData.company || "Tech Company",
          skills: data.skills || []
        };
        
        // If no skills were extracted, use some common skills based on the job title
        if (extractedData.skills.length === 0) {
          console.log('No skills extracted, using fallback skills');
          extractedData.skills = getDefaultSkillsForJobTitle(jobData.title);
        }
        
        // Save to local storage
        chrome.storage.local.get({savedJobs: [], skillFrequency: {}}, function(data) {
          const savedJobs = data.savedJobs;
          const skillFreq = data.skillFrequency || {};
          
          // Add the new job
          const newJob = {
            id: Date.now(),
            url: jobData.url,
            title: extractedData.title,
            company: extractedData.company,
            description: jobData.description,
            skills: extractedData.skills,
            dateAdded: new Date().toISOString()
          };
          
          console.log('Saving job with skills:', newJob.skills);
          savedJobs.push(newJob);
          
          // Update skill frequency counter
          extractedData.skills.forEach(skill => {
            const skillName = typeof skill === 'string' ? skill : skill.name;
            skillFreq[skillName] = (skillFreq[skillName] || 0) + 1;
            console.log(`Updated skill frequency for ${skillName}: ${skillFreq[skillName]}`);
          });
          
          // Save both the updated jobs and skill frequency
          chrome.storage.local.set({savedJobs: savedJobs, skillFrequency: skillFreq}, function() {
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
        console.error('Error processing extracted data:', err);
        showError("Error processing job description: " + err.message);
      }
    })
    .catch(err => {
      console.error('Error calling backend API:', err);
      
      // Fallback to local processing if backend call fails
      try {
        loadingText.textContent = 'Using local processing...';
        
        // Extract basic info and use default skills based on job title
        const extractedData = {
          title: jobData.title || "Software Engineer",
          company: jobData.company || "Tech Company",
          skills: getDefaultSkillsForJobTitle(jobData.title)
        };
        
        // Save to local storage
        chrome.storage.local.get({savedJobs: [], skillFrequency: {}}, function(data) {
          const savedJobs = data.savedJobs;
          const skillFreq = data.skillFrequency || {};
          
          // Add the new job
          const newJob = {
            id: Date.now(),
            url: jobData.url,
            title: extractedData.title,
            company: extractedData.company,
            description: jobData.description,
            skills: extractedData.skills,
            dateAdded: new Date().toISOString()
          };
          
          console.log('Saving job with fallback skills:', newJob.skills);
          savedJobs.push(newJob);
          
          // Update skill frequency counter
          extractedData.skills.forEach(skill => {
            const skillName = typeof skill === 'string' ? skill : skill.name;
            skillFreq[skillName] = (skillFreq[skillName] || 0) + 1;
          });
          
          // Save both the updated jobs and skill frequency
          chrome.storage.local.set({savedJobs: savedJobs, skillFrequency: skillFreq}, function() {
            // Update UI with extracted info
            jobTitle.textContent = extractedData.title;
            companyName.textContent = extractedData.company;
            
            // Clear and populate skills list
            skillsList.innerHTML = '';
            extractedData.skills.forEach(function(skill) {
              const li = document.createElement('li');
              li.textContent = typeof skill === 'string' ? skill : skill.name;
              skillsList.appendChild(li);
            });
            
            // Show success view
            showView(successView);
          });
        });
      } catch (err) {
        console.error('Error in fallback processing:', err);
        showError("Error processing job description: " + err.message);
      }
    });
  }
});
