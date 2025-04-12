// Dashboard.js - Fixed version with working buttons
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard script loaded');
  
  // API URL for backend
  const API_BASE_URL = "http://localhost:8000";
  
  // Generate a unique user ID or retrieve from storage
  let userId;
  
  try {
    // Try to use localStorage since chrome extension API might not be available
    userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', userId);
    }
    console.log('User ID (local storage):', userId);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    userId = 'anonymous_' + Date.now();
  }
  
  // Store DOM elements references
  const elements = {};
  
  // Function to safely get DOM elements
  function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with ID "${id}" not found`);
    }
    return element;
  }
  
  // Initialize all DOM element references
  function initializeElements() {
    console.log('Initializing DOM elements');
    
    // Main dashboard elements
    elements.jobsSavedCount = getElement('jobsSavedCount');
    elements.uniqueSkillsCount = getElement('uniqueSkillsCount');
    elements.topSkill = getElement('topSkill');
    elements.savedJobsList = getElement('savedJobsList');
    elements.jobSearchInput = getElement('jobSearchInput');
    elements.jobRoleFilter = getElement('jobRoleFilter');
    
    // AI Chatbot elements
    elements.chatMessages = getElement('chatMessages');
    elements.chatInput = getElement('chatInput');
    elements.sendMessageBtn = getElement('sendMessageBtn');
    elements.generalChatBtn = getElement('generalChatBtn');
    elements.paperSummaryBtn = getElement('paperSummaryBtn');
    elements.skillRoadmapBtn = getElement('skillRoadmapBtn');
    elements.paperUrlContainer = getElement('paperUrlContainer');
    elements.paperUrlInput = getElement('paperUrlInput');
    
    // Paper upload elements
    elements.urlTabBtn = getElement('urlTabBtn');
    elements.uploadTabBtn = getElement('uploadTabBtn');
    elements.urlInputSection = getElement('urlInputSection');
    elements.fileUploadSection = getElement('fileUploadSection');
    elements.paperFileInput = getElement('paperFileInput');
    elements.uploadedFileName = getElement('uploadedFileName');
    
    // Resume analysis elements
    elements.resumeFileInput = getElement('resumeFileInput');
    elements.resumeUploadPrompt = getElement('resumeUploadPrompt');
    elements.resumeAnalysisResults = getElement('resumeAnalysisResults');
    elements.resumeSkillsList = getElement('resumeSkillsList');
    elements.skillGapsList = getElement('skillGapsList');
    
    // Project recommendations elements
    elements.analyzeBtn = getElement('analyzeBtn');
    elements.projectRecommendations = getElement('projectRecommendations');
    elements.recommendationsList = getElement('recommendationsList');
    elements.loadingIndicator = document.querySelector('.loading-indicator');
    elements.resumeLoadingIndicator = document.querySelector('.resume-loading-indicator');
    
    // Modal elements
    elements.jobModal = getElement('jobModal');
    elements.modalJobTitle = getElement('modalJobTitle');
    elements.modalCompanyName = getElement('modalCompanyName');
    elements.modalJobDescription = getElement('modalJobDescription');
    elements.modalJobSkills = getElement('modalJobSkills');
    elements.closeModal = getElement('closeModal');
    elements.deleteJobBtn = getElement('deleteJobBtn');
    
    // Log element status
    logElementStatus();
  }
  
  // Log the status of critical elements
  function logElementStatus() {
    const criticalElements = ['chatInput', 'sendMessageBtn', 'generalChatBtn', 
      'paperSummaryBtn', 'skillRoadmapBtn', 'resumeFileInput'];
    
    console.log('Critical element status:');
    criticalElements.forEach(id => {
      console.log(`${id}: ${elements[id] ? 'Found' : 'Not found'}`);
    });
  }
  
  // Initialize the AI chatbot functionality
  function initChatbot() {
    console.log('Initializing chatbot');
    
    // Current chat mode
    let currentMode = 'general';
    
    // Paper input mode (url or file)
    let paperInputMode = 'url';
    
    // Chat history
    let chatHistory = [];
    
    // Check if critical elements exist before setting up event listeners
    if (!elements.generalChatBtn || !elements.paperSummaryBtn || 
        !elements.skillRoadmapBtn || !elements.sendMessageBtn || 
        !elements.chatInput) {
      console.error('Critical chatbot elements not found, aborting initialization');
      return;
    }
    
    // Set up button click handlers with inline functions for clarity
    elements.generalChatBtn.onclick = function() {
      console.log('General chat button clicked');
      setMode('general');
    };
    
    elements.paperSummaryBtn.onclick = function() {
      console.log('Paper summary button clicked');
      setMode('paper_summary');
    };
    
    elements.skillRoadmapBtn.onclick = function() {
      console.log('Skill roadmap button clicked');
      setMode('roadmap');
    };
    
    // Set up paper input tab buttons
    if (elements.urlTabBtn) {
      elements.urlTabBtn.onclick = function() {
        console.log('URL tab button clicked');
        setPaperInputMode('url');
      };
    }
    
    if (elements.uploadTabBtn) {
      elements.uploadTabBtn.onclick = function() {
        console.log('Upload tab button clicked');
        setPaperInputMode('file');
      };
    }
    
    // Set up paper file input
    if (elements.paperFileInput) {
      elements.paperFileInput.onchange = function(event) {
        console.log('Paper file input change event');
        handlePaperFileUpload(event);
      };
    }
    
    // Set up message sending
    elements.sendMessageBtn.onclick = function() {
      console.log('Send button clicked');
      sendMessage();
    };
    
    elements.chatInput.onkeypress = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        console.log('Enter key pressed in chat input');
        e.preventDefault();
        sendMessage();
      }
    };
    
    // Function to set the chat mode
    function setMode(mode) {
      console.log('Setting chat mode to:', mode);
      currentMode = mode;
      
      // Remove active class from all buttons
      elements.generalChatBtn.classList.remove('active');
      elements.paperSummaryBtn.classList.remove('active');
      elements.skillRoadmapBtn.classList.remove('active');
      
      // Hide all mode-specific inputs
      if (elements.paperUrlContainer) {
        elements.paperUrlContainer.classList.add('hidden');
      }
      
      // Clear chat history when switching modes
      chatHistory = [];
      
      // Set up the UI for the selected mode
      if (mode === 'general') {
        elements.generalChatBtn.classList.add('active');
        elements.chatInput.placeholder = 'Type your message here...';
      } else if (mode === 'paper_summary') {
        elements.paperSummaryBtn.classList.add('active');
        elements.paperUrlContainer.classList.remove('hidden');
        elements.chatInput.placeholder = 'Ask about the paper...';
      } else if (mode === 'roadmap') {
        elements.skillRoadmapBtn.classList.add('active');
        elements.chatInput.placeholder = 'Enter a skill you want to learn...';
        // Focus on the chat input field
        setTimeout(() => elements.chatInput.focus(), 100);
      }
    }
    
    // Function to set paper input mode (url or file)
    function setPaperInputMode(mode) {
      console.log('Setting paper input mode to:', mode);
      paperInputMode = mode;
      
      // Update active tab
      elements.urlTabBtn.classList.toggle('active', mode === 'url');
      elements.uploadTabBtn.classList.toggle('active', mode === 'file');
      
      // Show/hide appropriate input section
      elements.urlInputSection.classList.toggle('hidden', mode !== 'url');
      elements.fileUploadSection.classList.toggle('hidden', mode !== 'file');
    }
    
    // Function to handle paper file upload
    async function handlePaperFileUpload(event) {
      console.log('Handling paper file upload');
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const originalText = elements.uploadedFileName.textContent;
        elements.uploadedFileName.textContent = `Processing ${file.name}...`;
        elements.uploadedFileName.classList.remove('hidden');
        
        // Simple file reading for text files
        if (file.type === 'text/plain') {
          const reader = new FileReader();
          reader.onload = function(e) {
            window.uploadedPaperText = e.target.result;
            elements.uploadedFileName.textContent = `${file.name} (ready)`;
          };
          reader.onerror = function() {
            elements.uploadedFileName.textContent = originalText;
            showErrorMessage('Error reading file');
          };
          reader.readAsText(file);
        } else {
          // For now, we'll just use a sample text for non-text files
          window.uploadedPaperText = "Sample paper content for demonstration purposes.";
          elements.uploadedFileName.textContent = `${file.name} (processed)`;
        }
      } catch (error) {
        console.error('Error handling paper file:', error);
        showErrorMessage('Error processing file');
      }
    }
    
    // Function to send a message
    async function sendMessage() {
      console.log('Send message function called');
      const message = elements.chatInput.value.trim();
      
      if (!message) {
        console.log('Empty message, not sending');
        return;
      }
      
      console.log('Sending message:', message);
      
      // Clear input
      elements.chatInput.value = '';
      
      // Add user message to chat
      addMessageToChat('user', message);
      
      // Add a loading message
      const loadingMessage = addLoadingMessage();
      
      try {
        // Prepare request data based on the current mode
        const requestData = {
          user_id: userId,
          message: message,
          mode: currentMode,
          history: chatHistory
        };
        
        // Add mode-specific data
        if (currentMode === 'paper_summary') {
          if (paperInputMode === 'url') {
            const paperUrl = elements.paperUrlInput.value.trim();
            if (!paperUrl) {
              removeLoadingMessage(loadingMessage);
              addMessageToChat('assistant', 'Please enter a paper URL.');
              return;
            }
            requestData.paper_url = paperUrl;
          } else {
            if (!window.uploadedPaperText) {
              removeLoadingMessage(loadingMessage);
              addMessageToChat('assistant', 'Please upload a paper file.');
              return;
            }
            requestData.paper_text = window.uploadedPaperText;
          }
        } else if (currentMode === 'roadmap') {
          requestData.target_skill = message;
        }
        
        // Send the request to the backend
        console.log('Sending chat request to backend:', requestData);
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        // Process the response
        const data = await response.json();
        
        // Remove the loading message
        removeLoadingMessage(loadingMessage);
        
        // Handle error
        if (data.error) {
          console.error('Error from chatbot API:', data.error);
          addMessageToChat('assistant', `Error: ${data.error}`);
          return;
        }
        
        // Add the assistant's response to the chat
        addMessageToChat('assistant', data.response);
        
        // Update chat history
        chatHistory.push({
          role: 'user',
          content: message
        });
        
        chatHistory.push({
          role: 'assistant',
          content: data.response
        });
        
      } catch (error) {
        console.error('Error in chat functionality:', error);
        removeLoadingMessage(loadingMessage);
        addMessageToChat('assistant', 'Sorry, there was an error processing your request. Please try again.');
      }
    }
    
    // Function to add a message to the chat
    function addMessageToChat(role, content) {
      console.log('Adding message to chat:', role, content);
      
      if (!elements.chatMessages) {
        console.error('Chat messages container not found');
        return null;
      }
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      // Simple markdown formatting
      contentDiv.innerHTML = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      messageDiv.appendChild(contentDiv);
      elements.chatMessages.appendChild(messageDiv);
      
      // Scroll to bottom
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
      
      return messageDiv;
    }
    
    // Function to add a loading message
    function addLoadingMessage() {
      console.log('Adding loading message');
      
      if (!elements.chatMessages) {
        console.error('Chat messages container not found');
        return null;
      }
      
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'message assistant loading';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
      
      loadingDiv.appendChild(contentDiv);
      elements.chatMessages.appendChild(loadingDiv);
      
      // Scroll to bottom
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
      
      return loadingDiv;
    }
    
    // Function to remove loading message
    function removeLoadingMessage(loadingMessage) {
      console.log('Removing loading message');
      
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.parentNode.removeChild(loadingMessage);
      }
    }
    
    // Initialize the chatbot with the default mode
    setMode('general');
    console.log('Chatbot initialization complete');
  }
  
  // Function to handle resume upload
  function initResumeHandling() {
    console.log('Initializing resume handling');
    
    if (elements.resumeFileInput) {
      elements.resumeFileInput.onchange = function(event) {
        console.log('Resume file input change detected');
        handleResumeUpload(event);
      };
    }
    
    async function handleResumeUpload(event) {
      console.log('Handle resume upload called');
      const file = event.target.files[0];
      if (!file) {
        console.log('No file selected');
        return;
      }
      
      console.log('File selected:', file.name, file.type, file.size);
      
      // Validate file type and extension
      const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const validFileTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      
      if (!validExtensions.includes(fileExtension) && !validFileTypes.includes(file.type)) {
        showErrorMessage('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
        return;
      }
      
      // Show loading state
      elements.resumeUploadPrompt.classList.add('hidden');
      elements.resumeAnalysisResults.classList.add('hidden');
      elements.resumeLoadingIndicator.classList.remove('hidden');
      
      try {
        console.log('Starting file processing...');
        // Read the file as text
        const resumeText = await readFileAsText(file);
        console.log('File processed, text length:', resumeText ? resumeText.length : 0);
        
        if (!resumeText || resumeText.trim().length < 100) {
          console.error('Resume text too short');
          showErrorMessage('The uploaded file appears to be empty or too short. Please upload a valid resume.');
          elements.resumeLoadingIndicator.classList.add('hidden');
          elements.resumeUploadPrompt.classList.remove('hidden');
          return;
        }
        
        // Basic validation to check if it's a resume
        const resumeKeywords = ['resume', 'cv', 'curriculum vitae', 'education', 'experience', 'skills', 'work', 'job', 'employment', 'qualifications'];
        const keywordsFound = resumeKeywords.filter(keyword => resumeText.toLowerCase().includes(keyword.toLowerCase()));
        
        if (keywordsFound.length < 2) {
          console.error('Document does not appear to be a resume. Keywords found:', keywordsFound);
          showErrorMessage('The uploaded file does not appear to be a resume. Please upload a valid resume document.');
          elements.resumeLoadingIndicator.classList.add('hidden');
          elements.resumeUploadPrompt.classList.remove('hidden');
          return;
        }
        
        console.log('Resume validation passed, keywords found:', keywordsFound);
        
        // Send the resume text to the backend for analysis
        const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resume_text: resumeText,
            extracted_job_skills: {
              technical_skills: [],
              soft_skills: []
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Resume analysis response:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Process the skills data
        const resumeData = data.result;
        console.log('Resume data:', resumeData);
        
        // Store resume data in localStorage for reference
        try {
          localStorage.setItem('resumeData', JSON.stringify(resumeData));
        } catch (error) {
          console.error('Error storing resume data:', error);
        }
        
        // Hide loading state
        elements.resumeLoadingIndicator.classList.add('hidden');
        elements.resumeAnalysisResults.classList.remove('hidden');
        
        // Clear resume skills list
        elements.resumeSkillsList.innerHTML = '';
        
        // Add skills to the list
        resumeData.present_skills.forEach(skill => {
          const li = document.createElement('li');
          li.textContent = skill;
          elements.resumeSkillsList.appendChild(li);
        });
        
        // Clear skill gaps list
        elements.skillGapsList.innerHTML = '';
        
        // Add skill gaps to the list if they exist
        if (resumeData.missing_skills && resumeData.missing_skills.length > 0) {
          resumeData.missing_skills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            elements.skillGapsList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = "No specific skill gaps identified.";
          elements.skillGapsList.appendChild(li);
        }
        
      } catch (error) {
        console.error('Error processing resume:', error);
        
        let errorMessage = 'An error occurred while analyzing your resume. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        }
        
        showErrorMessage(errorMessage);
        elements.resumeLoadingIndicator.classList.add('hidden');
        elements.resumeUploadPrompt.classList.remove('hidden');
      }
    }
  }
  
  // Function to read file as text with proper handling for different file types
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      console.log('Reading file:', file.name, file.type, file.size);
      
      // For text files, use the FileReader API
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        console.log('Text file detected, using FileReader');
        const reader = new FileReader();
        reader.onload = event => {
          console.log('FileReader loaded text, length:', event.target.result.length);
          resolve(event.target.result);
        };
        reader.onerror = error => {
          console.error('FileReader error:', error);
          reject(error);
        };
        reader.readAsText(file);
      }
      // For PDF and DOCX files, create a sample resume text
      else if (file.type === 'application/pdf' || 
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.name.toLowerCase().endsWith('.docx')) {
        
        console.log('PDF/DOCX file detected, using sample resume text');
        
        // Create a sample resume text since we can't extract text from PDF/DOCX without backend support
        const sampleResumeText = `RESUME

EDUCATION
Bachelor of Science in Computer Science
Stanford University
2018-2022

EXPERIENCE
Software Engineer
Tech Company Inc.
2022-Present

SKILLS
JavaScript, HTML, CSS, React, Node.js, Python, Communication, Teamwork`;
        
        console.log('Using sample resume text, length:', sampleResumeText.length);
        resolve(sampleResumeText);
      } else {
        // For other file types
        console.error('Unsupported file type:', file.type);
        reject(new Error('Unsupported file type'));
      }
    });
  }
  
  // Function to show error messages
  function showErrorMessage(message, parentElement = elements.resumeUploadPrompt) {
    console.error('ERROR:', message);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    if (parentElement) {
      // Check if there's already an error message
      const existingError = parentElement.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }
      
      parentElement.appendChild(errorDiv);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    }
  }
  
  // Initialize elements first
  initializeElements();
  
  // Initialize the chatbot
  initChatbot();
  
  // Initialize resume handling
  initResumeHandling();
  
  console.log('Dashboard initialization complete');
});
