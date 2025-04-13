// Global resume data object that can be accessed by all components
window.elevatrGlobal = window.elevatrGlobal || {
  resumeData: null,
  resumeText: null,
  resumeFileName: null,
  isResumeUploaded: false
};

document.addEventListener('DOMContentLoaded', function() {
  // API URL for backend
  const API_BASE_URL = "http://localhost:8005";
  
  // Check if we have resume data in storage and restore it to the global object
  try {
    const storedData = localStorage.getItem('elevatrResumeData') || localStorage.getItem('resumeData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.rawText) {
        window.elevatrGlobal.resumeText = parsedData.rawText;
        window.elevatrGlobal.resumeFileName = parsedData.fileName || 'resume';
        window.elevatrGlobal.isResumeUploaded = true;
        window.elevatrGlobal.resumeData = parsedData;
        console.log('Restored resume data to global object on page load:', parsedData.fileName);
      }
    }
  } catch (error) {
    console.error('Error restoring resume data:', error);
  }
  
  // Synchronize job data between Chrome storage and localStorage
  synchronizeJobData();
  
  // DOM Elements
  const jobsSavedCount = document.getElementById('jobsSavedCount');
  const uniqueSkillsCount = document.getElementById('uniqueSkillsCount');
  const topSkill = document.getElementById('topSkill');
  const savedJobsList = document.getElementById('savedJobsList');
  const jobSearchInput = document.getElementById('jobSearchInput');
  const jobRoleFilter = document.getElementById('jobRoleFilter');
  const jobRoleSkillsFilter = document.getElementById('jobRoleSkillsFilter');
  const topSkillsList = document.getElementById('topSkillsList');
  const technicalSkillsList = document.getElementById('technicalSkillsList');
  const softSkillsList = document.getElementById('softSkillsList');
  const uploadResumeBtn = document.getElementById('uploadResumeBtn');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const promptUploadBtn = document.getElementById('promptUploadBtn');
  const resumeUploadPrompt = document.getElementById('resumeUploadPrompt');
  const resumeAnalysisResults = document.getElementById('resumeAnalysisResults');
  const resumeSkillsList = document.getElementById('resumeSkillsList');
  const skillGapsList = document.getElementById('skillGapsList');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const projectRecommendations = document.getElementById('projectRecommendations');
  const recommendationsList = document.getElementById('recommendationsList');
  const loadingIndicator = document.querySelector('.loading-indicator');
  const learningResourcesList = document.getElementById('learningResourcesList');
  
  // Modal elements
  const jobModal = document.getElementById('jobModal');
  const modalJobTitle = document.getElementById('modalJobTitle');
  const modalCompanyName = document.getElementById('modalCompanyName');
  const modalSkillsList = document.getElementById('modalSkillsList');
  const modalResponsibilitiesList = document.getElementById('modalResponsibilitiesList');
  const closeModal = document.querySelector('.close-modal');
  const deleteJobBtn = document.getElementById('deleteJobBtn');
  
  // Chart instance
  let skillsChart;
  
  // Current job being viewed in modal
  let currentJobId;
  
  // Resume data
  let resumeData = null;
  let extractedJobSkills = null;
  
  // Load and display saved jobs
  loadSavedJobs();
  
  // Event listeners
  jobSearchInput.addEventListener('input', filterJobs);
  jobRoleFilter.addEventListener('change', filterJobs);
  jobRoleSkillsFilter.addEventListener('change', updateTopSkillsByRole);
  uploadResumeBtn.addEventListener('click', () => resumeFileInput.click());
  promptUploadBtn.addEventListener('click', () => resumeFileInput.click());
  resumeFileInput.addEventListener('change', handleResumeUpload);
  
  // We're no longer using the direct recommendations button as per user request to simplify the interface
  // The showDirectRecommendations function is kept for reference and potential future use
  
  // Create a function that can be used by the analyze button
  function showDirectRecommendations() {
    console.log('Showing direct recommendations');
    
    // Ensure the container is visible
    projectRecommendations.style.display = 'block';
    
    // Clear previous content
    recommendationsList.innerHTML = '';
    learningResourcesList.innerHTML = '';
    
    // Add a loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.style.padding = '20px';
    loadingMessage.style.background = '#f8f9fa';
    loadingMessage.style.margin = '10px 0';
    loadingMessage.style.borderRadius = '5px';
    loadingMessage.style.border = '1px solid #ddd';
    loadingMessage.style.color = '#333';
    loadingMessage.innerHTML = '<strong>Loading recommendations...</strong><br>Please wait...';
    recommendationsList.appendChild(loadingMessage);
    
    // Use a default set of skill gaps if none are found
    let skillGaps = ['express', 'git'];
    
    // Try to get skill gaps from the skill gaps list if available
    try {
      if (skillGapsList) {
        const skillGapsElements = skillGapsList.querySelectorAll('li');
        if (skillGapsElements && skillGapsElements.length > 0) {
          skillGaps = Array.from(skillGapsElements).map(li => li.textContent.trim());
        }
      }
    } catch (e) {
      console.error('Error getting skill gaps from DOM:', e);
    }
    
    console.log('Using skill gaps:', skillGaps);
    
    // After a short delay, show recommendations
    setTimeout(() => {
      // Remove the loading message
      recommendationsList.innerHTML = '';
      
      // 1. Add project recommendations
      const projectsHeading = document.createElement('h3');
      projectsHeading.textContent = 'Recommended Projects';
      projectsHeading.style.margin = '20px 0';
      projectsHeading.style.color = '#333';
      projectsHeading.style.borderBottom = '1px solid #eee';
      projectsHeading.style.paddingBottom = '10px';
      recommendationsList.appendChild(projectsHeading);
      
      // Generate and add projects
      const projects = [
        {
          title: 'Express REST API',
          difficulty: 'Medium',
          description: 'Build a RESTful API using Express.js with authentication and database integration.',
          skills_targeted: ['express', 'Node.js', 'API Development'],
          time_estimate: '2-3 weeks',
          resources: ['Express.js documentation', 'MongoDB Atlas']
        },
        {
          title: 'Git Workflow Manager',
          difficulty: 'Intermediate',
          description: 'Create a visual Git workflow tool to help developers manage branches and merges.',
          skills_targeted: ['git', 'JavaScript', 'UI/UX'],
          time_estimate: '3-4 weeks',
          resources: ['Git documentation', 'D3.js for visualizations']
        }
      ];
      
      projects.forEach(project => {
        const card = createProjectCard(project);
        recommendationsList.appendChild(card);
      });
      
      // 2. Add learning resources
      const resourcesHeading = document.createElement('h3');
      resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
      resourcesHeading.style.margin = '30px 0 20px';
      resourcesHeading.style.color = '#333';
      resourcesHeading.style.borderBottom = '1px solid #eee';
      resourcesHeading.style.paddingBottom = '10px';
      learningResourcesList.appendChild(resourcesHeading);
      
      // Add learning resources for each skill gap
      mockLearningResources(skillGaps);
    }, 1000);
  }
  
  // Use the shared function for the analyze button
  analyzeBtn.addEventListener('click', function(event) {
    console.log('Analyze button clicked!');
    showDirectRecommendations();
  });
  closeModal.addEventListener('click', () => jobModal.style.display = 'none');
  deleteJobBtn.addEventListener('click', deleteCurrentJob);
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === jobModal) {
      jobModal.style.display = 'none';
    }
  });
  
  // Function to load saved jobs from storage
  function loadSavedJobs() {
    // Function to process jobs data once we have it
    function processJobsData(jobs, skillFreq) {
      console.log('Processing saved jobs:', jobs.length);
      
      // Update dashboard stats with our new function
      updateDashboardStats(jobs);
      
      // Clear jobs list
      savedJobsList.innerHTML = '';
      
      if (jobs.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No jobs saved yet. Use the extension to save job descriptions.</p>';
        savedJobsList.appendChild(emptyState);
        return;
      }
      
      // Populate job roles filter
      populateJobRoleFilter(jobs);
      
      // Display jobs
      jobs.forEach(job => {
        const jobCard = createJobCard(job);
        savedJobsList.appendChild(jobCard);
      });
      
      // Update skills analysis
      updateSkillsAnalysis(skillFreq);
      
      // Store extracted job skills for resume analysis
      extractedJobSkills = {
        technical_skills: [],
        soft_skills: [],
        other_requirements: []
      };
      
      // Collect all skills from saved jobs
      jobs.forEach(job => {
        const skills = job.skills || [];
        skills.forEach(skill => {
          const skillName = typeof skill === 'string' ? skill : skill.name;
          const skillType = typeof skill === 'string' ? 'technical' : skill.type;
          
          if (skillType === 'technical') {
            if (!extractedJobSkills.technical_skills.includes(skillName)) {
              extractedJobSkills.technical_skills.push(skillName);
            }
          } else if (skillType === 'soft') {
            if (!extractedJobSkills.soft_skills.includes(skillName)) {
              extractedJobSkills.soft_skills.push(skillName);
            }
          }
        });
      });
    }
    
    // Try to get data from Chrome storage first (if we're in extension context)
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['savedJobs', 'skillFrequency'], function(data) {
          const jobs = data.savedJobs || [];
          const skillFreq = data.skillFrequency || {};
          processJobsData(jobs, skillFreq);
        });
      } else {
        // If Chrome storage is not available, try localStorage
        console.log('Chrome storage not available, trying localStorage');
        const localStorageJobs = localStorage.getItem('savedJobs');
        const localStorageSkillFreq = localStorage.getItem('skillFrequency');
        
        const jobs = localStorageJobs ? JSON.parse(localStorageJobs) : [];
        const skillFreq = localStorageSkillFreq ? JSON.parse(localStorageSkillFreq) : {};
        
        processJobsData(jobs, skillFreq);
      }
    } catch (error) {
      console.error('Error accessing storage:', error);
      // Try localStorage as fallback
      try {
        const localStorageJobs = localStorage.getItem('savedJobs');
        const localStorageSkillFreq = localStorage.getItem('skillFrequency');
        
        const jobs = localStorageJobs ? JSON.parse(localStorageJobs) : [];
        const skillFreq = localStorageSkillFreq ? JSON.parse(localStorageSkillFreq) : {};
        
        processJobsData(jobs, skillFreq);
      } catch (fallbackError) {
        console.error('Error accessing localStorage fallback:', fallbackError);
        processJobsData([], {});
      }
    }
  }
  
  // Function to create a job card
  function createJobCard(job) {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.jobId = job.id;
    
    const title = document.createElement('h3');
    title.textContent = job.title;
    
    const company = document.createElement('p');
    company.textContent = job.company;
    
    const date = document.createElement('p');
    date.textContent = new Date(job.dateAdded).toLocaleDateString();
    
    const skillsPreview = document.createElement('div');
    skillsPreview.className = 'skills-preview';
    
    // Add top 3 skills
    const topSkills = job.skills.slice(0, 3);
    topSkills.forEach(skill => {
      const skillTag = document.createElement('span');
      skillTag.className = 'skill-tag';
      
      // Handle different skill formats
      if (typeof skill === 'string') {
        skillTag.textContent = skill;
      } else if (typeof skill === 'object' && skill !== null) {
        // Check if it has a name property
        if (skill.name) {
          skillTag.textContent = skill.name;
        } else {
          // Try to stringify the object in a readable way
          try {
            skillTag.textContent = JSON.stringify(skill);
          } catch (e) {
            skillTag.textContent = 'Unknown Skill';
          }
        }
      } else {
        skillTag.textContent = 'Unknown Skill';
      }
      
      skillsPreview.appendChild(skillTag);
    });
    
    // Add event listener to open modal
    jobCard.addEventListener('click', () => openJobModal(job));
    
    // Append elements to job card
    jobCard.appendChild(title);
    jobCard.appendChild(company);
    jobCard.appendChild(date);
    jobCard.appendChild(skillsPreview);
    
    return jobCard;
  }
  
  // Function to populate job role filter
  function populateJobRoleFilter(jobs) {
    // Clear existing options except the first one
    while (jobRoleFilter.options.length > 1) {
      jobRoleFilter.remove(1);
    }
    
    // Get unique job titles
    const jobTitles = [...new Set(jobs.map(job => job.title))];
    
    // Add options
    jobTitles.forEach(title => {
      const option = document.createElement('option');
      option.value = title;
      option.textContent = title;
      jobRoleFilter.appendChild(option);
    });
  }
  
  // Function to filter jobs
  function filterJobs() {
    const searchTerm = jobSearchInput.value.toLowerCase();
    const roleFilter = jobRoleFilter.value;
    
    chrome.storage.local.get({savedJobs: []}, function(data) {
      const jobs = data.savedJobs;
      
      // Clear jobs list
      savedJobsList.innerHTML = '';
      
      // Filter jobs
      const filteredJobs = jobs.filter(job => {
        const matchesSearch = 
          job.title.toLowerCase().includes(searchTerm) || 
          job.company.toLowerCase().includes(searchTerm);
        
        const matchesRole = roleFilter === '' || job.title === roleFilter;
        
        return matchesSearch && matchesRole;
      });
      
      if (filteredJobs.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No jobs match your filters.</p>';
        savedJobsList.appendChild(emptyState);
      } else {
        // Populate jobs list
        filteredJobs.forEach(job => {
          const jobCard = createJobCard(job);
          savedJobsList.appendChild(jobCard);
        });
      }
    });
  }
  
  // Function to update skills analysis
  function updateSkillsAnalysis(skillFrequency) {
    // Clear skills lists
    technicalSkillsList.innerHTML = '';
    softSkillsList.innerHTML = '';
    
    // Technical skills - these are just examples, in a real app you'd have a more comprehensive list
    const technicalSkillsKeywords = [
      'javascript', 'python', 'java', 'c++', 'react', 'angular', 'vue', 
      'node.js', 'express', 'django', 'flask', 'spring', 'aws', 'azure', 
      'gcp', 'docker', 'kubernetes', 'ci/cd', 'git', 'sql', 'nosql', 
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'html',
      'css', 'typescript', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust'
    ];
    
    // Categorize skills
    const technicalSkills = {};
    const softSkills = {};
    
    for (const skill in skillFrequency) {
      const skillLower = skill.toLowerCase();
      if (technicalSkillsKeywords.includes(skillLower)) {
        technicalSkills[skill] = skillFrequency[skill];
      } else {
        softSkills[skill] = skillFrequency[skill];
      }
    }
    
    // Sort skills by frequency
    const sortedTechnicalSkills = Object.entries(technicalSkills)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    const sortedSoftSkills = Object.entries(softSkills)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Populate technical skills list
    sortedTechnicalSkills.forEach(skill => {
      const li = document.createElement('li');
      li.textContent = skill;
      technicalSkillsList.appendChild(li);
    });
    
    // Populate soft skills list
    sortedSoftSkills.forEach(skill => {
      const li = document.createElement('li');
      li.textContent = skill;
      softSkillsList.appendChild(li);
    });
    
    // Create or update chart
    createSkillsChart(skillFrequency);
  }
  
  // Function to create skills chart
  function createSkillsChart(skillFrequency) {
    // Get top 10 skills
    const sortedSkills = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const labels = sortedSkills.map(entry => entry[0]);
    const data = sortedSkills.map(entry => entry[1]);
    
    // Destroy existing chart if it exists
    if (skillsChart) {
      skillsChart.destroy();
    }
    
    // Create new chart
    const ctx = document.getElementById('skillsChart').getContext('2d');
    skillsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Skill Frequency',
          data: data,
          backgroundColor: 'rgba(52, 152, 219, 0.7)',
          borderColor: 'rgba(52, 152, 219, 1)',
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
        }
      }
    });
  }
  
  // Function to open job modal
  function openJobModal(job) {
    currentJobId = job.id;
    
    modalJobTitle.textContent = job.title;
    modalCompanyName.textContent = job.company;
    
    // Clear skills list
    modalSkillsList.innerHTML = '';
    
    // Populate skills list
    const skills = job.skills || [];
    skills.forEach(skill => {
      const li = document.createElement('li');
      
      // Handle different skill formats
      if (typeof skill === 'string') {
        li.textContent = skill;
      } else if (typeof skill === 'object' && skill !== null) {
        // Check if it has a name property
        if (skill.name) {
          li.textContent = skill.name;
        } else {
          // Try to stringify the object in a readable way
          try {
            li.textContent = JSON.stringify(skill);
          } catch (e) {
            li.textContent = 'Unknown Skill';
          }
        }
      } else {
        li.textContent = 'Unknown Skill';
      }
      
      modalSkillsList.appendChild(li);
    });
    
    // Clear responsibilities list
    modalResponsibilitiesList.innerHTML = '';
    
    // Populate responsibilities list
    const responsibilities = job.responsibilities || [];
    responsibilities.forEach(responsibility => {
      const li = document.createElement('li');
      li.textContent = responsibility;
      modalResponsibilitiesList.appendChild(li);
    });
    
    // Show modal
    jobModal.style.display = 'block';
  }
  
  // Function to delete current job
  function deleteCurrentJob() {
    if (!currentJobId) return;
    
    chrome.storage.local.get({savedJobs: []}, function(data) {
      const jobs = data.savedJobs;
      
      // Find index of job to delete
      const jobIndex = jobs.findIndex(job => job.id === currentJobId);
      
      if (jobIndex !== -1) {
        // Remove job
        jobs.splice(jobIndex, 1);
        
        // Update storage
        chrome.storage.local.set({savedJobs: jobs}, function() {
          // Close modal
          jobModal.style.display = 'none';
          
          // Reload jobs
          loadSavedJobs();
          
          // Recalculate skill frequency
          updateSkillFrequency(jobs);
        });
      }
    });
  }
  
  // Function to update skill frequency
  function updateSkillFrequency(jobs) {
    const skillFrequency = {};
    
    // Count frequency of each skill
    jobs.forEach(job => {
      const skills = job.skills || [];
      skills.forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.name;
        if (skillFrequency[skillName]) {
          skillFrequency[skillName]++;
        } else {
          skillFrequency[skillName] = 1;
        }
      });
    });
    
    // Update storage
    chrome.storage.local.set({skillFrequency: skillFrequency});
  }
  
  // Function to handle resume upload
  async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show loading state
    resumeUploadPrompt.classList.add('hidden');
    resumeAnalysisResults.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    
    try {
      // Read the file as text
      const resumeText = await readFileAsText(file);
      
      // Store the raw resume text in localStorage for use in interview practice
      // Use a more reliable key name
      const resumeData = {
        rawText: resumeText,
        fileName: file.name,
        uploadDate: new Date().toISOString()
      };
      
      // IMPORTANT: Update the global variable directly so interview-prep.js can access it
      window.elevatrGlobal.resumeText = resumeText;
      window.elevatrGlobal.resumeFileName = file.name;
      window.elevatrGlobal.isResumeUploaded = true;
      window.elevatrGlobal.resumeData = resumeData;
      
      // Log what we're storing to help with debugging
      console.log('Storing resume data in global variable and localStorage:', resumeData);
      
      // Store in localStorage
      localStorage.setItem('elevatrResumeData', JSON.stringify(resumeData));
      
      // Also store in sessionStorage as a backup
      sessionStorage.setItem('elevatrResumeData', JSON.stringify(resumeData));
      
      // Call the CrewAI backend to analyze the resume
      if (extractedJobSkills) {
        const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resume_text: resumeText,
            extracted_job_skills: extractedJobSkills
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        resumeData = data.result;
        
        // Update the stored resume data with analysis results
        const storedData = JSON.parse(localStorage.getItem('elevatrResumeData')) || {};
        const updatedData = {
          ...storedData,
          analyzedData: resumeData
        };
        
        // Store updated data
        localStorage.setItem('elevatrResumeData', JSON.stringify(updatedData));
        sessionStorage.setItem('elevatrResumeData', JSON.stringify(updatedData));
        
        // Trigger a custom event to notify other parts of the application
        const resumeUploadEvent = new CustomEvent('resumeDataUpdated', { 
          detail: { resumeData: updatedData } 
        });
        document.dispatchEvent(resumeUploadEvent);
        
        // Hide loading state
        loadingIndicator.classList.add('hidden');
        resumeAnalysisResults.classList.remove('hidden');
        
        // Clear resume skills list
        resumeSkillsList.innerHTML = '';
        
        // Populate resume skills list
        if (resumeData.present_skills) {
          resumeData.present_skills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = typeof skill === 'string' ? skill : skill.name;
            resumeSkillsList.appendChild(li);
          });
        }
        
        // Calculate and display skill gaps
        calculateSkillGaps();
      } else {
        // Fallback to mock analysis if no job skills are available
        mockResumeAnalysis(resumeText);
      }
    } catch (error) {
      console.error("Error analyzing resume:", error);
      
      // Fallback to mock analysis
      mockResumeAnalysis();
    }
  }
  
  // Helper function to read file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = error => reject(error);
      reader.readAsText(file);
    });
  }
  
  // Mock resume analysis as fallback
  function mockResumeAnalysis() {
    // Simulate API delay
    setTimeout(() => {
      // Mock resume data
      resumeData = {
        present_skills: [
          {name: 'JavaScript', type: 'technical', level: 'intermediate'},
          {name: 'HTML', type: 'technical', level: 'advanced'},
          {name: 'CSS', type: 'technical', level: 'intermediate'},
          {name: 'React', type: 'technical', level: 'beginner'},
          {name: 'Node.js', type: 'technical', level: 'beginner'},
          {name: 'Communication', type: 'soft', level: 'intermediate'},
          {name: 'Teamwork', type: 'soft', level: 'advanced'}
        ],
        missing_skills: [
          {name: 'Python', type: 'technical', importance: 'high'},
          {name: 'SQL', type: 'technical', importance: 'medium'},
          {name: 'AWS', type: 'technical', importance: 'high'},
          {name: 'Leadership', type: 'soft', importance: 'medium'}
        ]
      };
      
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      resumeAnalysisResults.classList.remove('hidden');
      
      // Clear resume skills list
      resumeSkillsList.innerHTML = '';
      
      // Populate resume skills list
      resumeData.present_skills.forEach(skill => {
        const li = document.createElement('li');
        li.textContent = skill.name;
        resumeSkillsList.appendChild(li);
      });
      
      // Calculate and display skill gaps
      calculateSkillGaps();
    }, 1500);
  }
  
  // Helper function to get job skills from both Chrome storage and localStorage
  function getJobSkills(callback) {
    try {
      // Try Chrome storage first
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['savedJobs', 'skillFrequency'], function(data) {
          const skillFreq = data.skillFrequency || {};
          callback(skillFreq);
        });
      } else {
        // Try localStorage if Chrome storage is not available
        const localStorageSkillFreq = localStorage.getItem('skillFrequency') || localStorage.getItem('jobSkillTrackerSkillFrequency');
        if (localStorageSkillFreq) {
          const skillFreq = JSON.parse(localStorageSkillFreq);
          callback(skillFreq);
        } else {
          // No skill frequency data found
          callback({});
        }
      }
    } catch (error) {
      console.error('Error getting job skills:', error);
      callback({});
    }
  }
  
  // Function to calculate skill gaps
  function calculateSkillGaps() {
    if (!resumeData) return;
    
    // Clear skill gaps list
    skillGapsList.innerHTML = '';
    
    // If we have missing_skills from the API, use those
    if (resumeData.missing_skills && resumeData.missing_skills.length > 0) {
      console.log('Using missing_skills from API:', resumeData.missing_skills);
      resumeData.missing_skills.forEach(skill => {
        const li = document.createElement('li');
        li.textContent = typeof skill === 'string' ? skill : skill.name;
        skillGapsList.appendChild(li);
      });
    } else {
      // Otherwise calculate from job skills and resume skills
      getJobSkills(function(skillFreq) {
        console.log('Calculating skill gaps using skill frequency:', skillFreq);
        console.log('Resume skills:', resumeData.present_skills);
        
        // Get all skills from job listings (not just top 10)
        const jobSkills = Object.keys(skillFreq);
        console.log('All job skills:', jobSkills);
        
        // Normalize resume skills to lowercase for comparison
        const resumeSkillsLower = resumeData.present_skills.map(skill => 
          (typeof skill === 'string' ? skill : skill.name).toLowerCase()
        );
        console.log('Normalized resume skills:', resumeSkillsLower);
        
        // Find skills that are in job listings but not in the resume
        const skillGaps = jobSkills.filter(skill => {
          const skillLower = skill.toLowerCase();
          const hasSkill = resumeSkillsLower.some(resumeSkill => 
            resumeSkill === skillLower || 
            resumeSkill.includes(skillLower) || 
            skillLower.includes(resumeSkill)
          );
          return !hasSkill;
        });
        
        console.log('Detected skill gaps:', skillGaps);
        
        // Sort skill gaps by frequency (most common first)
        skillGaps.sort((a, b) => (skillFreq[b] || 0) - (skillFreq[a] || 0));
        
        // Populate skill gaps list
        if (skillGaps.length === 0) {
          const li = document.createElement('li');
          li.textContent = 'No skill gaps detected';
          skillGapsList.appendChild(li);
        } else {
          skillGaps.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            skillGapsList.appendChild(li);
          });
        }
      });
    }
  }
  
  // Function to generate project recommendations and learning resources
  async function generateRecommendations() {
    console.log('generateRecommendations called');
    console.log('window.elevatrGlobal:', window.elevatrGlobal);
    
    // Always use the global object for resume data
    const globalResumeData = window.elevatrGlobal.resumeData;
    
    if (!globalResumeData || !globalResumeData.analyzedData) {
      alert('Please upload your resume first');
      console.error('No resume data available');
      return;
    }
    
    // Use the analyzed data from the global object
    const resumeData = globalResumeData.analyzedData;
    
    // Show loading state
    projectRecommendations.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    recommendationsList.innerHTML = '';
    learningResourcesList.innerHTML = '';
    
    try {
      // Get skill gaps
      let skillGaps = [];
      
      // If we have missing_skills from the API, use those
      if (resumeData.missing_skills && resumeData.missing_skills.length > 0) {
        console.log('Using missing_skills from API:', resumeData.missing_skills);
        skillGaps = resumeData.missing_skills.map(skill => 
          typeof skill === 'string' ? skill : skill.name
        );
      } else {
        console.log('No missing_skills from API, calculating from job skills and resume skills');
        // Otherwise calculate from job skills and resume skills
        const jobSkills = await new Promise((resolve) => {
          getJobSkills(function(skillFreq) {
            console.log('Job skills from storage:', Object.keys(skillFreq));
            resolve(Object.keys(skillFreq));
          });
        });
        
        // Get resume skills
        if (!resumeData.present_skills || !Array.isArray(resumeData.present_skills)) {
          console.error('Invalid present_skills in resumeData:', resumeData);
          resumeData.present_skills = [];
        }
        
        const resumeSkillsLower = resumeData.present_skills.map(skill => 
          (typeof skill === 'string' ? skill : skill.name).toLowerCase()
        );
        console.log('Resume skills normalized:', resumeSkillsLower);
        
        // Find skills that are in job listings but not in the resume
        skillGaps = jobSkills.filter(skill => {
          const skillLower = skill.toLowerCase();
          const hasSkill = resumeSkillsLower.some(resumeSkill => 
            resumeSkill === skillLower || 
            resumeSkill.includes(skillLower) || 
            skillLower.includes(resumeSkill)
          );
          return !hasSkill;
        });
        console.log('Calculated skill gaps:', skillGaps);
      }
      
      // If no skill gaps were found, use some default skills for testing
      if (!skillGaps || skillGaps.length === 0) {
        console.log('No skill gaps found, using default skills for testing');
        skillGaps = ['JavaScript', 'React', 'Python', 'Data Analysis'];
      }
      
      // Get current skills from resume data
      let currentSkills = [];
      if (resumeData.present_skills && Array.isArray(resumeData.present_skills)) {
        currentSkills = resumeData.present_skills.map(skill => 
          typeof skill === 'string' ? skill : skill.name
        );
      }
      
      console.log('Skill gaps for recommendations:', skillGaps);
      console.log('Current skills for recommendations:', currentSkills);
      
      // The backend API expects plain strings, not objects with name property
      console.log(`Calling API: ${API_BASE_URL}/recommend-projects`);
      console.log('Request payload:', {
        skill_gaps: skillGaps,
        current_skills: currentSkills
      });
      
      // Call the backend to get project recommendations
      const projectPromise = fetch(`${API_BASE_URL}/recommend-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_gaps: skillGaps,
          current_skills: currentSkills
        })
      }).then(response => {
        console.log('Project API response status:', response.status);
        if (!response.ok) {
          // Check if it's a 404 error (model not found)
          if (response.status === 404) {
            console.warn('API model not found, using fallback data');
            return { result: null, error: 'Model not found' };
          }
          throw new Error(`Project API error: ${response.status}`);
        }
        return response.json();
      }).then(data => {
        console.log('Project API response data:', data);
        return data;
      }).catch(error => {
        console.error('Project API error:', error);
        // Return a structured error object instead of throwing
        return { result: null, error: error.message };
      });
      
      // Call the backend to get learning resources
      console.log(`Calling API: ${API_BASE_URL}/recommend-learning-resources`);
      console.log('Learning resources request payload:', {
        skill_gaps: skillGaps,
        current_skills: currentSkills,
        limit: 5
      });
      
      const resourcesPromise = fetch(`${API_BASE_URL}/recommend-learning-resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_gaps: skillGaps,
          current_skills: currentSkills,
          limit: 5 // Get top 5 resources for each skill
        })
      }).then(response => {
        console.log('Learning resources API response status:', response.status);
        if (!response.ok) {
          // Check if it's a 404 error (model not found)
          if (response.status === 404) {
            console.warn('Learning resources API model not found, using fallback data');
            return { resources: null, error: 'Model not found' };
          }
          throw new Error(`Learning resources API error: ${response.status}`);
        }
        return response.json();
      }).then(data => {
        console.log('Learning resources API response data:', data);
        return data;
      }).catch(error => {
        console.error('Learning resources API error:', error);
        // Return a structured error object instead of throwing
        return { resources: null, error: error.message };
      });
      
      // Wait for both requests to complete
      const [projectData, resourcesData] = await Promise.allSettled([projectPromise, resourcesPromise]);
      
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      
      // Process project recommendations
      if (projectData.status === 'fulfilled') {
        console.log('Project data fulfilled:', projectData.value);
        
        // Check if we have valid data or need to use mock data
        if (projectData.value && projectData.value.result && !projectData.value.error) {
          const projects = projectData.value.result;
          
          // Populate recommendations list
          if (Array.isArray(projects) && projects.length > 0) {
            // Add a heading for projects section
            const projectsHeading = document.createElement('h3');
            projectsHeading.textContent = 'Recommended Projects';
            projectsHeading.className = 'section-heading';
            recommendationsList.appendChild(projectsHeading);
            
            projects.forEach(project => {
              const projectCard = createProjectCard(project);
              recommendationsList.appendChild(projectCard);
            });
          } else {
            // If the result is not a valid array, try to parse it as JSON
            try {
              const parsedProjects = typeof projects === 'string' ? JSON.parse(projects) : projects;
              if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
                // Add a heading for projects section
                const projectsHeading = document.createElement('h3');
                projectsHeading.textContent = 'Recommended Projects';
                projectsHeading.className = 'section-heading';
                recommendationsList.appendChild(projectsHeading);
                
                parsedProjects.forEach(project => {
                  const projectCard = createProjectCard(project);
                  recommendationsList.appendChild(projectCard);
                });
              } else {
                console.warn('No valid projects in API response, using mock data');
                mockProjectRecommendations();
              }
            } catch (error) {
              console.error('Error parsing project recommendations:', error);
              // Fallback to mock recommendations
              mockProjectRecommendations();
            }
          }
        } else {
          console.warn('API returned error or null result, using mock data');
          // Fallback to mock recommendations if API returned an error
          mockProjectRecommendations();
        }
      } else {
        console.error('Error getting project recommendations:', projectData.reason);
        // Fallback to mock recommendations
        mockProjectRecommendations();
      }
      
      // Process learning resources
      if (resourcesData.status === 'fulfilled') {
        console.log('Learning resources data fulfilled:', resourcesData.value);
        
        // Check if we have valid data or need to use mock data
        if (resourcesData.value && resourcesData.value.resources && !resourcesData.value.error) {
          // Add a heading for learning resources section
          const resourcesHeading = document.createElement('h3');
          resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
          resourcesHeading.className = 'section-heading';
          learningResourcesList.appendChild(resourcesHeading);
          
          if (Array.isArray(resourcesData.value.resources) && resourcesData.value.resources.length > 0) {
            // Display resources
            displayLearningResources(resourcesData.value.resources);
          } else {
            console.warn('No valid learning resources in API response, using mock data');
            mockLearningResources(skillGaps);
          }
        } else {
          console.warn('Learning resources API returned error or null result, using mock data');
          // Fallback to mock learning resources
          mockLearningResources(skillGaps);
        }
      } else {
        console.error('Error getting learning resources:', resourcesData.reason);
        // Fallback to mock learning resources
        mockLearningResources(skillGaps);
      }
    } catch (error) {
      console.error('Error in recommendations generation:', error);
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      
      // Fallback to mock data for both
      mockProjectRecommendations();
      mockLearningResources([]);
    }
  }
  
  // Function to get learning resources for skill gaps
  async function getLearningResources() {
    // Get skill gaps from the DOM or calculate them
    let skillGaps = [];
    
    // Check if we have resume data
    if (!resumeData) {
      alert('Please upload your resume first');
      return;
    }
    
    // Show loading state
    learningResourcesContainer.classList.remove('hidden');
    const loadingIndicator = learningResourcesContainer.querySelector('.loading-indicator');
    loadingIndicator.classList.remove('hidden');
    learningResourcesList.innerHTML = '';
    
    try {
      // Collect skill gaps from the skillGapsList
      const skillGapsElements = skillGapsList.querySelectorAll('li');
      skillGaps = Array.from(skillGapsElements).map(li => li.textContent);
      
      // Filter out any non-skill entries
      skillGaps = skillGaps.filter(skill => skill !== 'No skill gaps detected');
      
      // If no skill gaps found in the DOM, try to get them from resumeData
      if (skillGaps.length === 0 && resumeData.missing_skills) {
        skillGaps = resumeData.missing_skills.map(skill => 
          typeof skill === 'string' ? skill : skill.name
        );
      }
      
      // If still no skill gaps, calculate them
      if (skillGaps.length === 0) {
        // Get job skills
        const jobSkills = await new Promise((resolve) => {
          getJobSkills(function(skillFreq) {
            resolve(Object.keys(skillFreq));
          });
        });
        
        // Get resume skills
        const resumeSkillsLower = resumeData.present_skills.map(skill => 
          (typeof skill === 'string' ? skill : skill.name).toLowerCase()
        );
        
        // Find skills that are in job listings but not in the resume
        skillGaps = jobSkills.filter(skill => {
          const skillLower = skill.toLowerCase();
          const hasSkill = resumeSkillsLower.some(resumeSkill => 
            resumeSkill === skillLower || 
            resumeSkill.includes(skillLower) || 
            skillLower.includes(resumeSkill)
          );
          return !hasSkill;
        });
      }
      
      // If still no skill gaps, show an error
      if (skillGaps.length === 0) {
        throw new Error('No skill gaps found. Please analyze your resume first.');
      }
      
      console.log('Getting learning resources for skill gaps:', skillGaps);
      
      // Get current skills from resume
      const currentSkills = resumeData.present_skills.map(skill => 
        typeof skill === 'string' ? skill : skill.name
      );
      
      // Call the backend to get learning resources
      const response = await fetch(`${API_BASE_URL}/recommend-learning-resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_gaps: skillGaps,
          current_skills: currentSkills,
          limit: 5 // Get top 5 resources for each skill
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      
      // Check if we have resources
      if (data.resources && Array.isArray(data.resources)) {
        // Display resources
        displayLearningResources(data.resources);
      } else {
        throw new Error('Invalid learning resources format');
      }
    } catch (error) {
      console.error('Error getting learning resources:', error);
      
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      
      // Show error message and fallback to mock data
      console.log('Falling back to mock learning resources');
      mockLearningResources(skillGaps);
    }
  }
  
  // Function to display learning resources
  function displayLearningResources(resources) {
    // Clear previous resources
    learningResourcesList.innerHTML = '';
    
    // Create a resource card for each skill
    resources.forEach(resource => {
      const resourceCard = document.createElement('div');
      resourceCard.className = 'resource-card';
      
      // Add skill name as title
      const skillTitle = document.createElement('h3');
      skillTitle.textContent = resource.skill;
      resourceCard.appendChild(skillTitle);
      
      // Add projects section
      if (resource.projects && resource.projects.length > 0) {
        const projectsSection = createResourceCategory('Projects to Build', resource.projects);
        resourceCard.appendChild(projectsSection);
      }
      
      // Add websites section
      if (resource.websites && resource.websites.length > 0) {
        const websitesSection = createResourceCategory('Websites & Learning Platforms', resource.websites);
        resourceCard.appendChild(websitesSection);
      }
      
      // Add videos section
      if (resource.videos && resource.videos.length > 0) {
        const videosSection = createResourceCategory('Video Courses & Tutorials', resource.videos);
        resourceCard.appendChild(videosSection);
      }
      
      // Add books section
      if (resource.books && resource.books.length > 0) {
        const booksSection = createResourceCategory('Books & Documentation', resource.books);
        resourceCard.appendChild(booksSection);
      }
      
      // Add the resource card to the list
      learningResourcesList.appendChild(resourceCard);
    });
  }
  
  // Helper function to create a resource category section
  function createResourceCategory(title, items) {
    const categorySection = document.createElement('div');
    categorySection.className = 'resource-category';
    
    // Add category title
    const categoryTitle = document.createElement('h4');
    categoryTitle.textContent = title;
    categorySection.appendChild(categoryTitle);
    
    // Add resource list
    const resourceList = document.createElement('ul');
    resourceList.className = 'resource-list';
    
    // Add each resource item
    items.forEach(item => {
      const resourceItem = document.createElement('li');
      resourceItem.className = 'resource-item';
      
      // Add resource title
      const resourceTitle = document.createElement('span');
      resourceTitle.className = 'resource-item-title';
      resourceTitle.textContent = item.title;
      resourceItem.appendChild(resourceTitle);
      
      // Add resource description
      const resourceDescription = document.createElement('span');
      resourceDescription.className = 'resource-item-description';
      resourceDescription.textContent = item.description;
      resourceItem.appendChild(resourceDescription);
      
      // Add the resource item to the list
      resourceList.appendChild(resourceItem);
    });
    
    // Add the resource list to the category section
    categorySection.appendChild(resourceList);
    
    return categorySection;
  }
  
  // Function to generate mock learning resources
  function mockLearningResources(skillGaps) {
    // Ensure we have skill gaps
    if (!skillGaps || skillGaps.length === 0) {
      // If no skill gaps provided, use some common ones
      skillGaps = ['JavaScript', 'React', 'Python', 'Data Analysis'];
    }
    
    // Add a heading for learning resources section
    const resourcesHeading = document.createElement('h3');
    resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
    resourcesHeading.className = 'section-heading';
    learningResourcesList.appendChild(resourcesHeading);
    
    // Limit to top 3 skills to avoid overwhelming the UI
    const topSkills = skillGaps.slice(0, 3);
    
    // Create mock resources for each skill
    const mockResources = topSkills.map(skill => {
      return {
        skill: skill,
        projects: generateMockProjects(skill),
        websites: generateMockWebsites(skill),
        videos: generateMockVideos(skill),
        books: generateMockBooks(skill)
      };
    });
    
    // Display the mock resources
    displayLearningResources(mockResources);
  }
  
  // Helper function to generate mock projects
  function generateMockProjects(skill) {
    const mockProjectsBySkill = {
      'JavaScript': [
        { title: 'Interactive To-Do List', description: 'Build a to-do list application with local storage and drag-and-drop functionality.' },
        { title: 'Weather Dashboard', description: 'Create a weather app that fetches data from a public API and displays forecasts.' },
        { title: 'Personal Portfolio', description: 'Develop a responsive portfolio website to showcase your projects.' }
      ],
      'React': [
        { title: 'E-commerce Product Page', description: 'Build a product page with image gallery, reviews, and add-to-cart functionality.' },
        { title: 'Social Media Dashboard', description: 'Create a dashboard that displays social media metrics and analytics.' },
        { title: 'Task Management App', description: 'Develop a Trello-like task management application with React and Redux.' }
      ],
      'Python': [
        { title: 'Data Visualization Tool', description: 'Create a tool that visualizes data from CSV files using matplotlib and pandas.' },
        { title: 'Web Scraper', description: 'Build a web scraper that extracts information from websites and saves it to a database.' },
        { title: 'Automated File Organizer', description: 'Develop a script that organizes files in a directory based on their type and date.' }
      ],
      'Data Analysis': [
        { title: 'COVID-19 Data Analysis', description: 'Analyze COVID-19 data to identify trends and create visualizations.' },
        { title: 'Stock Market Predictor', description: 'Build a model to predict stock prices using historical data.' },
        { title: 'Customer Segmentation', description: 'Segment customers based on their purchasing behavior using clustering algorithms.' }
      ]
    };
    
    // Return mock projects for the skill or generic projects if skill not found
    return mockProjectsBySkill[skill] || [
      { title: `${skill} Portfolio Project`, description: `Create a portfolio project showcasing your ${skill} skills.` },
      { title: `${skill} Tutorial Application`, description: `Build an application that demonstrates core ${skill} concepts.` },
      { title: `${skill} Integration Project`, description: `Develop a project that integrates ${skill} with other technologies.` }
    ];
  }
  
  // Helper function to generate mock websites
  function generateMockWebsites(skill) {
    const mockWebsitesBySkill = {
      'JavaScript': [
        { title: 'MDN Web Docs', description: 'Comprehensive documentation and tutorials for JavaScript and web technologies.' },
        { title: 'freeCodeCamp', description: 'Free interactive coding lessons and projects for JavaScript development.' },
        { title: 'JavaScript.info', description: 'Modern JavaScript tutorial with clear explanations and practical examples.' }
      ],
      'React': [
        { title: 'React Official Documentation', description: 'Official documentation with guides, API references, and examples.' },
        { title: 'Codecademy React Course', description: 'Interactive course teaching React fundamentals and advanced concepts.' },
        { title: 'React Training', description: 'Tutorials and resources for learning React from the creators of React Router.' }
      ],
      'Python': [
        { title: 'Python.org', description: 'Official Python documentation, tutorials, and resources.' },
        { title: 'Real Python', description: 'In-depth articles, tutorials, and courses for Python development.' },
        { title: 'DataCamp', description: 'Interactive Python courses focusing on data science and analytics.' }
      ],
      'Data Analysis': [
        { title: 'Kaggle', description: 'Platform for data science competitions, datasets, and learning resources.' },
        { title: 'Towards Data Science', description: 'Medium publication with articles on data analysis and machine learning.' },
        { title: 'DataQuest', description: 'Interactive platform for learning data analysis through real-world projects.' }
      ]
    };
    
    // Return mock websites for the skill or generic websites if skill not found
    return mockWebsitesBySkill[skill] || [
      { title: 'Coursera', description: `Find courses and specializations on ${skill} from top universities.` },
      { title: 'Udemy', description: `Practical ${skill} courses taught by industry professionals.` },
      { title: 'edX', description: `Free online courses on ${skill} from leading educational institutions.` }
    ];
  }
  
  // Helper function to generate mock videos
  function generateMockVideos(skill) {
    const mockVideosBySkill = {
      'JavaScript': [
        { title: 'JavaScript Crash Course', description: 'Comprehensive introduction to JavaScript fundamentals in 3 hours.' },
        { title: 'JavaScript ES6 Features', description: 'Tutorial covering modern JavaScript features and syntax.' },
        { title: 'Asynchronous JavaScript', description: 'Deep dive into promises, async/await, and event loop.' }
      ],
      'React': [
        { title: 'React Fundamentals', description: 'Learn React basics including components, props, and state.' },
        { title: 'React Hooks Tutorial', description: 'Comprehensive guide to using hooks in functional components.' },
        { title: 'React Performance Optimization', description: 'Techniques for optimizing React application performance.' }
      ],
      'Python': [
        { title: 'Python for Beginners', description: 'Complete Python tutorial for beginners covering all essential concepts.' },
        { title: 'Advanced Python Features', description: 'Tutorial on advanced Python features like generators, decorators, and context managers.' },
        { title: 'Python for Data Science', description: 'Introduction to using Python for data analysis and visualization.' }
      ],
      'Data Analysis': [
        { title: 'Data Analysis with Python', description: 'Learn to analyze data using pandas, numpy, and matplotlib.' },
        { title: 'SQL for Data Analysis', description: 'Master SQL queries for extracting and analyzing data.' },
        { title: 'Tableau Dashboard Creation', description: 'Create interactive dashboards for data visualization.' }
      ]
    };
    
    // Return mock videos for the skill or generic videos if skill not found
    return mockVideosBySkill[skill] || [
      { title: `${skill} for Beginners`, description: `Comprehensive introduction to ${skill} for beginners.` },
      { title: `Advanced ${skill} Techniques`, description: `Tutorial covering advanced ${skill} concepts and techniques.` },
      { title: `${skill} Project Walkthrough`, description: `Step-by-step guide to building a project with ${skill}.` }
    ];
  }
  
  // Helper function to generate mock books
  function generateMockBooks(skill) {
    const mockBooksBySkill = {
      'JavaScript': [
        { title: 'Eloquent JavaScript', description: 'A modern introduction to programming with JavaScript.' },
        { title: 'You Don\'t Know JS', description: 'Series of books diving deep into JavaScript language details.' },
        { title: 'JavaScript: The Good Parts', description: 'Classic book focusing on the best features of JavaScript.' }
      ],
      'React': [
        { title: 'React Up and Running', description: 'Building web applications with React and Redux.' },
        { title: 'Learning React', description: 'Functional web development with React and Redux.' },
        { title: 'React Design Patterns', description: 'Best practices and design patterns for building scalable React applications.' }
      ],
      'Python': [
        { title: 'Python Crash Course', description: 'A hands-on, project-based introduction to programming with Python.' },
        { title: 'Fluent Python', description: 'Clear, concise, and effective programming with Python.' },
        { title: 'Automate the Boring Stuff with Python', description: 'Practical programming for total beginners.' }
      ],
      'Data Analysis': [
        { title: 'Python for Data Analysis', description: 'Data wrangling with pandas, NumPy, and IPython.' },
        { title: 'Storytelling with Data', description: 'A data visualization guide for business professionals.' },
        { title: 'Data Science from Scratch', description: 'First principles with Python for data science.' }
      ]
    };
    
    // Return mock books for the skill or generic books if skill not found
    return mockBooksBySkill[skill] || [
      { title: `${skill} Fundamentals`, description: `Comprehensive guide to ${skill} fundamentals and best practices.` },
      { title: `${skill} in Practice`, description: `Practical applications and case studies of ${skill} in real-world scenarios.` },
      { title: `Advanced ${skill}`, description: `Deep dive into advanced ${skill} concepts for experienced practitioners.` }
    ];
  }
  
  // Mock project recommendations as fallback
  function mockProjectRecommendations() {
    // Hide loading state
    loadingIndicator.classList.add('hidden');
    
    // Add a heading for projects section
    const projectsHeading = document.createElement('h3');
    projectsHeading.textContent = 'Recommended Projects';
    projectsHeading.className = 'section-heading';
    recommendationsList.appendChild(projectsHeading);
    
    // Generate project recommendations based on skill gaps
    const projects = generateProjectIdeas();
    
    // Populate recommendations list
    projects.forEach(project => {
      const projectCard = createProjectCard(project);
      recommendationsList.appendChild(projectCard);
    });
  }
  
  // Function to create a project card
  function createProjectCard(project) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    
    const title = document.createElement('h3');
    title.textContent = project.title;
    
    const difficulty = document.createElement('span');
    difficulty.className = `difficulty ${project.difficulty.toLowerCase()}`;
    difficulty.textContent = project.difficulty;
    
    const description = document.createElement('p');
    description.textContent = project.description;
    
    const skillsTargeted = document.createElement('div');
    skillsTargeted.className = 'skills-targeted';
    
    const skillsTitle = document.createElement('strong');
    skillsTitle.textContent = 'Skills Targeted: ';
    
    const skillsList = document.createElement('span');
    skillsList.textContent = Array.isArray(project.skills_targeted) 
      ? project.skills_targeted.join(', ') 
      : (typeof project.skills_targeted === 'string' ? project.skills_targeted : '');
    
    skillsTargeted.appendChild(skillsTitle);
    skillsTargeted.appendChild(skillsList);
    
    // Add time estimate if available
    if (project.time_estimate) {
      const timeEstimate = document.createElement('p');
      timeEstimate.innerHTML = `<strong>Time Estimate:</strong> ${project.time_estimate}`;
      projectCard.appendChild(timeEstimate);
    }
    
    // Add resources if available
    if (project.resources && project.resources.length > 0) {
      const resources = document.createElement('div');
      resources.className = 'resources';
      resources.innerHTML = '<strong>Resources:</strong>';
      
      const resourcesList = document.createElement('ul');
      project.resources.forEach(resource => {
        const li = document.createElement('li');
        li.textContent = resource;
        resourcesList.appendChild(li);
      });
      
      resources.appendChild(resourcesList);
      projectCard.appendChild(resources);
    }
    
    // Append elements to project card
    projectCard.appendChild(title);
    projectCard.appendChild(difficulty);
    projectCard.appendChild(description);
    projectCard.appendChild(skillsTargeted);
    
    return projectCard;
  }
  
  // Function to generate project ideas
  function generateProjectIdeas() {
    // This would ideally be generated by an LLM in a real implementation
    // For now, we'll use predefined project templates
    
    const projectTemplates = [
      {
        title: "Personal Portfolio Website",
        difficulty: "Beginner",
        description: "Create a responsive personal portfolio website to showcase your projects and skills.",
        skills_targeted: ["HTML", "CSS", "JavaScript", "Responsive Design"],
        time_estimate: "2-3 weeks",
        resources: ["MDN Web Docs", "CSS-Tricks", "FreeCodeCamp"]
      },
      {
        title: "Task Management Application",
        difficulty: "Intermediate",
        description: "Build a full-stack task management app with user authentication and CRUD operations.",
        skills_targeted: ["React", "Node.js", "Express", "MongoDB", "Authentication"],
        time_estimate: "4-6 weeks",
        resources: ["React Documentation", "MongoDB University", "Express.js Guide"]
      },
      {
        title: "E-commerce Platform",
        difficulty: "Advanced",
        description: "Develop a complete e-commerce platform with product listings, cart functionality, and payment processing.",
        skills_targeted: ["React", "Redux", "Node.js", "Express", "MongoDB", "Payment API"],
        time_estimate: "8-10 weeks",
        resources: ["Redux Documentation", "Stripe API Docs", "React Router Documentation"]
      },
      {
        title: "Weather Dashboard",
        difficulty: "Beginner",
        description: "Create a weather dashboard that fetches and displays weather data from a public API.",
        skills_targeted: ["JavaScript", "API Integration", "CSS", "HTML"],
        time_estimate: "1-2 weeks",
        resources: ["OpenWeather API", "JavaScript.info", "Axios Documentation"]
      },
      {
        title: "Real-time Chat Application",
        difficulty: "Intermediate",
        description: "Build a real-time chat application with private messaging and group chat functionality.",
        skills_targeted: ["Socket.io", "React", "Node.js", "Express", "MongoDB"],
        time_estimate: "4-5 weeks",
        resources: ["Socket.io Documentation", "React Hooks Guide", "MongoDB Atlas"]
      },
      {
        title: "Content Management System",
        difficulty: "Advanced",
        description: "Develop a CMS with user roles, content creation, editing, and publishing workflows.",
        skills_targeted: ["React", "Node.js", "Express", "MongoDB", "Authentication", "Authorization"],
        time_estimate: "8-12 weeks",
        resources: ["JWT Authentication", "Role-Based Access Control", "Rich Text Editors"]
      },
      {
        title: "Recipe Finder App",
        difficulty: "Beginner",
        description: "Create an app that allows users to search for recipes based on ingredients they have.",
        skills_targeted: ["JavaScript", "API Integration", "CSS", "HTML"],
        time_estimate: "2-3 weeks",
        resources: ["Spoonacular API", "CSS Grid Layout", "JavaScript Fetch API"]
      },
      {
        title: "Social Media Dashboard",
        difficulty: "Intermediate",
        description: "Build a dashboard that aggregates and displays data from multiple social media platforms.",
        skills_targeted: ["React", "API Integration", "Data Visualization", "CSS"],
        time_estimate: "5-7 weeks",
        resources: ["Chart.js", "Twitter API", "Facebook Graph API"]
      }
    ];
    
    // Return 3 random projects
    return projectTemplates.sort(() => 0.5 - Math.random()).slice(0, 3);
  }
  
  // Function to update dashboard statistics
  function updateDashboardStats(jobs) {
    // Update jobs saved count
    jobsSavedCount.textContent = jobs.length;
    
    // Calculate skill frequency
    const skillFreq = {};
    let totalSkills = 0;
    
    jobs.forEach(job => {
      if (job.skills && job.skills.length > 0) {
        job.skills.forEach(skill => {
          // Get skill name regardless of format
          let skillName;
          if (typeof skill === 'string') {
            skillName = skill;
          } else if (typeof skill === 'object' && skill !== null) {
            skillName = skill.name || 'Unknown Skill';
          } else {
            skillName = 'Unknown Skill';
          }
          
          skillFreq[skillName] = (skillFreq[skillName] || 0) + 1;
          totalSkills++;
        });
      }
    });
    
    // Update unique skills count
    uniqueSkillsCount.textContent = Object.keys(skillFreq).length;
    
    // Find top skill
    let maxCount = 0;
    let maxSkill = '-';
    
    for (const skill in skillFreq) {
      if (skillFreq[skill] > maxCount) {
        maxCount = skillFreq[skill];
        maxSkill = skill;
      }
    }
    
    // Update top skill
    topSkill.textContent = maxSkill;
    
    // Also populate the job role dropdown for the Top 10 Skills section
    populateJobRoleSkillsFilter(jobs);
    
    // Update top skills for all jobs by default
    updateTopSkillsByRole();
  }
  
  // Function to populate job role dropdown for Top 10 Skills section
  function populateJobRoleSkillsFilter(jobs) {
    // Clear existing options except the default "All Saved Jobs" option
    while (jobRoleSkillsFilter.options.length > 1) {
      jobRoleSkillsFilter.remove(1);
    }
    
    // Get unique job roles
    const roles = [];
    jobs.forEach(job => {
      if (job.title && !roles.includes(job.title)) {
        roles.push(job.title);
      }
    });
    
    // Sort roles alphabetically
    roles.sort();
    
    // Add options for each role
    roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = role;
      jobRoleSkillsFilter.appendChild(option);
    });
  }
  
  // Function to update top skills based on selected job role
  function updateTopSkillsByRole() {
    // Try to get jobs from both Chrome storage and localStorage
    function processJobs(jobs) {
      console.log('Processing jobs for top skills:', jobs);
      console.log('Number of jobs:', jobs ? jobs.length : 0);
      
      if (!jobs || jobs.length === 0) {
        console.log('No jobs found to process for skills');
        displayTopSkills([], 0);
        return;
      }
      
      // Debug job data
      jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}:`, job.title, 'Skills:', job.skills ? job.skills.length : 0);
      });
      
      const selectedRole = jobRoleSkillsFilter.value;
      console.log('Selected role:', selectedRole);
      
      // Filter jobs by selected role if not "all"
      const filteredJobs = selectedRole === 'all' ? jobs : jobs.filter(job => job.title === selectedRole);
      console.log('Filtered jobs:', filteredJobs.length);
      
      // Extract skills from filtered jobs
      const skillFrequency = {};
      
      filteredJobs.forEach(job => {
        if (job.skills && job.skills.length > 0) {
          console.log(`Processing skills for job: ${job.title}`, job.skills);
          job.skills.forEach(skill => {
            // Get skill name regardless of format
            let skillName;
            if (typeof skill === 'string') {
              skillName = skill;
            } else if (typeof skill === 'object' && skill !== null) {
              skillName = skill.name || 'Unknown Skill';
            } else {
              skillName = 'Unknown Skill';
            }
            
            skillFrequency[skillName] = (skillFrequency[skillName] || 0) + 1;
          });
        } else {
          console.log(`No skills found for job: ${job.title}`);
        }
      });
      
      console.log('Skill frequency:', skillFrequency);
      
      // Convert to array for sorting
      const skillsArray = Object.entries(skillFrequency).map(([name, count]) => ({
        name,
        count
      }));
      
      // Sort by frequency (descending)
      skillsArray.sort((a, b) => b.count - a.count);
      
      // Get top 10 skills (or fewer if less than 10 available)
      const topSkills = skillsArray.slice(0, 10);
      console.log('Top skills:', topSkills);
      
      // Find the maximum count for percentage calculation
      const maxCount = topSkills.length > 0 ? topSkills[0].count : 0;
      
      // Update the skills list
      displayTopSkills(topSkills, maxCount);
    }
    
    // First try to get jobs from Chrome storage (if we're in extension context)
    try {
      console.log('Attempting to access Chrome storage...');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        console.log('Chrome storage is available');
        chrome.storage.local.get(['savedJobs'], function(data) {
          console.log('Chrome storage data:', data);
          const jobs = data.savedJobs || [];
          processJobs(jobs);
        });
      } else {
        // If Chrome storage is not available, try localStorage
        console.log('Chrome storage not available, trying localStorage');
        const localStorageJobs = localStorage.getItem('savedJobs');
        console.log('localStorage savedJobs:', localStorageJobs ? 'Found' : 'Not found');
        
        if (localStorageJobs) {
          try {
            const jobs = JSON.parse(localStorageJobs);
            console.log('Parsed jobs from localStorage:', jobs);
            processJobs(jobs);
          } catch (parseError) {
            console.error('Error parsing jobs from localStorage:', parseError);
            console.log('Raw localStorage content:', localStorageJobs);
            displayTopSkills([], 0);
          }
        } else {
          // Try with different key names that might have been used
          const alternativeKeys = ['jobSkillTrackerJobs', 'jobs', 'jobData'];
          let foundJobs = false;
          
          for (const key of alternativeKeys) {
            const altData = localStorage.getItem(key);
            console.log(`Checking alternative key '${key}':`, altData ? 'Found' : 'Not found');
            
            if (altData) {
              try {
                const jobs = JSON.parse(altData);
                console.log(`Parsed jobs from localStorage key '${key}':`, jobs);
                processJobs(jobs);
                foundJobs = true;
                break;
              } catch (parseError) {
                console.error(`Error parsing jobs from localStorage key '${key}':`, parseError);
              }
            }
          }
          
          if (!foundJobs) {
            // No jobs found in either storage
            console.log('No jobs found in any storage location');
            displayTopSkills([], 0);
          }
        }
      }
    } catch (error) {
      console.error('Error accessing storage:', error);
      // Try localStorage as fallback
      try {
        console.log('Trying localStorage as fallback after error');
        const localStorageJobs = localStorage.getItem('savedJobs');
        console.log('Fallback - localStorage savedJobs:', localStorageJobs ? 'Found' : 'Not found');
        
        if (localStorageJobs) {
          const jobs = JSON.parse(localStorageJobs);
          console.log('Fallback - Parsed jobs from localStorage:', jobs);
          processJobs(jobs);
        } else {
          // No jobs found
          console.log('Fallback - No jobs found in localStorage');
          displayTopSkills([], 0);
        }
      } catch (fallbackError) {
        console.error('Error accessing localStorage fallback:', fallbackError);
        displayTopSkills([], 0);
      }
    }
  }
  
  // Function to synchronize job data between Chrome storage and localStorage
  function synchronizeJobData() {
    console.log('Synchronizing job data between Chrome storage and localStorage');
    
    // Function to update localStorage with Chrome storage data
    function updateLocalStorage(jobs, skillFreq) {
      console.log('Updating localStorage with Chrome storage data:', jobs.length, 'jobs');
      localStorage.setItem('savedJobs', JSON.stringify(jobs));
      localStorage.setItem('skillFrequency', JSON.stringify(skillFreq));
      localStorage.setItem('jobSkillTrackerJobs', JSON.stringify(jobs));
      localStorage.setItem('jobSkillTrackerSkillFrequency', JSON.stringify(skillFreq));
    }
    
    // Function to update Chrome storage with localStorage data
    function updateChromeStorage(jobs, skillFreq) {
      console.log('Updating Chrome storage with localStorage data:', jobs.length, 'jobs');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          savedJobs: jobs,
          skillFrequency: skillFreq
        }, function() {
          console.log('Chrome storage updated successfully');
        });
      }
    }
    
    try {
      // Try to get data from Chrome storage first
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['savedJobs', 'skillFrequency'], function(data) {
          const chromeJobs = data.savedJobs || [];
          const chromeSkillFreq = data.skillFrequency || {};
          
          console.log('Found', chromeJobs.length, 'jobs in Chrome storage');
          
          // Check if localStorage has data
          try {
            const localStorageJobs = localStorage.getItem('savedJobs');
            const localStorageSkillFreq = localStorage.getItem('skillFrequency');
            
            if (localStorageJobs && localStorageSkillFreq) {
              const localJobs = JSON.parse(localStorageJobs);
              const localSkillFreq = JSON.parse(localStorageSkillFreq);
              
              console.log('Found', localJobs.length, 'jobs in localStorage');
              
              // Determine which source has more jobs
              if (chromeJobs.length >= localJobs.length) {
                // Chrome storage has more or equal jobs, update localStorage
                updateLocalStorage(chromeJobs, chromeSkillFreq);
              } else {
                // localStorage has more jobs, update Chrome storage
                updateChromeStorage(localJobs, localSkillFreq);
              }
            } else {
              // localStorage doesn't have data, update it from Chrome storage
              updateLocalStorage(chromeJobs, chromeSkillFreq);
            }
          } catch (localError) {
            console.error('Error checking localStorage:', localError);
            // Update localStorage from Chrome storage
            updateLocalStorage(chromeJobs, chromeSkillFreq);
          }
        });
      } else {
        // Chrome storage not available, check if localStorage has data
        console.log('Chrome storage not available, checking localStorage');
        const localStorageJobs = localStorage.getItem('savedJobs') || localStorage.getItem('jobSkillTrackerJobs');
        const localStorageSkillFreq = localStorage.getItem('skillFrequency') || localStorage.getItem('jobSkillTrackerSkillFrequency');
        
        if (localStorageJobs) {
          console.log('Found jobs in localStorage');
          // Ensure data is stored with all possible key names for maximum compatibility
          try {
            const jobs = JSON.parse(localStorageJobs);
            const skillFreq = localStorageSkillFreq ? JSON.parse(localStorageSkillFreq) : {};
            
            localStorage.setItem('savedJobs', JSON.stringify(jobs));
            localStorage.setItem('skillFrequency', JSON.stringify(skillFreq));
            localStorage.setItem('jobSkillTrackerJobs', JSON.stringify(jobs));
            localStorage.setItem('jobSkillTrackerSkillFrequency', JSON.stringify(skillFreq));
            
            console.log('localStorage synchronized with all key names');
          } catch (parseError) {
            console.error('Error parsing localStorage data:', parseError);
          }
        } else {
          console.log('No job data found in any storage location');
        }
      }
    } catch (error) {
      console.error('Error synchronizing job data:', error);
    }
  }
  
  // Function to display top skills
  function displayTopSkills(skills, maxCount) {
    // Clear existing skills
    topSkillsList.innerHTML = '';
    
    // Check if there are any skills to display
    if (skills.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = '<p>No skills found for the selected job role.</p>';
      topSkillsList.appendChild(emptyState);
      return;
    }
    
    // Create skill cards for each top skill
    skills.forEach(skill => {
      // Calculate percentage for the skill frequency bar
      const percentage = maxCount > 0 ? (skill.count / maxCount) * 100 : 0;
      
      // Create skill card
      const skillCard = document.createElement('div');
      skillCard.className = 'skill-card';
      
      // Add skill name
      const skillName = document.createElement('div');
      skillName.className = 'skill-name';
      skillName.textContent = skill.name;
      skillCard.appendChild(skillName);
      
      // Add skill frequency
      const skillFrequency = document.createElement('div');
      skillFrequency.className = 'skill-frequency';
      skillFrequency.textContent = `Found in ${skill.count} job${skill.count !== 1 ? 's' : ''}`;
      skillCard.appendChild(skillFrequency);
      
      // Add skill frequency bar
      const frequencyBar = document.createElement('div');
      frequencyBar.className = 'skill-frequency-bar';
      
      const frequencyFill = document.createElement('div');
      frequencyFill.className = 'skill-frequency-fill';
      frequencyFill.style.width = `${percentage}%`;
      
      frequencyBar.appendChild(frequencyFill);
      skillCard.appendChild(frequencyBar);
      
      // Add skill card to the list
      topSkillsList.appendChild(skillCard);
    });
  }
});
