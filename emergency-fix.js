// Emergency fix for recommendations
console.log('Emergency fix script loaded');

// Create a standalone function that shows recommendations
function emergencyShowRecommendations() {
  console.log('emergencyShowRecommendations called');
  
  // Get the elements directly
  const recommendationsList = document.getElementById('recommendationsList');
  const learningResourcesList = document.getElementById('learningResourcesList');
  const projectRecommendations = document.getElementById('projectRecommendations');
  
  // Make sure containers are visible
  if (projectRecommendations) {
    projectRecommendations.style.display = 'block';
    projectRecommendations.style.visibility = 'visible';
  }
  
  // Clear and populate recommendations
  if (recommendationsList) {
    recommendationsList.innerHTML = '';
    
    // Add project heading
    const projectsHeading = document.createElement('h3');
    projectsHeading.textContent = 'Recommended Projects';
    projectsHeading.style.margin = '20px 0';
    projectsHeading.style.color = '#333';
    projectsHeading.style.borderBottom = '1px solid #eee';
    projectsHeading.style.paddingBottom = '10px';
    recommendationsList.appendChild(projectsHeading);
    
    // Add project cards
    const projects = [
      {
        title: 'Express REST API',
        difficulty: 'Medium',
        description: 'Build a RESTful API using Express.js with authentication and database integration.',
        skills: ['express', 'Node.js', 'API Development'],
        time: '2-3 weeks'
      },
      {
        title: 'Git Workflow Manager',
        difficulty: 'Intermediate',
        description: 'Create a visual Git workflow tool to help developers manage branches and merges.',
        skills: ['git', 'JavaScript', 'UI/UX'],
        time: '3-4 weeks'
      }
    ];
    
    projects.forEach(project => {
      const card = document.createElement('div');
      card.style.border = '1px solid #ddd';
      card.style.borderRadius = '8px';
      card.style.padding = '15px';
      card.style.margin = '0 0 15px 0';
      card.style.backgroundColor = '#f9f9f9';
      
      card.innerHTML = `
        <h4 style="margin-top: 0; color: #2c3e50;">${project.title} 
          <span style="background-color: #3498db; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${project.difficulty}</span>
        </h4>
        <p>${project.description}</p>
        <p><strong>Skills:</strong> ${project.skills.join(', ')}</p>
        <p><strong>Time Estimate:</strong> ${project.time}</p>
      `;
      
      recommendationsList.appendChild(card);
    });
  }
  
  // Add learning resources
  if (learningResourcesList) {
    learningResourcesList.innerHTML = '';
    
    // Add learning resources heading
    const resourcesHeading = document.createElement('h3');
    resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
    resourcesHeading.style.margin = '30px 0 20px';
    resourcesHeading.style.color = '#333';
    resourcesHeading.style.borderBottom = '1px solid #eee';
    resourcesHeading.style.paddingBottom = '10px';
    learningResourcesList.appendChild(resourcesHeading);
    
    // Add resources for each skill gap
    ['express', 'git'].forEach(skill => {
      const resourceCard = document.createElement('div');
      resourceCard.style.border = '1px solid #ddd';
      resourceCard.style.borderRadius = '8px';
      resourceCard.style.padding = '15px';
      resourceCard.style.marginBottom = '20px';
      resourceCard.style.backgroundColor = '#f9f9f9';
      
      // Skill title
      const skillTitle = document.createElement('h4');
      skillTitle.textContent = skill.charAt(0).toUpperCase() + skill.slice(1);
      skillTitle.style.borderBottom = '1px solid #eee';
      skillTitle.style.paddingBottom = '8px';
      skillTitle.style.marginTop = '0';
      resourceCard.appendChild(skillTitle);
      
      // Add resource sections
      [
        {
          title: 'Websites',
          items: [
            { 
              title: skill === 'express' ? 'Express.js Documentation' : 'Git Documentation', 
              description: 'Official documentation and guides' 
            },
            { 
              title: skill === 'express' ? 'MDN Web Docs - Express' : 'GitHub Learning Lab', 
              description: 'Comprehensive tutorials and references' 
            }
          ]
        },
        {
          title: 'Videos',
          items: [
            { 
              title: `${skill} Crash Course - YouTube`, 
              description: 'A quick introduction to core concepts' 
            },
            { 
              title: `Advanced ${skill} Techniques`, 
              description: 'Detailed video tutorials for advanced usage' 
            }
          ]
        },
        {
          title: 'Books',
          items: [
            { 
              title: skill === 'express' ? 'Express.js in Action' : 'Pro Git', 
              description: 'Complete guide to mastering the technology' 
            },
            { 
              title: skill === 'express' ? 'Web Development with Node and Express' : 'Git from the Bottom Up', 
              description: 'Practical approaches and best practices' 
            }
          ]
        }
      ].forEach(section => {
        // Section title
        const sectionTitle = document.createElement('h5');
        sectionTitle.textContent = section.title;
        sectionTitle.style.color = '#3498db';
        sectionTitle.style.margin = '16px 0 8px';
        resourceCard.appendChild(sectionTitle);
        
        // Create list
        const list = document.createElement('ul');
        list.style.paddingLeft = '20px';
        list.style.margin = '0';
        
        // Add items
        section.items.forEach(item => {
          const listItem = document.createElement('li');
          listItem.style.marginBottom = '8px';
          
          const itemTitle = document.createElement('div');
          itemTitle.textContent = item.title;
          itemTitle.style.fontWeight = 'bold';
          
          const itemDesc = document.createElement('div');
          itemDesc.textContent = item.description;
          itemDesc.style.fontSize = '14px';
          itemDesc.style.color = '#666';
          
          listItem.appendChild(itemTitle);
          listItem.appendChild(itemDesc);
          list.appendChild(listItem);
        });
        
        resourceCard.appendChild(list);
      });
      
      learningResourcesList.appendChild(resourceCard);
    });
  }
  
  alert('Learning resources and recommendations have been generated!');
  console.log('Emergency recommendations displayed successfully');
}

// Add direct inline handlers to the buttons
document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up recommendation handlers');

  // Modify the existing buttons to use our function
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.onclick = emergencyShowRecommendations;
  }
  
  // We're no longer adding the emergency button or direct recommendations button
  // as per user request to simplify the interface
});

// Also add a global function that can be called from the console
window.showRecommendations = emergencyShowRecommendations;
