// Fix for AI Learning Assistant and Resume Analysis buttons
console.log('Loading button fixes for AI Learning Assistant and Resume Analysis');

document.addEventListener('DOMContentLoaded', function() {
  // =======================================
  // AI Learning Assistant Button Fixes
  // =======================================
  const generalChatBtn = document.getElementById('generalChatBtn');
  const paperSummaryBtn = document.getElementById('paperSummaryBtn');
  const skillRoadmapBtn = document.getElementById('skillRoadmapBtn');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const paperUrlContainer = document.getElementById('paperUrlContainer');
  const urlTabBtn = document.getElementById('urlTabBtn');
  const uploadTabBtn = document.getElementById('uploadTabBtn');
  const urlInputSection = document.getElementById('urlInputSection');
  const fileUploadSection = document.getElementById('fileUploadSection');
  const paperUrlInput = document.getElementById('paperUrlInput');
  const paperFileInput = document.getElementById('paperFileInput');
  
  // Log which buttons we found for debugging
  console.log('AI Learning Assistant buttons found:', {
    generalChatBtn: !!generalChatBtn,
    paperSummaryBtn: !!paperSummaryBtn,
    skillRoadmapBtn: !!skillRoadmapBtn,
    sendMessageBtn: !!sendMessageBtn
  });
  
  // Chat mode buttons functionality
  if (generalChatBtn && paperSummaryBtn && skillRoadmapBtn) {
    // General Chat Mode
    generalChatBtn.addEventListener('click', function() {
      console.log('General Chat mode activated');
      setActiveChatButton(this);
      if (paperUrlContainer) paperUrlContainer.classList.add('hidden');
    });
    
    // Paper Summary Mode
    paperSummaryBtn.addEventListener('click', function() {
      console.log('Paper Summary mode activated');
      setActiveChatButton(this);
      if (paperUrlContainer) paperUrlContainer.classList.remove('hidden');
    });
    
    // Skill Roadmap Mode
    skillRoadmapBtn.addEventListener('click', function() {
      console.log('Skill Roadmap mode activated');
      setActiveChatButton(this);
      if (paperUrlContainer) paperUrlContainer.classList.add('hidden');
      
      // Add a skill roadmap prompt to the chat
      addBotMessage('Tell me which skill you want to learn, and I\'ll create a personalized learning roadmap for you.');
    });
  }
  
  // Helper function to set active chat button
  function setActiveChatButton(activeBtn) {
    // Remove active class from all buttons
    [generalChatBtn, paperSummaryBtn, skillRoadmapBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    
    // Add active class to the clicked button
    if (activeBtn) activeBtn.classList.add('active');
  }
  
  // Add bot/assistant message to chat
  function addBotMessage(message) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Add user message to chat
  function addUserMessage(message) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Send Message button functionality
  if (sendMessageBtn && chatInput) {
    sendMessageBtn.addEventListener('click', function() {
      sendMessage();
    });
    
    // Allow sending with Enter key
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Function to send a message
  function sendMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    
    const userMessage = chatInput.value.trim();
    console.log('Sending message:', userMessage);
    
    // Add the user message to the chat
    addUserMessage(userMessage);
    
    // Clear the input
    chatInput.value = '';
    
    // Show a thinking indicator
    addBotMessage('<em>Thinking...</em>');
    
    // Get the active chat mode
    const activeChatMode = document.querySelector('.chat-mode-btn.active');
    let chatMode = 'general';
    
    if (activeChatMode) {
      if (activeChatMode.id === 'paperSummaryBtn') {
        chatMode = 'paper_summary';
      } else if (activeChatMode.id === 'skillRoadmapBtn') {
        chatMode = 'skill_roadmap';
      }
    }
    
    console.log('Chat mode:', chatMode);
    
    // Prepare the chat history from the DOM
    const chatHistory = [];
    const messageElements = document.querySelectorAll('.message');
    messageElements.forEach(element => {
      if (element.classList.contains('user')) {
        chatHistory.push({
          role: 'user',
          content: element.textContent.trim()
        });
      } else if (element.classList.contains('assistant') && !element.innerHTML.includes('Thinking...')) {
        chatHistory.push({
          role: 'assistant',
          content: element.textContent.trim()
        });
      }
    });
    
    console.log('Sending chat request to backend...');
    console.log('Request payload:', {
      message: userMessage,
      chat_history: chatHistory,
      mode: chatMode
    });
    
    // Make a real API call to our backend
    fetch('http://localhost:8005/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        chat_history: chatHistory,
        mode: chatMode
      })
    })
    .then(response => {
      console.log('Received response:', response.status);
      if (!response.ok) {
        return response.text().then(text => {
          console.error('Error response:', text);
          throw new Error(`Network response was not ok: ${response.status} ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data);
      // Remove the thinking message
      if (chatMessages) {
        const thinkingMessage = chatMessages.querySelector('.message.assistant:last-child');
        if (thinkingMessage) chatMessages.removeChild(thinkingMessage);
      }
      
      // Add the bot response
      addBotMessage(data.response);
    })
    .catch(error => {
      console.error('Error:', error);
      
      // Remove the thinking message
      if (chatMessages) {
        const thinkingMessage = chatMessages.querySelector('.message.assistant:last-child');
        if (thinkingMessage) chatMessages.removeChild(thinkingMessage);
      }
      
      // Add a fallback response
      addBotMessage("I'm sorry, I couldn't connect to the AI service. Please try again later.");
    });
  }
  
  // Paper URL/File tab switching functionality
  if (urlTabBtn && uploadTabBtn && urlInputSection && fileUploadSection) {
    urlTabBtn.addEventListener('click', function() {
      this.classList.add('active');
      if (uploadTabBtn) uploadTabBtn.classList.remove('active');
      urlInputSection.classList.remove('hidden');
      fileUploadSection.classList.add('hidden');
    });
    
    uploadTabBtn.addEventListener('click', function() {
      this.classList.add('active');
      if (urlTabBtn) urlTabBtn.classList.remove('active');
      fileUploadSection.classList.remove('hidden');
      urlInputSection.classList.add('hidden');
    });
  }
  
  // =======================================
  // Resume Analysis Button Fixes
  // =======================================
  const resumeFileInput = document.getElementById('resumeFileInput');
  const resumeUploadPrompt = document.getElementById('resumeUploadPrompt');
  const resumeAnalysisResults = document.getElementById('resumeAnalysisResults');
  const resumeLoadingIndicator = document.querySelector('.resume-loading-indicator');
  const resumeSkillsList = document.getElementById('resumeSkillsList');
  const skillGapsList = document.getElementById('skillGapsList');
  
  console.log('Resume Analysis elements found:', {
    resumeFileInput: !!resumeFileInput,
    resumeUploadPrompt: !!resumeUploadPrompt,
    resumeAnalysisResults: !!resumeAnalysisResults
  });
  
  // Resume file upload functionality
  if (resumeFileInput) {
    resumeFileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      console.log('Resume file selected:', file.name);
      
      // Show loading indicator
      if (resumeUploadPrompt) resumeUploadPrompt.classList.add('hidden');
      if (resumeLoadingIndicator) resumeLoadingIndicator.classList.remove('hidden');
      
      // Simulate processing the resume (this would normally be an API call)
      setTimeout(() => {
        // Hide loading indicator
        if (resumeLoadingIndicator) resumeLoadingIndicator.classList.add('hidden');
        
        // Show analysis results
        if (resumeAnalysisResults) resumeAnalysisResults.classList.remove('hidden');
        
        // Populate resume skills
        if (resumeSkillsList) {
          resumeSkillsList.innerHTML = '';
          const mockResumeSkills = ['Python', 'Data Analysis', 'JavaScript', 'HTML/CSS', 'SQL', 'Communication'];
          
          mockResumeSkills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            resumeSkillsList.appendChild(li);
          });
        }
        
        // Populate skill gaps
        if (skillGapsList) {
          skillGapsList.innerHTML = '';
          const mockSkillGaps = ['express', 'git', 'React', 'Node.js', 'MongoDB'];
          
          mockSkillGaps.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            skillGapsList.appendChild(li);
          });
        }
        
        console.log('Resume analysis completed');
        
        // Store resume data for other components
        if (window.jobSkillTrackerGlobal) {
          window.jobSkillTrackerGlobal.resumeText = "Mock resume content";
          window.jobSkillTrackerGlobal.resumeFileName = file.name;
          window.jobSkillTrackerGlobal.isResumeUploaded = true;
          window.jobSkillTrackerGlobal.resumeData = {
            rawText: "Mock resume content",
            fileName: file.name,
            analyzedData: {
              present_skills: mockResumeSkills.map(skill => ({ name: skill })),
              missing_skills: mockSkillGaps.map(skill => ({ name: skill }))
            }
          };
          
          // Store in localStorage for persistence
          try {
            localStorage.setItem('jobSkillTrackerResumeData', JSON.stringify(window.jobSkillTrackerGlobal.resumeData));
            console.log('Resume data saved to localStorage');
          } catch (error) {
            console.error('Error saving resume data to localStorage:', error);
          }
        }
      }, 2000);
    });
  }
  
  console.log('Button fixes setup complete');
});
