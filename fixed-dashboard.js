// Dashboard.js - Fixed version with working buttons
document.addEventListener('DOMContentLoaded', function() {
  console.log('Fixed Dashboard script loaded');
  
  // API URL for backend - FIXED: Using correct port
  const API_BASE_URL = "http://localhost:8001";
  
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
      console.warn(`Element with ID "${id}" not found`);
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
    elements.modalSkillsList = getElement('modalSkillsList');
    elements.modalResponsibilitiesList = getElement('modalResponsibilitiesList');
    elements.closeModal = document.querySelector('.close-modal');
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
      console.log(`${id}: ${elements[id] ? 'Found' : 'NOT FOUND'}`);
    });
  }
  
  // Initialize elements first
  initializeElements();
  
  // Debug: Check for saved jobs in storage
  try {
    // Try Chrome storage API first
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['savedJobs'], function(result) {
        console.log('Saved jobs from Chrome storage:', result.savedJobs);
        if (result.savedJobs && result.savedJobs.length > 0) {
          console.log(`Found ${result.savedJobs.length} jobs in Chrome storage`);
        } else {
          console.log('No saved jobs found in Chrome storage');
        }
      });
    } else {
      // Try localStorage as fallback
      const savedJobsStr = localStorage.getItem('savedJobs');
      const savedJobs = savedJobsStr ? JSON.parse(savedJobsStr) : [];
      console.log('Saved jobs from localStorage:', savedJobs);
      if (savedJobs.length > 0) {
        console.log(`Found ${savedJobs.length} jobs in localStorage`);
      } else {
        console.log('No saved jobs found in localStorage');
      }
    }
  } catch (error) {
    console.error('Error checking saved jobs:', error);
  }
  
  // Initialize the chatbot
  function initChatbot() {
    console.log('Initializing AI chatbot');
    
    // Initialize chat state
    let chatMode = 'general';
    let paperInputMode = 'url';
    let chatHistory = [];
    let paperUrl = '';
    let paperText = '';
    let targetSkill = '';
    
    // Check if critical elements exist
    if (!elements.chatInput || !elements.sendMessageBtn) {
      console.error('Critical chat elements missing');
      return;
    }
    
    // Set up button click handlers with inline functions for clarity
    if (elements.generalChatBtn) {
      elements.generalChatBtn.onclick = function() {
        setMode('general');
      };
    }
    
    if (elements.paperSummaryBtn) {
      elements.paperSummaryBtn.onclick = function() {
        setMode('paper_summary');
      };
    }
    
    if (elements.skillRoadmapBtn) {
      elements.skillRoadmapBtn.onclick = function() {
        setMode('roadmap');
      };
    }
    
    // URL/Upload tab switching
    if (elements.urlTabBtn) {
      elements.urlTabBtn.onclick = function() {
        setPaperInputMode('url');
      };
    }
    
    if (elements.uploadTabBtn) {
      elements.uploadTabBtn.onclick = function() {
        setPaperInputMode('file');
      };
    }
    
    // Paper file upload handling
    if (elements.paperFileInput) {
      elements.paperFileInput.onchange = function(event) {
        handlePaperFileUpload(event);
      };
    }
    
    // Set up message sending
    if (elements.sendMessageBtn) {
      elements.sendMessageBtn.onclick = function() {
        sendMessage();
      };
    }
    
    if (elements.chatInput) {
      elements.chatInput.onkeypress = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };
    }
    
    // Function to set the chat mode
    function setMode(mode) {
      console.log(`Setting chat mode to: ${mode}`);
      chatMode = mode;
      
      // Reset paper-related state when changing modes
      paperUrl = '';
      paperText = '';
      targetSkill = '';
      
      // Update UI based on mode
      if (elements.generalChatBtn) elements.generalChatBtn.classList.toggle('active', mode === 'general');
      if (elements.paperSummaryBtn) elements.paperSummaryBtn.classList.toggle('active', mode === 'paper_summary');
      if (elements.skillRoadmapBtn) elements.skillRoadmapBtn.classList.toggle('active', mode === 'roadmap');
      
      // Show/hide paper URL input
      if (elements.paperUrlContainer) {
        elements.paperUrlContainer.classList.toggle('hidden', mode !== 'paper_summary');
      }
      
      // Add a system message indicating mode change
      let modeMessage = '';
      if (mode === 'general') {
        modeMessage = "I'm in general chat mode. Ask me anything about programming, technology, or learning resources!";
      } else if (mode === 'paper_summary') {
        modeMessage = "I'll help you summarize research papers. Please provide a URL to a paper or upload a PDF/DOCX file.";
      } else if (mode === 'roadmap') {
        modeMessage = "I'll create a learning roadmap for you. What skill would you like to learn?";
      }
      
      if (modeMessage) {
        addMessageToChat('assistant', modeMessage);
      }
    }
    
    // Function to set paper input mode (url or file)
    function setPaperInputMode(mode) {
      console.log(`Setting paper input mode to: ${mode}`);
      paperInputMode = mode;
      
      // Update UI
      if (elements.urlTabBtn) elements.urlTabBtn.classList.toggle('active', mode === 'url');
      if (elements.uploadTabBtn) elements.uploadTabBtn.classList.toggle('active', mode === 'file');
      if (elements.urlInputSection) elements.urlInputSection.classList.toggle('hidden', mode !== 'url');
      if (elements.fileUploadSection) elements.fileUploadSection.classList.toggle('hidden', mode !== 'file');
      
      // Reset state
      if (mode === 'url') {
        paperText = '';
        if (elements.paperUrlInput) elements.paperUrlInput.value = '';
      } else {
        paperUrl = '';
        if (elements.paperFileInput) elements.paperFileInput.value = '';
        if (elements.uploadedFileName) elements.uploadedFileName.classList.add('hidden');
      }
    }
    
    // Function to handle paper file upload
    function handlePaperFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      console.log(`Paper file selected: ${file.name}`);
      
      // Show file name
      if (elements.uploadedFileName) {
        elements.uploadedFileName.textContent = file.name;
        elements.uploadedFileName.classList.remove('hidden');
      }
      
      // Create a FormData object
      const formData = new FormData();
      formData.append('file', file);
      
      // Show loading state
      const loadingMessage = addLoadingMessage();
      
      // Upload the file
      fetch(`${API_BASE_URL}/upload-paper`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`File upload failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        removeLoadingMessage(loadingMessage);
        
        if (data.error) {
          addMessageToChat('assistant', `Error: ${data.error}`);
          return;
        }
        
        paperText = data.text;
        addMessageToChat('assistant', `I've processed your file "${file.name}". You can now ask me questions about it.`);
      })
      .catch(error => {
        console.error('Error uploading file:', error);
        removeLoadingMessage(loadingMessage);
        addMessageToChat('assistant', `Sorry, there was an error uploading your file: ${error.message}`);
      });
    }
    
    // Function to send a message
    function sendMessage() {
      if (!elements.chatInput) return;
      
      const messageText = elements.chatInput.value.trim();
      if (!messageText) return;
      
      console.log(`Sending message in ${chatMode} mode: ${messageText.substring(0, 30)}...`);
      
      // Clear input
      elements.chatInput.value = '';
      
      // Add user message to chat
      addMessageToChat('user', messageText);
      
      // Get paper URL if in paper_summary mode with URL input
      if (chatMode === 'paper_summary' && paperInputMode === 'url' && elements.paperUrlInput) {
        paperUrl = elements.paperUrlInput.value.trim();
      }
      
      // Prepare request data
      const requestData = {
        message: messageText,
        chat_history: chatHistory,
        mode: chatMode
      };
      
      // Add mode-specific data
      if (chatMode === 'paper_summary') {
        if (paperUrl) {
          requestData.paper_url = paperUrl;
        } else if (paperText) {
          requestData.paper_text = paperText;
        }
      } else if (chatMode === 'roadmap') {
        // If this is the first message in roadmap mode, it's the target skill
        if (!targetSkill) {
          targetSkill = messageText;
          requestData.target_skill = targetSkill;
        }
      }
      
      // Add message to history
      chatHistory.push({
        role: 'user',
        content: messageText
      });
      
      // Show loading indicator
      const loadingMessage = addLoadingMessage();
      
      // Send request to backend
      fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Remove loading indicator
        removeLoadingMessage(loadingMessage);
        
        // Handle response
        if (data.error) {
          addMessageToChat('assistant', `Error: ${data.error}`);
          return;
        }
        
        const responseText = data.response || 'I processed your request, but there was no text response.';
        
        // Add assistant message to chat
        addMessageToChat('assistant', responseText);
        
        // Add to chat history
        chatHistory.push({
          role: 'assistant',
          content: responseText
        });
        
        // Limit history size
        if (chatHistory.length > 20) {
          chatHistory = chatHistory.slice(chatHistory.length - 20);
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        removeLoadingMessage(loadingMessage);
        addMessageToChat('assistant', `Sorry, there was an error processing your request: ${error.message}`);
      });
    }
    
    // Function to add a message to the chat
    function addMessageToChat(role, content) {
      if (!elements.chatMessages) return;
      
      console.log(`Adding ${role} message: ${content.substring(0, 30)}...`);
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      // Process markdown-like content (basic support)
      let processedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      
      contentDiv.innerHTML = processedContent;
      messageDiv.appendChild(contentDiv);
      
      elements.chatMessages.appendChild(messageDiv);
      
      // Scroll to bottom
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
    
    // Function to add a loading message
    function addLoadingMessage() {
      if (!elements.chatMessages) return null;
      
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message assistant loading';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      const loadingDots = document.createElement('div');
      loadingDots.className = 'loading-dots';
      loadingDots.innerHTML = '<span></span><span></span><span></span>';
      
      contentDiv.appendChild(loadingDots);
      messageDiv.appendChild(contentDiv);
      
      elements.chatMessages.appendChild(messageDiv);
      
      // Scroll to bottom
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
      
      return messageDiv;
    }
    
    // Function to remove loading message
    function removeLoadingMessage(loadingMessage) {
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.parentNode.removeChild(loadingMessage);
      }
    }
  }
  
  // Function to handle resume upload
  function initResumeHandling() {
    console.log('Initializing resume handling');
    
    // Check if resume file input exists
    if (!elements.resumeFileInput) {
      console.error('Resume file input not found');
      return;
    }
    
    // Add event listener for file selection
    elements.resumeFileInput.onchange = function(event) {
      handleResumeUpload(event);
    };
    
    // Function to handle resume upload
    function handleResumeUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      console.log(`Resume file selected: ${file.name} (${file.type})`);
      
      // Check file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!validTypes.includes(file.type) && !['pdf', 'docx', 'txt'].includes(fileExtension)) {
        showErrorMessage('Please upload a PDF, DOCX, or TXT file.');
        return;
      }
      
      // Show loading state
      if (elements.resumeUploadPrompt && elements.resumeAnalysisResults) {
        elements.resumeUploadPrompt.classList.add('hidden');
        elements.resumeAnalysisResults.classList.add('hidden');
      }
      
      if (elements.resumeLoadingIndicator) {
        elements.resumeLoadingIndicator.classList.remove('hidden');
      }
      
      // First, extract text from the resume
      extractResumeText(file)
        .then(resumeText => {
          console.log(`Resume text extracted, length: ${resumeText.length} characters`);
          
          // Now analyze the resume
          return analyzeResume(resumeText);
        })
        .then(analysisResult => {
          console.log('Resume analysis complete');
          
          // Hide loading indicator
          if (elements.resumeLoadingIndicator) {
            elements.resumeLoadingIndicator.classList.add('hidden');
          }
          
          // Display results
          displayResumeAnalysis(analysisResult);
        })
        .catch(error => {
          console.error('Error processing resume:', error);
          
          // Hide loading indicator
          if (elements.resumeLoadingIndicator) {
            elements.resumeLoadingIndicator.classList.add('hidden');
          }
          
          // Show error message
          if (elements.resumeUploadPrompt) {
            elements.resumeUploadPrompt.classList.remove('hidden');
          }
          
          showErrorMessage(`Error processing resume: ${error.message}`);
        });
    }
    
    // Function to extract text from resume file
    function extractResumeText(file) {
      return new Promise((resolve, reject) => {
        console.log(`Extracting text from ${file.type} file`);
        
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', file);
        
        // Send the file to the backend for text extraction
        fetch(`${API_BASE_URL}/extract-resume-text`, {
          method: 'POST',
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Resume text extraction failed with status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (!data.text) {
            throw new Error('No text was extracted from the resume');
          }
          
          resolve(data.text);
        })
        .catch(error => {
          console.error('Error extracting resume text:', error);
          reject(error);
        });
      });
    }
    
    // Function to analyze resume
    function analyzeResume(resumeText) {
      return new Promise((resolve, reject) => {
        console.log('Analyzing resume...');
        
        // Get saved jobs to extract skills
        let extractedJobSkills = null;
        
        try {
          // Try to use localStorage since chrome extension API might not be available
          const savedJobsStr = localStorage.getItem('savedJobs');
          if (savedJobsStr) {
            const savedJobs = JSON.parse(savedJobsStr);
            if (savedJobs && savedJobs.length > 0) {
              // Extract skills from the most recent job
              const recentJob = savedJobs[0];
              if (recentJob.skills) {
                extractedJobSkills = {
                  technical_skills: recentJob.skills.filter(skill => 
                    !['communication', 'teamwork', 'leadership', 'problem solving', 'time management']
                      .includes(skill.toLowerCase())
                  ),
                  soft_skills: recentJob.skills.filter(skill => 
                    ['communication', 'teamwork', 'leadership', 'problem solving', 'time management']
                      .includes(skill.toLowerCase())
                  )
                };
              }
            }
          }
        } catch (error) {
          console.error('Error accessing localStorage for job skills:', error);
        }
        
        // Prepare request data
        const requestData = {
          resume_text: resumeText,
          extracted_job_skills: extractedJobSkills
        };
        
        // Send the resume text to the backend for analysis
        fetch(`${API_BASE_URL}/analyze-resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Resume analysis failed with status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (!data.result) {
            throw new Error('No analysis result was returned');
          }
          
          resolve(data.result);
        })
        .catch(error => {
          console.error('Error analyzing resume:', error);
          reject(error);
        });
      });
    }
    
    // Function to display resume analysis results
    function displayResumeAnalysis(analysis) {
      console.log('Displaying resume analysis:', analysis);
      
      if (!elements.resumeAnalysisResults || !elements.resumeSkillsList || !elements.skillGapsList) {
        console.error('Resume analysis display elements not found');
        return;
      }
      
      // Show results container
      elements.resumeAnalysisResults.classList.remove('hidden');
      
      // Clear previous results
      elements.resumeSkillsList.innerHTML = '';
      elements.skillGapsList.innerHTML = '';
      
      // Display present skills
      if (analysis.present_skills && analysis.present_skills.length > 0) {
        analysis.present_skills.forEach(skill => {
          const li = document.createElement('li');
          li.textContent = skill;
          elements.resumeSkillsList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No skills detected';
        elements.resumeSkillsList.appendChild(li);
      }
      
      // Display missing skills
      if (analysis.missing_skills && analysis.missing_skills.length > 0) {
        analysis.missing_skills.forEach(skill => {
          const li = document.createElement('li');
          li.textContent = skill;
          elements.skillGapsList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No skill gaps detected';
        elements.skillGapsList.appendChild(li);
      }
      
      // Store analysis for project recommendations
      localStorage.setItem('resumeAnalysis', JSON.stringify(analysis));
      
      // Enable analyze button if it exists
      if (elements.analyzeBtn) {
        elements.analyzeBtn.disabled = false;
      }
    }
  }
  
  // Function to read file as text with proper handling for different file types
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }
      
      console.log(`Reading file: ${file.name} (${file.type})`);
      
      // For text files, use FileReader directly
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        console.log('TXT file detected, using FileReader');
        
        const fileReader = new FileReader();
        fileReader.onload = function() {
          resolve(fileReader.result);
        };
        
        fileReader.onerror = function(error) {
          console.error('Error reading text file:', error);
          reject(error);
        };
        
        fileReader.readAsText(file);
      }
      // For PDF files, use backend extraction
      else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('PDF file detected, using backend extraction');
        
        // Use a promise-based approach
        const fileReader = new FileReader();
        fileReader.onload = function() {
          // Create a FormData to safely upload the file
          const formData = new FormData();
          formData.append('file', file);
          
          fetch(`${API_BASE_URL}/extract-resume-text`, {
            method: 'POST',
            body: formData
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`PDF extraction failed with status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('PDF text extracted, length:', data.text ? data.text.length : 0);
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (!data.text || data.text.trim().length < 100) {
              throw new Error('Extracted PDF text is too short or empty');
            }
            
            resolve(data.text);
          })
          .catch(error => {
            console.error('Error extracting PDF text:', error);
            reject(new Error('Failed to extract text from PDF: ' + error.message));
          });
        };
        
        fileReader.onerror = error => {
          console.error('Error reading PDF file:', error);
          reject(error);
        };
        
        // Just read as binary string to trigger the loading event
        fileReader.readAsBinaryString(file);
      }
      // For DOCX files, use similar direct upload approach as PDF
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.name.toLowerCase().endsWith('.docx')) {
        console.log('DOCX file detected, using direct FormData file upload');
        
        // Use a promise-based approach
        const fileReader = new FileReader();
        fileReader.onload = function() {
          // Create a FormData to safely upload the file
          const formData = new FormData();
          formData.append('file', file);
          
          fetch(`${API_BASE_URL}/extract-resume-text`, {
            method: 'POST',
            body: formData
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`DOCX extraction failed with status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('DOCX text extracted, length:', data.text ? data.text.length : 0);
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (!data.text || data.text.trim().length < 100) {
              throw new Error('Extracted DOCX text is too short or empty');
            }
            
            resolve(data.text);
          })
          .catch(error => {
            console.error('Error extracting DOCX text:', error);
            reject(new Error('Failed to extract text from DOCX: ' + error.message));
          });
        };
        
        fileReader.onerror = error => {
          console.error('Error reading DOCX file:', error);
          reject(error);
        };
        
        // Just read as binary string to trigger the loading event
        fileReader.readAsBinaryString(file);
      } else {
        // For other file types
        console.error('Unsupported file type:', file.type);
        reject(new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.'));
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
  
  // Function to initialize and display saved jobs
  function initSavedJobsDisplay() {
    console.log('Initializing saved jobs display');
    
    if (!elements.savedJobsList) {
      console.warn('Saved jobs list element not found');
      return;
    }
    
    // Function to display jobs
    function displayJobs(jobs) {
      console.log(`Displaying ${jobs.length} saved jobs`);
      
      // Clear current list
      elements.savedJobsList.innerHTML = '';
      
      if (jobs.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No jobs saved yet. Use the extension to save job descriptions.</p>';
        elements.savedJobsList.appendChild(emptyState);
        
        // Update stats
        if (elements.jobsSavedCount) elements.jobsSavedCount.textContent = '0';
        if (elements.uniqueSkillsCount) elements.uniqueSkillsCount.textContent = '0';
        if (elements.topSkill) elements.topSkill.textContent = '-';
        
        return;
      }
      
      // Update job count
      if (elements.jobsSavedCount) {
        elements.jobsSavedCount.textContent = jobs.length.toString();
      }
      
      // Calculate skill statistics
      const skillCounts = {};
      let totalSkills = 0;
      
      jobs.forEach(job => {
        if (job.skills && Array.isArray(job.skills)) {
          job.skills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            totalSkills++;
          });
        }
      });
      
      // Get unique skills count
      const uniqueSkillsCount = Object.keys(skillCounts).length;
      if (elements.uniqueSkillsCount) {
        elements.uniqueSkillsCount.textContent = uniqueSkillsCount.toString();
      }
      
      // Find top skill
      let topSkill = '-';
      let topCount = 0;
      
      Object.entries(skillCounts).forEach(([skill, count]) => {
        if (count > topCount) {
          topSkill = skill;
          topCount = count;
        }
      });
      
      if (elements.topSkill) {
        elements.topSkill.textContent = topSkill;
      }
      
      // Populate job roles filter
      if (elements.jobRoleFilter) {
        // Get unique roles
        const roles = [...new Set(jobs.map(job => job.title))].filter(Boolean);
        
        // Clear current options (keeping the "All Roles" option)
        while (elements.jobRoleFilter.options.length > 1) {
          elements.jobRoleFilter.remove(1);
        }
        
        // Add role options
        roles.forEach(role => {
          const option = document.createElement('option');
          option.value = role;
          option.textContent = role;
          elements.jobRoleFilter.appendChild(option);
        });
      }
      
      // Display each job
      jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.dataset.jobId = job.id || '';
        
        const title = document.createElement('h3');
        title.className = 'job-title';
        title.textContent = job.title || 'Untitled Position';
        
        const company = document.createElement('p');
        company.className = 'company-name';
        company.textContent = job.company || 'Unknown Company';
        
        const skillsContainer = document.createElement('div');
        skillsContainer.className = 'skills-preview';
        
        // Display up to 3 skills
        const skillsToShow = job.skills && job.skills.length > 0 
          ? job.skills.slice(0, 3) 
          : ['No skills listed'];
          
        skillsToShow.forEach(skill => {
          const skillBadge = document.createElement('span');
          skillBadge.className = 'skill-badge';
          skillBadge.textContent = skill;
          skillsContainer.appendChild(skillBadge);
        });
        
        // Add skill count if there are more
        if (job.skills && job.skills.length > 3) {
          const moreSkills = document.createElement('span');
          moreSkills.className = 'more-skills';
          moreSkills.textContent = `+${job.skills.length - 3} more`;
          skillsContainer.appendChild(moreSkills);
        }
        
        // Assemble job card
        jobCard.appendChild(title);
        jobCard.appendChild(company);
        jobCard.appendChild(skillsContainer);
        
        // Add click handler to show details
        jobCard.addEventListener('click', () => {
          showJobDetails(job);
        });
        
        elements.savedJobsList.appendChild(jobCard);
      });
      
      // Add search functionality
      if (elements.jobSearchInput) {
        elements.jobSearchInput.addEventListener('input', filterJobs);
      }
      
      // Add filter functionality
      if (elements.jobRoleFilter) {
        elements.jobRoleFilter.addEventListener('change', filterJobs);
      }
      
      // Function to filter jobs based on search and role filter
      function filterJobs() {
        const searchTerm = elements.jobSearchInput ? elements.jobSearchInput.value.toLowerCase() : '';
        const roleFilter = elements.jobRoleFilter ? elements.jobRoleFilter.value : '';
        
        const jobCards = elements.savedJobsList.querySelectorAll('.job-card');
        
        jobCards.forEach(card => {
          const job = jobs.find(j => j.id === card.dataset.jobId);
          if (!job) return;
          
          const titleMatch = job.title && job.title.toLowerCase().includes(searchTerm);
          const companyMatch = job.company && job.company.toLowerCase().includes(searchTerm);
          const skillsMatch = job.skills && job.skills.some(skill => 
            skill.toLowerCase().includes(searchTerm)
          );
          
          const matchesSearch = searchTerm === '' || titleMatch || companyMatch || skillsMatch;
          const matchesRole = roleFilter === '' || job.title === roleFilter;
          
          card.style.display = matchesSearch && matchesRole ? 'block' : 'none';
        });
      }
    }
    
    // Function to show job details in modal
    function showJobDetails(job) {
      if (!elements.jobModal) {
        console.warn('Job modal element not found');
        return;
      }
      
      // Populate modal with job details
      if (elements.modalJobTitle) {
        elements.modalJobTitle.textContent = job.title || 'Untitled Position';
      }
      
      if (elements.modalCompanyName) {
        elements.modalCompanyName.textContent = job.company || 'Unknown Company';
      }
      
      // Display skills
      if (elements.modalSkillsList) {
        elements.modalSkillsList.innerHTML = '';
        
        if (job.skills && job.skills.length > 0) {
          job.skills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            elements.modalSkillsList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = 'No skills listed';
          elements.modalSkillsList.appendChild(li);
        }
      }
      
      // Display responsibilities
      if (elements.modalResponsibilitiesList) {
        elements.modalResponsibilitiesList.innerHTML = '';
        
        if (job.responsibilities && job.responsibilities.length > 0) {
          job.responsibilities.forEach(resp => {
            const li = document.createElement('li');
            li.textContent = resp;
            elements.modalResponsibilitiesList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = 'No responsibilities listed';
          elements.modalResponsibilitiesList.appendChild(li);
        }
      }
      
      // Set up delete button
      if (elements.deleteJobBtn) {
        elements.deleteJobBtn.onclick = function() {
          deleteJob(job.id);
          elements.jobModal.style.display = 'none';
        };
      }
      
      // Set up close button
      if (elements.closeModal) {
        elements.closeModal.onclick = function() {
          elements.jobModal.style.display = 'none';
        };
      }
      
      // Show modal
      elements.jobModal.style.display = 'block';
      
      // Close modal when clicking outside
      window.onclick = function(event) {
        if (event.target === elements.jobModal) {
          elements.jobModal.style.display = 'none';
        }
      };
    }
    
    // Function to delete a job
    function deleteJob(jobId) {
      console.log(`Deleting job with ID: ${jobId}`);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Use Chrome storage API
        chrome.storage.local.get(['savedJobs'], function(result) {
          const savedJobs = result.savedJobs || [];
          const updatedJobs = savedJobs.filter(job => job.id !== jobId);
          
          chrome.storage.local.set({savedJobs: updatedJobs}, function() {
            console.log('Job deleted from Chrome storage');
            displayJobs(updatedJobs);
          });
        });
      } else {
        // Use localStorage as fallback
        try {
          const savedJobsStr = localStorage.getItem('savedJobs');
          const savedJobs = savedJobsStr ? JSON.parse(savedJobsStr) : [];
          const updatedJobs = savedJobs.filter(job => job.id !== jobId);
          
          localStorage.setItem('savedJobs', JSON.stringify(updatedJobs));
          console.log('Job deleted from localStorage');
          displayJobs(updatedJobs);
        } catch (error) {
          console.error('Error deleting job:', error);
        }
      }
    }
    
    // Load saved jobs from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Use Chrome storage API
      chrome.storage.local.get(['savedJobs'], function(result) {
        const savedJobs = result.savedJobs || [];
        console.log(`Loaded ${savedJobs.length} jobs from Chrome storage`);
        displayJobs(savedJobs);
      });
    } else {
      // Use localStorage as fallback
      try {
        const savedJobsStr = localStorage.getItem('savedJobs');
        const savedJobs = savedJobsStr ? JSON.parse(savedJobsStr) : [];
        console.log(`Loaded ${savedJobs.length} jobs from localStorage`);
        displayJobs(savedJobs);
      } catch (error) {
        console.error('Error loading saved jobs:', error);
        displayJobs([]);
      }
    }
  }
  
  // Initialize the chatbot
  initChatbot();
  
  // Initialize resume handling
  initResumeHandling();
  
  // Initialize saved jobs display
  initSavedJobsDisplay();
  
  console.log('Dashboard initialization complete');
});
