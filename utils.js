// Function to get default skills based on job title
function getDefaultSkillsForJobTitle(jobTitle) {
  // Convert job title to lowercase for easier matching
  const title = (jobTitle || '').toLowerCase();
  
  // Define skill sets for common job categories
  const skillSets = {
    developer: ["JavaScript", "HTML", "CSS", "Git", "Problem Solving"],
    engineer: ["Problem Solving", "Analytical Thinking", "Teamwork", "Communication"],
    software: ["Java", "Python", "SQL", "Data Structures", "Algorithms"],
    web: ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    frontend: ["HTML", "CSS", "JavaScript", "React", "UI/UX"],
    backend: ["Node.js", "Python", "Java", "SQL", "API Design"],
    fullstack: ["JavaScript", "React", "Node.js", "SQL", "Git"],
    data: ["Python", "SQL", "Data Analysis", "Statistics", "Machine Learning"],
    product: ["Product Management", "User Research", "Agile", "Communication", "Problem Solving"],
    manager: ["Leadership", "Communication", "Project Management", "Strategic Thinking", "Team Building"],
    designer: ["UI/UX", "Figma", "Adobe Creative Suite", "Visual Design", "User Research"],
    marketing: ["Content Creation", "Social Media", "SEO", "Analytics", "Communication"],
    sales: ["Negotiation", "Communication", "CRM", "Relationship Building", "Problem Solving"],
    analyst: ["Data Analysis", "Excel", "SQL", "Problem Solving", "Communication"]
  };
  
  // Check which category the job title falls into
  let matchedSkills = [];
  
  // Try to find matching skills based on keywords in the job title
  for (const category in skillSets) {
    if (title.includes(category)) {
      matchedSkills = matchedSkills.concat(skillSets[category]);
    }
  }
  
  // Remove duplicates
  matchedSkills = [...new Set(matchedSkills)];
  
  // If no specific skills matched, return a generic set of skills
  if (matchedSkills.length === 0) {
    return ["Communication", "Problem Solving", "Teamwork", "Adaptability", "Time Management"];
  }
  
  return matchedSkills;
}
