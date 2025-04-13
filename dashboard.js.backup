document.addEventListener('DOMContentLoaded', function() {
  // API URL for backend
  const API_BASE_URL = "http://localhost:8000";
  
  // DOM Elements
  const jobsSavedCount = document.getElementById('jobsSavedCount');
  const uniqueSkillsCount = document.getElementById('uniqueSkillsCount');
  const topSkill = document.getElementById('topSkill');
  const savedJobsList = document.getElementById('savedJobsList');
  const jobSearchInput = document.getElementById('jobSearchInput');
  const jobRoleFilter = document.getElementById('jobRoleFilter');
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
  uploadResumeBtn.addEventListener('click', () => resumeFileInput.click());
  promptUploadBtn.addEventListener('click', () => resumeFileInput.click());
  resumeFileInput.addEventListener('change', handleResumeUpload);
  analyzeBtn.addEventListener('click', generateRecommendations);
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
    chrome.storage.local.get(['savedJobs', 'skillFrequency'], function(data) {
      const jobs = data.savedJobs || [];
      const skillFreq = data.skillFrequency || {};
      
      // Update stats
      jobsSavedCount.textContent = jobs.length;
      
      const uniqueSkills = Object.keys(skillFreq);
      uniqueSkillsCount.textContent = uniqueSkills.length;
      
      // Find top skill
      let maxFreq = 0;
      let maxSkill = '-';
      for (const skill in skillFreq) {
        if (skillFreq[skill] > maxFreq) {
          maxFreq = skillFreq[skill];
          maxSkill = skill;
        }
      }
      topSkill.textContent = maxSkill;
      
      // Clear jobs list
      savedJobsList.innerHTML = '';
      
      if (jobs.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No jobs saved yet. Use the extension to save job descriptions.</p>';
        savedJobsList.appendChild(emptyState);
      } else {
        // Populate jobs list
        jobs.forEach(job => {
          const jobCard = createJobCard(job);
          savedJobsList.appendChild(jobCard);
        });
        
        // Populate job role filter
        populateJobRoleFilter(jobs);
      }
      
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
    });
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
      skillTag.textContent = typeof skill === 'string' ? skill : skill.name;
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
      li.textContent = typeof skill === 'string' ? skill : skill.name;
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
  
  // Function to calculate skill gaps
  function calculateSkillGaps() {
    if (!resumeData) return;
    
    // Clear skill gaps list
    skillGapsList.innerHTML = '';
    
    // If we have missing_skills from the API, use those
    if (resumeData.missing_skills) {
      resumeData.missing_skills.forEach(skill => {
        const li = document.createElement('li');
        li.textContent = typeof skill === 'string' ? skill : skill.name;
        skillGapsList.appendChild(li);
      });
    } else {
      // Otherwise calculate from job skills and resume skills
      chrome.storage.local.get({skillFrequency: {}}, function(data) {
        const skillFreq = data.skillFrequency;
        
        // Get top skills from job listings
        const topSkills = Object.entries(skillFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(entry => entry[0]);
        
        // Find skills that are not in the resume
        const resumeSkillsLower = resumeData.present_skills.map(skill => 
          (typeof skill === 'string' ? skill : skill.name).toLowerCase()
        );
        
        const skillGaps = topSkills.filter(skill => 
          !resumeSkillsLower.includes(skill.toLowerCase())
        );
        
        // Populate skill gaps list
        skillGaps.forEach(skill => {
          const li = document.createElement('li');
          li.textContent = skill;
          skillGapsList.appendChild(li);
        });
      });
    }
  }
  
  // Function to generate project recommendations
  async function generateRecommendations() {
    if (!resumeData) {
      alert('Please upload your resume first');
      return;
    }
    
    // Show loading state
    projectRecommendations.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    recommendationsList.innerHTML = '';
    
    try {
      // Get skill gaps
      const skillGaps = resumeData.missing_skills || [];
      const currentSkills = resumeData.present_skills || [];
      
      // Call the CrewAI backend to get project recommendations
      const response = await fetch(`${API_BASE_URL}/recommend-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_gaps: skillGaps,
          current_skills: currentSkills
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const projects = data.result;
      
      // Hide loading state
      loadingIndicator.classList.add('hidden');
      
      // Populate recommendations list
      if (Array.isArray(projects)) {
        projects.forEach(project => {
          const projectCard = createProjectCard(project);
          recommendationsList.appendChild(projectCard);
        });
      } else {
        // If the result is not an array, try to parse it as JSON
        try {
          const parsedProjects = typeof projects === 'string' ? JSON.parse(projects) : projects;
          if (Array.isArray(parsedProjects)) {
            parsedProjects.forEach(project => {
              const projectCard = createProjectCard(project);
              recommendationsList.appendChild(projectCard);
            });
          } else {
            throw new Error('Invalid project recommendations format');
          }
        } catch (error) {
          console.error('Error parsing project recommendations:', error);
          // Fallback to mock recommendations
          mockProjectRecommendations();
        }
      }
    } catch (error) {
      console.error('Error getting project recommendations:', error);
      // Fallback to mock recommendations
      mockProjectRecommendations();
    }
  }
  
  // Mock project recommendations as fallback
  function mockProjectRecommendations() {
    // Hide loading state
    loadingIndicator.classList.add('hidden');
    
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
});
