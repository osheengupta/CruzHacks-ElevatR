// Background script for JobSkillTracker extension

// Backend API URL
const API_BASE_URL = "http://localhost:8000";

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  console.log("JobSkillTracker extension installed");
  
  // Initialize storage with empty arrays
  chrome.storage.local.set({
    savedJobs: [],
    skillFrequency: {}
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "processJobWithLLM") {
    // Call the CrewAI backend to process the job description
    processJobWithCrewAI(request.jobData)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({error: error.message}));
    
    return true; // Required for async response
  }
});

// Function to process job with CrewAI backend
async function processJobWithCrewAI(jobData) {
  try {
    console.log("Sending job data to CrewAI backend:", jobData);
    
    // Make API call to the backend
    const response = await fetch(`${API_BASE_URL}/process-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Received response from CrewAI backend:", data);
    
    // Extract the skills and responsibilities from the response
    const result = data.result;
    
    // Transform the result into the format expected by the extension
    const skills = [];
    
    // Add technical skills
    if (result.technical_skills) {
      result.technical_skills.forEach(skill => {
        skills.push({
          name: skill,
          type: "technical",
          confidence: 0.9
        });
      });
    }
    
    // Add soft skills
    if (result.soft_skills) {
      result.soft_skills.forEach(skill => {
        skills.push({
          name: skill,
          type: "soft",
          confidence: 0.8
        });
      });
    }
    
    // Update skill frequency in storage
    updateSkillFrequency(skills);
    
    return {
      title: jobData.title,
      company: jobData.company,
      skills: skills,
      responsibilities: result.responsibilities || []
    };
  } catch (error) {
    console.error("Error processing job with CrewAI:", error);
    
    // Fallback to mock implementation if the API call fails
    return processJobWithMockLLM(jobData);
  }
}

// Mock function as fallback if the API call fails
async function processJobWithMockLLM(jobData) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock extracted skills based on common job requirements
  const extractedSkills = [];
  const description = jobData.description.toLowerCase();
  
  // Technical skills
  const technicalSkills = [
    "javascript", "python", "java", "c++", "react", "angular", "vue", 
    "node.js", "express", "django", "flask", "spring", "aws", "azure", 
    "gcp", "docker", "kubernetes", "ci/cd", "git", "sql", "nosql", 
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch"
  ];
  
  // Soft skills
  const softSkills = [
    "communication", "teamwork", "problem solving", "critical thinking",
    "time management", "leadership", "adaptability", "creativity",
    "collaboration", "attention to detail", "project management"
  ];
  
  // Check for technical skills
  technicalSkills.forEach(skill => {
    if (description.includes(skill)) {
      extractedSkills.push({
        name: skill,
        type: "technical",
        confidence: 0.9
      });
    }
  });
  
  // Check for soft skills
  softSkills.forEach(skill => {
    if (description.includes(skill)) {
      extractedSkills.push({
        name: skill,
        type: "soft",
        confidence: 0.8
      });
    }
  });
  
  // If we didn't find any skills, add some defaults
  if (extractedSkills.length === 0) {
    extractedSkills.push(
      { name: "javascript", type: "technical", confidence: 0.7 },
      { name: "react", type: "technical", confidence: 0.7 },
      { name: "problem solving", type: "soft", confidence: 0.8 }
    );
  }
  
  // Extract responsibilities
  const responsibilities = [];
  
  // Look for bullet points that might indicate responsibilities
  const bulletPoints = description.split(/•|\*|–|-|\n/).filter(Boolean);
  
  // Check each bullet point for potential responsibility
  bulletPoints.forEach(point => {
    const trimmedPoint = point.trim();
    if (
      trimmedPoint.length > 20 && 
      trimmedPoint.length < 200 &&
      (
        trimmedPoint.includes("develop") ||
        trimmedPoint.includes("design") ||
        trimmedPoint.includes("implement") ||
        trimmedPoint.includes("create") ||
        trimmedPoint.includes("manage") ||
        trimmedPoint.includes("build") ||
        trimmedPoint.includes("test") ||
        trimmedPoint.includes("collaborate") ||
        trimmedPoint.includes("work with")
      )
    ) {
      responsibilities.push(trimmedPoint);
    }
  });
  
  // Limit to top 5 responsibilities
  const topResponsibilities = responsibilities.slice(0, 5);
  
  // Update skill frequency in storage
  updateSkillFrequency(extractedSkills);
  
  return {
    title: jobData.title,
    company: jobData.company,
    skills: extractedSkills,
    responsibilities: topResponsibilities
  };
}

// Function to update skill frequency
function updateSkillFrequency(skills) {
  chrome.storage.local.get({skillFrequency: {}}, function(data) {
    const skillFrequency = data.skillFrequency;
    
    // Update frequency for each skill
    skills.forEach(skill => {
      if (skillFrequency[skill.name]) {
        skillFrequency[skill.name]++;
      } else {
        skillFrequency[skill.name] = 1;
      }
    });
    
    // Save updated frequencies
    chrome.storage.local.set({skillFrequency: skillFrequency});
  });
}
