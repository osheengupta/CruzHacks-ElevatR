document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const initialView = document.getElementById('initial-view');
  const savingView = document.getElementById('saving-view');
  const successView = document.getElementById('success-view');
  const errorView = document.getElementById('error-view');
  const resumeView = document.getElementById('resume-view');
  
  const saveJobBtn = document.getElementById('saveJobBtn');
  const viewDashboardBtn = document.getElementById('viewDashboardBtn');
  const viewAllJobsBtn = document.getElementById('viewAllJobsBtn');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const analyzeResumeBtn = document.getElementById('analyzeResumeBtn');
  const uploadResumeBtn = document.getElementById('uploadResumeBtn');
  const resumeFileInput = document.getElementById('resumeFileInput');
  
  const jobTitle = document.getElementById('job-title');
  const companyName = document.getElementById('company-name');
  const skillsList = document.getElementById('skills-list');
  const errorMessage = document.getElementById('error-message');
  
  // Backend API URL
  const API_BASE_URL = "http://localhost:8001";
  
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
  
  // Resume analysis features
  if (analyzeResumeBtn) {
    analyzeResumeBtn.addEventListener('click', function() {
      showView(resumeView);
    });
  }
  
  if (uploadResumeBtn) {
    uploadResumeBtn.addEventListener('click', function() {
      resumeFileInput.click();
    });
  }
  
  if (resumeFileInput) {
    resumeFileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        handleResumeUpload(file);
      }
    });
  }
  
  tryAgainBtn.addEventListener('click', function() {
    showView(initialView);
  });
  
  // Function to process job description
  function processJobDescription(jobData) {
    // Add useFirecrawl flag to enable Firecrawl extraction
    jobData.useFirecrawl = true;
    
    // Send job data to background script for processing
    chrome.runtime.sendMessage({
      action: "processJobWithLLM", 
      jobData: jobData
    }, function(response) {
      if (chrome.runtime.lastError || !response || response.error) {
        showError(response?.error || "Error processing job description. Please try again.");
        return;
      }
      
      // Display the extracted skills
      displayJobSkills(response);
      
      // Save the job to storage
      saveJobToStorage(response);
      
      // Show success view
      showView(successView);
    });
  }
  
  // Function to handle resume upload
  function handleResumeUpload(file) {
    // Show loading state
    const resumeStatus = document.getElementById('resume-status');
    if (resumeStatus) {
      resumeStatus.textContent = "Uploading and analyzing resume...";
    }
    
    // Read file as text or send to backend for processing
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const fileContent = e.target.result;
      
      // For PDF or DOCX files, send to backend for text extraction
      if (file.type === 'application/pdf') {
        // Extract text from PDF using backend
        sendResumeToBackend(fileContent, 'pdf');
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Extract text from DOCX using backend
        sendResumeToBackend(fileContent, 'docx');
      } else {
        // Assume it's plain text
        analyzeResumeText(fileContent);
      }
    };
    
    if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }
  
  // Function to send resume to backend for text extraction
  function sendResumeToBackend(fileContent, fileType) {
    // Implementation for sending resume to backend
    // This would be implemented based on your backend API
    if (resumeStatus) {
      resumeStatus.textContent = "Resume analysis complete!";
    }
  }
  
  // Function to analyze resume text
  function analyzeResumeText(resumeText) {
    // Implementation for analyzing resume text
    // This would be implemented based on your backend API
    if (resumeStatus) {
      resumeStatus.textContent = "Resume analysis complete!";
    }
  }
  
  // Function to display job skills
  function displayJobSkills(jobData) {
    // Set job title and company
    jobTitle.textContent = jobData.title || "Job Title";
    companyName.textContent = jobData.company || "Company";
    
    // Clear skills list
    skillsList.innerHTML = "";
    
    // Add skills to the list
    if (jobData.skills && jobData.skills.length > 0) {
      jobData.skills.forEach(function(skill) {
        const skillItem = document.createElement('li');
        skillItem.textContent = typeof skill === 'string' ? skill : skill.name;
        skillItem.className = 'skill-item';
        skillsList.appendChild(skillItem);
      });
    } else {
      const noSkills = document.createElement('li');
      noSkills.textContent = "No skills extracted";
      noSkills.className = 'no-skills';
      skillsList.appendChild(noSkills);
    }
  }
  
  // Function to save job to storage
  function saveJobToStorage(jobData) {
    chrome.storage.local.get(['savedJobs', 'skillFrequency'], function(data) {
      // Get existing jobs or initialize empty array
      const jobs = data.savedJobs || [];
      
      // Get existing skill frequency or initialize empty object
      const skillFreq = data.skillFrequency || {};
      
      // Create a new job object with unique ID and date
      const newJob = {
        id: Date.now().toString(),
        title: jobData.title,
        company: jobData.company,
        url: jobData.url,
        dateAdded: new Date().toISOString(),
        skills: jobData.skills || [],
        responsibilities: jobData.responsibilities || [],
        salary: jobData.salary || "Not specified"
      };
      
      // Add job to array
      jobs.push(newJob);
      
      // Update skill frequency
      if (jobData.skills && jobData.skills.length > 0) {
        jobData.skills.forEach(function(skill) {
          const skillName = typeof skill === 'string' ? skill : skill.name;
          skillFreq[skillName] = (skillFreq[skillName] || 0) + 1;
        });
      }
      
      // Save updated data to storage
      chrome.storage.local.set({
        savedJobs: jobs,
        skillFrequency: skillFreq
      });
    });
  }
  
  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    showView(errorView);
  }
  
  // Function to show a specific view and hide others
  function showView(viewToShow) {
    // Hide all views
    initialView.style.display = 'none';
    savingView.style.display = 'none';
    successView.style.display = 'none';
    errorView.style.display = 'none';
    
    if (resumeView) {
      resumeView.style.display = 'none';
    }
    
    // Show the requested view
    viewToShow.style.display = 'block';
  }
});
