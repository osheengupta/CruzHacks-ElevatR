// Fixed recommendations script to ensure recommendations display
console.log('%c FIXED RECOMMENDATIONS SCRIPT LOADED', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');

// Define the main function globally so it can be called from anywhere
function showFixedRecommendations() {
  console.log('showFixedRecommendations called');
  
  // Get the elements again to ensure we have them
  const recommendationsList = document.getElementById('recommendationsList');
  const learningResourcesList = document.getElementById('learningResourcesList');
  const projectRecommendations = document.getElementById('projectRecommendations');
  
  // Debug element state
  dumpElementInfo(recommendationsList, 'recommendationsList');
  dumpElementInfo(learningResourcesList, 'learningResourcesList');
  dumpElementInfo(projectRecommendations, 'projectRecommendations');
  
  // First, ensure the containers are visible
  if (projectRecommendations) {
    projectRecommendations.style.display = 'block';
  }
  
  // Clear previous content
  if (recommendationsList) {
    recommendationsList.innerHTML = '<h3 style="color: #333; margin: 20px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Recommended Projects</h3>';
  }
  
  if (learningResourcesList) {
    learningResourcesList.innerHTML = '';
  }
  
  // Add project cards using direct DOM manipulation
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
  
  // Add projects
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
    
    if (recommendationsList) {
      recommendationsList.appendChild(card);
    }
  });
  
  // Add learning resources heading
  if (learningResourcesList) {
    const resourcesHeading = document.createElement('h3');
    resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
    resourcesHeading.style.margin = '30px 0 20px';
    resourcesHeading.style.color = '#333';
    resourcesHeading.style.borderBottom = '1px solid #eee';
    resourcesHeading.style.paddingBottom = '10px';
    learningResourcesList.appendChild(resourcesHeading);
  }
  
  // Sample resources for skill gaps
  const skillGaps = ['express', 'git'];
  
  // Show resources for each skill gap
  skillGaps.forEach(skill => {
    if (!learningResourcesList) return;
    
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
    
    // Resources by category
    const categories = [
      {
        name: 'Websites',
        items: [
          { title: skill === 'express' ? 'Express.js Documentation' : 'Git Documentation', description: 'Official documentation and guides' },
          { title: skill === 'express' ? 'MDN Web Docs - Express' : 'GitHub Learning Lab', description: 'Comprehensive tutorials and references' }
        ]
      },
      {
        name: 'Videos',
        items: [
          { title: `${skill} Crash Course - YouTube`, description: 'A quick introduction to core concepts' },
          { title: `Advanced ${skill} Techniques`, description: 'Detailed video tutorials for advanced usage' }
        ]
      },
      {
        name: 'Books',
        items: [
          { title: skill === 'express' ? 'Express.js in Action' : 'Pro Git', description: 'Complete guide to mastering the technology' },
          { title: skill === 'express' ? 'Web Development with Node and Express' : 'Git from the Bottom Up', description: 'Practical approaches and best practices' }
        ]
      }
    ];
    
    // Add each category
    categories.forEach(category => {
      const sectionTitle = document.createElement('h5');
      sectionTitle.textContent = category.name;
      sectionTitle.style.color = '#3498db';
      sectionTitle.style.margin = '16px 0 8px';
      resourceCard.appendChild(sectionTitle);
      
      const list = document.createElement('ul');
      list.style.paddingLeft = '20px';
      list.style.margin = '0';
      
      category.items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.style.marginBottom = '8px';
        
        const itemHTML = `
          <div style="font-weight: bold;">${item.title}</div>
          <div style="font-size: 14px; color: #666;">${item.description}</div>
        `;
        
        listItem.innerHTML = itemHTML;
        list.appendChild(listItem);
      });
      
      resourceCard.appendChild(list);
    });
    
    learningResourcesList.appendChild(resourceCard);
  });
  
  console.log('Fixed recommendations displayed successfully');
}

// Add a global emergency function for manual triggering if needed
window.showEmergencyRecommendations = function() {
  console.log('Manual emergency recommendations triggered');
  showFixedRecommendations();
};

// Helper function to dump element details
function dumpElementInfo(element, name) {
  if (!element) {
    console.error(`${name} NOT FOUND in DOM`);
    return;
  }
  
  console.log(`${name} found:`, {
    id: element.id,
    tagName: element.tagName,
    classes: Array.from(element.classList),
    display: window.getComputedStyle(element).display,
    visibility: window.getComputedStyle(element).visibility,
    dimensions: {
      width: element.offsetWidth,
      height: element.offsetHeight
    },
    parent: element.parentElement ? element.parentElement.tagName : 'none'
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded in fixed script');
  
  // Get the buttons
  const analyzeBtn = document.getElementById('analyzeBtn');
  const directRecommendBtn = document.getElementById('directRecommendBtn');
  const recommendationsList = document.getElementById('recommendationsList');
  const learningResourcesList = document.getElementById('learningResourcesList');
  const projectRecommendations = document.getElementById('projectRecommendations');
  
  // Log all the elements to debug
  console.log('analyzeBtn:', analyzeBtn);
  console.log('directRecommendBtn:', directRecommendBtn);
  console.log('recommendationsList:', recommendationsList);
  console.log('learningResourcesList:', learningResourcesList);
  console.log('projectRecommendations:', projectRecommendations);
  
  // Define the function to show recommendations
  function showFixedRecommendations() {
    console.log('showFixedRecommendations called');
    
    // First, ensure the containers are visible
    if (projectRecommendations) {
      projectRecommendations.style.display = 'block';
    }
    
    // Clear previous content
    if (recommendationsList) {
      recommendationsList.innerHTML = '<h3 style="color: #333; margin: 20px 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Recommended Projects</h3>';
    }
    
    if (learningResourcesList) {
      learningResourcesList.innerHTML = '';
    }
    
    // Add project cards using direct DOM manipulation
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
    
    // Add projects
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
      
      if (recommendationsList) {
        recommendationsList.appendChild(card);
      }
    });
    
    // Add learning resources heading
    if (learningResourcesList) {
      const resourcesHeading = document.createElement('h3');
      resourcesHeading.textContent = 'Learning Resources for Skill Gaps';
      resourcesHeading.style.margin = '30px 0 20px';
      resourcesHeading.style.color = '#333';
      resourcesHeading.style.borderBottom = '1px solid #eee';
      resourcesHeading.style.paddingBottom = '10px';
      learningResourcesList.appendChild(resourcesHeading);
    }
    
    // Sample resources for skill gaps
    const skillGaps = ['express', 'git'];
    
    // Show resources for each skill gap
    skillGaps.forEach(skill => {
      if (!learningResourcesList) return;
      
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
      
      // Resources by category
      const categories = [
        {
          name: 'Websites',
          items: [
            { title: skill === 'express' ? 'Express.js Documentation' : 'Git Documentation', description: 'Official documentation and guides' },
            { title: skill === 'express' ? 'MDN Web Docs - Express' : 'GitHub Learning Lab', description: 'Comprehensive tutorials and references' }
          ]
        },
        {
          name: 'Videos',
          items: [
            { title: `${skill} Crash Course - YouTube`, description: 'A quick introduction to core concepts' },
            { title: `Advanced ${skill} Techniques`, description: 'Detailed video tutorials for advanced usage' }
          ]
        },
        {
          name: 'Books',
          items: [
            { title: skill === 'express' ? 'Express.js in Action' : 'Pro Git', description: 'Complete guide to mastering the technology' },
            { title: skill === 'express' ? 'Web Development with Node and Express' : 'Git from the Bottom Up', description: 'Practical approaches and best practices' }
          ]
        }
      ];
      
      // Add each category
      categories.forEach(category => {
        const sectionTitle = document.createElement('h5');
        sectionTitle.textContent = category.name;
        sectionTitle.style.color = '#3498db';
        sectionTitle.style.margin = '16px 0 8px';
        resourceCard.appendChild(sectionTitle);
        
        const list = document.createElement('ul');
        list.style.paddingLeft = '20px';
        list.style.margin = '0';
        
        category.items.forEach(item => {
          const listItem = document.createElement('li');
          listItem.style.marginBottom = '8px';
          
          const itemHTML = `
            <div style="font-weight: bold;">${item.title}</div>
            <div style="font-size: 14px; color: #666;">${item.description}</div>
          `;
          
          listItem.innerHTML = itemHTML;
          list.appendChild(listItem);
        });
        
        resourceCard.appendChild(list);
      });
      
      learningResourcesList.appendChild(resourceCard);
    });
    
    console.log('Fixed recommendations displayed successfully');
  }
  
  // Attach event listeners
  if (analyzeBtn) {
    console.log('Attaching click handler to analyzeBtn');
    analyzeBtn.addEventListener('click', function(e) {
      console.log('Analyze button clicked in fixed script');
      e.preventDefault();
      showFixedRecommendations();
      return false;
    });
  }
  
  if (directRecommendBtn) {
    console.log('Attaching click handler to directRecommendBtn');
    directRecommendBtn.addEventListener('click', function(e) {
      console.log('Direct recommend button clicked in fixed script');
      e.preventDefault();
      showFixedRecommendations();
      return false;
    });
  }
  
  // We're no longer adding the emergency button as per user request to simplify the interface
  const dashboardSection = document.querySelector('.recommendations-section');
  if (dashboardSection) {
    console.log('Recommendations section found');
    // No emergency button will be added
  }
});
