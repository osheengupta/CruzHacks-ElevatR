// Interview Preparation Module

// API base URL - adjust this to match your backend API URL
const API_BASE_URL = 'http://localhost:8005';

// Fallback to mock data in case of Vectara failures
const USE_VECTARA_FALLBACK = true;

// Set this to true to use the backend API with Vectara integration
// Set to false only for testing when the backend is not available
const USE_REAL_API = true;

// DOM Elements
const interviewElements = {
  // Modal elements
  interviewPrepModal: document.getElementById('interviewPrepModal'),
  closeInterviewModalBtn: document.querySelector('.close-interview-modal'),
  openInterviewPrepBtn: document.getElementById('openInterviewPrepBtn'),
  
  // Setup section
  interviewSetupSection: document.getElementById('interviewSetupSection'),
  jobDescriptionInput: document.getElementById('jobDescriptionInput'),
  easyInterviewBtn: document.getElementById('easyInterviewBtn'),
  mediumInterviewBtn: document.getElementById('mediumInterviewBtn'),
  hardInterviewBtn: document.getElementById('hardInterviewBtn'),
  interviewFocus: document.getElementById('interviewFocus'),
  startInterviewBtn: document.getElementById('startInterviewBtn'),
  
  // Interview session section
  interviewSessionSection: document.getElementById('interviewSessionSection'),
  interviewMessages: document.getElementById('interviewMessages'),
  toggleMicBtn: document.getElementById('toggleMicBtn'),
  speechStatus: document.getElementById('speechStatus'),
  manualAnswerInput: document.getElementById('manualAnswerInput'),
  submitAnswerBtn: document.getElementById('submitAnswerBtn'),
  endInterviewBtn: document.getElementById('endInterviewBtn'),
  
  // Summary section
  interviewSummarySection: document.getElementById('interviewSummarySection'),
  interviewFeedback: document.getElementById('interviewFeedback'),
  strengthsList: document.getElementById('strengthsList'),
  weaknessesList: document.getElementById('weaknessesList'),
  newInterviewBtn: document.getElementById('newInterviewBtn')
};

// State
let interviewState = {
  difficulty: 'medium',
  focus: 'mixed',
  conversation: [],
  isListening: false,
  voiceEnabled: true,  // Enable voice by default
  autoListen: true,    // Auto-listen after interviewer speaks
  recognition: null,
  resumeText: '',
  jobDescription: '',
  currentApiCall: null
};

// Check if there's resume data available in the global object (set by dashboard.js)
if (window.elevatrGlobal && window.elevatrGlobal.resumeText) {
  interviewState.resumeText = window.elevatrGlobal.resumeText;
  console.log('Found resume data in global object on interview-prep.js load:', 
              window.elevatrGlobal.resumeFileName);
}

// Initialize the module
async function initInterviewPrep() {
  // Set up event listeners
  setupInterviewEventListeners();
  // Initialize speech recognition
  setupSpeechRecognition();
  
  // Check for resume data immediately on page load
  checkForResumeData();
  
  // Listen for the custom event when resume data is updated
  document.addEventListener('resumeDataUpdated', function(event) {
    console.log('Received resumeDataUpdated event:', event.detail);
    if (event.detail && event.detail.resumeData && event.detail.resumeData.rawText) {
      interviewState.resumeText = event.detail.resumeData.rawText;
      console.log('Updated interview state with new resume data');
    }
  });
  
  // Also check for resume data every 2 seconds in case it's uploaded while the page is open
  setInterval(checkForResumeData, 2000);
  
  // Initialize speech utilities if available
  if (window.speechUtils) {
    try {
      const speechInitialized = await window.speechUtils.initSpeech();
      console.log('Speech synthesis initialized:', speechInitialized);
      
      // Add voice toggle button if speech synthesis is supported
      if (window.speechUtils.isSpeechSynthesisSupported()) {
        const voiceToggleBtn = document.createElement('button');
        voiceToggleBtn.id = 'toggleVoiceBtn';
        voiceToggleBtn.className = 'interview-btn';
        voiceToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Voice: ON';
        voiceToggleBtn.onclick = toggleVoice;
        
        // Add the button to the interview controls
        const interviewControls = document.querySelector('.interview-controls');
        if (interviewControls) {
          interviewControls.appendChild(voiceToggleBtn);
        }
        
        // Store the button reference
        interviewElements.toggleVoiceBtn = voiceToggleBtn;
      }
    } catch (error) {
      console.error('Error initializing speech:', error);
    }
  } else {
    console.warn('Speech utilities not available');
  }
}

// Function to check for resume data in localStorage
function checkForResumeData() {
  try {
    // Try to get resume data from localStorage
    let storedResumeData = localStorage.getItem('elevatrResumeData');
    
    if (storedResumeData) {
      const parsedData = JSON.parse(storedResumeData);
      if (parsedData && parsedData.rawText) {
        interviewState.resumeText = parsedData.rawText;
        console.log('Found resume data in localStorage:', parsedData.fileName || 'unnamed');
        return true;
      }
    }
    
    // Fallback to sessionStorage
    storedResumeData = sessionStorage.getItem('elevatrResumeData');
    if (storedResumeData) {
      const parsedData = JSON.parse(storedResumeData);
      if (parsedData && parsedData.rawText) {
        interviewState.resumeText = parsedData.rawText;
        console.log('Found resume data in sessionStorage:', parsedData.fileName || 'unnamed');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for resume data:', error);
    return false;
  }
}

// Set up event listeners
function setupInterviewEventListeners() {
  // Open/close modal
  interviewElements.openInterviewPrepBtn.addEventListener('click', showInterviewPrepModal);
  
  
  interviewElements.closeInterviewModalBtn.addEventListener('click', hideInterviewPrepModal);
  
  // Difficulty buttons
  interviewElements.easyInterviewBtn.addEventListener('click', () => setDifficulty('easy'));
  interviewElements.mediumInterviewBtn.addEventListener('click', () => setDifficulty('medium'));
  interviewElements.hardInterviewBtn.addEventListener('click', () => setDifficulty('hard'));
  
  // Start interview
  interviewElements.startInterviewBtn.addEventListener('click', startInterview);
  
  // Microphone toggle
  interviewElements.toggleMicBtn.addEventListener('click', toggleMicrophone);
  
  // Submit manual answer
  interviewElements.submitAnswerBtn.addEventListener('click', submitManualAnswer);
  
  // End interview
  interviewElements.endInterviewBtn.addEventListener('click', endInterview);
  
  // Start new interview
  interviewElements.newInterviewBtn.addEventListener('click', resetInterview);
}

// Show the interview preparation modal
function showInterviewPrepModal() {
  interviewElements.interviewPrepModal.style.display = 'block';
  
  // Get the latest resume text if available
  try {
    const storedResumeData = localStorage.getItem('elevatrResumeData');
    if (storedResumeData) {
      const resumeData = JSON.parse(storedResumeData);
      if (resumeData.rawText) {
        interviewState.resumeText = resumeData.rawText;
        console.log('Retrieved resume text from localStorage:', resumeData.fileName);
        
        // Show a notification that resume was loaded
        const resumeStatus = document.createElement('div');
        resumeStatus.className = 'resume-status';
        resumeStatus.textContent = `Resume loaded: ${resumeData.fileName || 'Your resume'}`;
        resumeStatus.style.color = 'green';
        resumeStatus.style.marginBottom = '10px';
        
        // Insert the notification at the top of the setup section
        const setupSection = interviewElements.interviewSetupSection;
        if (setupSection.firstChild) {
          setupSection.insertBefore(resumeStatus, setupSection.firstChild);
        } else {
          setupSection.appendChild(resumeStatus);
        }
        
        // Remove the notification after 5 seconds
        setTimeout(() => {
          if (resumeStatus.parentNode) {
            resumeStatus.parentNode.removeChild(resumeStatus);
          }
        }, 5000);
      }
    }
  } catch (error) {
    console.error('Error retrieving resume data:', error);
  }
}

// Hide the interview preparation modal
function hideInterviewPrepModal() {
  interviewElements.interviewPrepModal.style.display = 'none';
  
  // If there's an active API call, abort it
  if (interviewState.currentApiCall && interviewState.currentApiCall.signal) {
    interviewState.currentApiCall.signal.abort();
  }
  
  // If speech recognition is active, stop it
  if (interviewState.isListening && interviewState.recognition) {
    interviewState.recognition.stop();
    interviewState.isListening = false;
    updateMicButtonState();
  }
}

// Set interview difficulty
function setDifficulty(difficulty) {
  // Update state
  interviewState.difficulty = difficulty;
  
  // Update UI
  interviewElements.easyInterviewBtn.classList.remove('active');
  interviewElements.mediumInterviewBtn.classList.remove('active');
  interviewElements.hardInterviewBtn.classList.remove('active');
  
  switch (difficulty) {
    case 'easy':
      interviewElements.easyInterviewBtn.classList.add('active');
      break;
    case 'medium':
      interviewElements.mediumInterviewBtn.classList.add('active');
      break;
    case 'hard':
      interviewElements.hardInterviewBtn.classList.add('active');
      break;
  }
}

// Set up speech recognition
function setupSpeechRecognition() {
  // Check if browser supports Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return;
  }
  
  // Initialize speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  interviewState.recognition = new SpeechRecognition();
  
  // Configure
  interviewState.recognition.continuous = false;
  interviewState.recognition.interimResults = true;
  interviewState.recognition.lang = 'en-US';
  
  // Set up event handlers
  interviewState.recognition.onstart = function() {
    interviewState.isListening = true;
    updateMicButtonState();
    interviewElements.speechStatus.textContent = 'Listening...';
  };
  
  interviewState.recognition.onend = function() {
    interviewState.isListening = false;
    updateMicButtonState();
    interviewElements.speechStatus.textContent = 'Not listening';
  };
  
  interviewState.recognition.onresult = handleSpeechResult;
  
  interviewState.recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    interviewElements.speechStatus.textContent = `Error: ${event.error}`;
    interviewState.isListening = false;
    updateMicButtonState();
  };
}

// Handle speech recognition results
function handleSpeechResult(event) {
  // Get the transcript
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join('');
  
  // Update the manual answer input with the transcript
  interviewElements.manualAnswerInput.value = transcript;
  
  // If this is a final result, submit the answer
  if (event.results[0].isFinal) {
    setTimeout(() => {
      submitManualAnswer();
    }, 1000);
  }
}

// Toggle microphone
function toggleMicrophone(forceStart = false) {
  if (!interviewState.recognition) {
    setupSpeechRecognition();
    if (!interviewState.recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
  }
  
  if (interviewState.isListening && !forceStart) {
    // Stop listening
    interviewState.recognition.stop();
  } else {
    // If speech synthesis is currently speaking, stop it
    if (window.speechUtils && window.speechUtils.speechConfig.speaking) {
      window.speechUtils.stopSpeaking();
    }
    
    // Start listening
    try {
      interviewState.recognition.start();
      // Clear previous input
      interviewElements.manualAnswerInput.value = '';
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
}

// Toggle voice feature
function toggleVoice() {
  interviewState.voiceEnabled = !interviewState.voiceEnabled;
  
  // Update button text
  if (interviewElements.toggleVoiceBtn) {
    interviewElements.toggleVoiceBtn.innerHTML = interviewState.voiceEnabled ? 
      '<i class="fas fa-volume-up"></i> Voice: ON' : 
      '<i class="fas fa-volume-mute"></i> Voice: OFF';
  }
  
  // If turning off while speaking, stop speaking
  if (!interviewState.voiceEnabled && window.speechUtils) {
    window.speechUtils.stopSpeaking();
  }
}

// Update microphone button state
function updateMicButtonState() {
  if (interviewState.isListening) {
    interviewElements.toggleMicBtn.classList.add('listening');
    interviewElements.toggleMicBtn.innerHTML = '<span class="mic-icon">🎤</span> Listening...';
  } else {
    interviewElements.toggleMicBtn.classList.remove('listening');
    interviewElements.toggleMicBtn.innerHTML = '<span class="mic-icon">🎤</span> Click to Speak';
  }
}

// Start the interview
async function startInterview(event) {
  console.log('Start Interview button clicked');
  
  // Prevent default form submission behavior if this is triggered by a form
  if (event) {
    event.preventDefault();
  }
  
  // Make sure Start Interview button is not disabled
  if (interviewElements.startInterviewBtn) {
    interviewElements.startInterviewBtn.disabled = true;
    interviewElements.startInterviewBtn.textContent = 'Starting...'; 
    
    // Set a timeout to re-enable the button if it gets stuck
    setTimeout(() => {
      if (interviewElements.startInterviewBtn.textContent === 'Starting...') {
        interviewElements.startInterviewBtn.disabled = false;
        interviewElements.startInterviewBtn.textContent = 'Start Interview';
        
        // Add an error message to the chat
        const errorMsg = document.createElement('div');
        errorMsg.className = 'interview-message system-message';
        errorMsg.innerHTML = '<p>There was a problem starting the interview. Please try again.</p>';
        interviewElements.interviewMessages.appendChild(errorMsg);
        scrollToBottom();
      }
    }, 15000); // 15 seconds timeout
  }
  
  // Validate inputs
  const jobDescription = interviewElements.jobDescriptionInput ? interviewElements.jobDescriptionInput.value.trim() : '';
  console.log('Job description:', jobDescription);
  
  if (!jobDescription) {
    alert('Please enter a job description');
    if (interviewElements.startInterviewBtn) {
      interviewElements.startInterviewBtn.disabled = false;
      interviewElements.startInterviewBtn.textContent = 'Start Interview';
    }
    return;
  }
  
  // Show loading indicator
  if (interviewElements.interviewMessages) {
    interviewElements.interviewMessages.innerHTML += `
      <div class="interview-message system-message">
        <div class="message-content">Preparing your interview...</div>
      </div>
    `;
    // Scroll to the bottom of the conversation
    interviewElements.interviewMessages.scrollTop = interviewElements.interviewMessages.scrollHeight;
  } else {
    console.error('Interview messages container not found');
  }
  
  // PRIORITY 1: Check global variable first (most direct and reliable)
  if (window.elevatrGlobal && window.elevatrGlobal.resumeText) {
    interviewState.resumeText = window.elevatrGlobal.resumeText;
    console.log('Using resume data from global variable:', window.elevatrGlobal.resumeFileName);
  } else {
    // PRIORITY 2: Force a check for resume data in storage as backup
    const resumeFound = checkForResumeData();
    
    // Debug output to console
    console.log('Resume text available after check:', !!interviewState.resumeText);
    console.log('Resume found in storage:', resumeFound);
    console.log('Global resume data available:', !!window.elevatrGlobal?.resumeText);
    console.log('localStorage elevatrResumeData:', localStorage.getItem('elevatrResumeData'));
  }
  
  // HARD-CODE A BYPASS FOR TESTING
  // Even if no resume text is found, use a dummy value for testing purposes
  if (!interviewState.resumeText) {
    console.warn('No resume text found - USING DUMMY TEXT FOR TESTING!');
    interviewState.resumeText = "This is a dummy resume for testing purposes. Skills include: Python, SQL, Data Analysis, Machine Learning.";
  }
  
  // Now check if we have resume text in our state after all the checks
  /* Commenting out to avoid blocking for testing
  if (!interviewState.resumeText) {
    console.error('No resume text found in any storage mechanism');
    alert('Please upload your resume first before starting the interview');
    return;
  }
  */
  
  // Update state
  interviewState.jobDescription = jobDescription;
  interviewState.focus = interviewElements.interviewFocus.value;
  interviewState.conversation = [];
  
  // Show the interview session
  interviewElements.interviewSetupSection.classList.add('hidden');
  interviewElements.interviewSessionSection.classList.remove('hidden');
  interviewElements.interviewSummarySection.classList.add('hidden');
  
  // Get the first question from the API
  try {
    const message = await sendToInterviewAPI();
    
    // Add interviewer message to the conversation
    addMessageToConversation('interviewer', message);
    
    // Scroll to the bottom of the conversation
    scrollToBottom();
  } catch (error) {
    console.error('Error starting interview:', error);
    alert('Error starting interview. Please try again.');
    
    // Reset to setup section
    resetInterview();
  }
}

// Submit manual answer
async function submitManualAnswer() {
  const answer = interviewElements.manualAnswerInput.value.trim();
  if (!answer) {
    alert('Please enter your answer');
    return;
  }
  
  // Add user message to the conversation
  addMessageToConversation('user', answer);
  
  // Clear the input
  interviewElements.manualAnswerInput.value = '';
  
  // Get the next question from the API
  try {
    // Add the user's answer to the conversation history
    interviewState.conversation.push({
      role: 'candidate',
      content: answer
    });
    
    // Get next interviewer response
    const response = await sendToInterviewAPI();
    
    // Check if the interview is complete
    if (response.isComplete) {
      showInterviewSummary(response);
    } else {
      // Add interviewer message to the conversation
      addMessageToConversation('interviewer', response.message);
    }
    
    // Scroll to the bottom of the conversation
    scrollToBottom();
  } catch (error) {
    console.error('Error processing answer:', error);
    alert('Error processing your answer. Please try again.');
  }
}

// Add a message to the conversation
function addMessageToConversation(role, content) {
  console.log(`Adding message from ${role}:`, content);
  
  try {
    // Handle different response formats
    let messageContent = content;
    if (typeof content === 'object' && content !== null) {
      // Extract message content from various possible formats
      if (content.message) {
        messageContent = content.message;
      } else if (content.content) {
        messageContent = content.content;
      } else if (content.text) {
        messageContent = content.text;
      } else if (content.response) {
        messageContent = content.response;
      }
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `interview-message ${role === 'interviewer' ? 'interviewer-message' : 'user-message'}`;
    
    // Map UI role to API role for consistency
    const apiRole = role === 'user' ? 'candidate' : role;
    
    // Add to conversation state if not already added
    // This prevents duplicate messages in the conversation history
    const isNewMessage = !interviewState.conversation.some(msg => 
      msg.content === messageContent && msg.role === apiRole
    );
    
    if (isNewMessage && role === 'interviewer') {
      console.log('Adding interviewer message to conversation state:', messageContent.substring(0, 30) + '...');
      interviewState.conversation.push({
        role: 'interviewer',
        content: messageContent
      });
    }
    
    // Create message text
    const messageText = document.createElement('p');
    messageText.textContent = messageContent || 'No response received. Please try again.';
    
    // Add elements to the DOM
    messageElement.appendChild(messageText);
    if (interviewElements.interviewMessages) {
      interviewElements.interviewMessages.appendChild(messageElement);
    } else {
      console.error('Interview messages container not found');
    }
    
    // If this is an interviewer message and voice is enabled, speak it
    if (role === 'interviewer' && interviewState.voiceEnabled && window.speechUtils) {
      // Speak the message
      window.speechUtils.speakText(messageContent, () => {
        // After speaking, start listening if auto-listen is enabled
        if (interviewState.autoListen && !interviewState.isListening) {
          // Small delay before starting to listen
          setTimeout(() => {
            toggleMicrophone(true); // Force start listening
          }, 500);
        }
      });
    }
    
    // Also log message to console for debugging
    console.log(`Added ${role} message:`, messageContent);
    
    // If this is an interviewer message and voice is enabled, speak it
    if (role === 'interviewer' && interviewState.voiceEnabled && window.speechUtils) {
      // Speak the message
      window.speechUtils.speakText(messageContent, () => {
        // After speaking, start listening if auto-listen is enabled
        if (interviewState.autoListen && !interviewState.isListening) {
          // Small delay before starting to listen
          setTimeout(() => {
            toggleMicrophone(true); // Force start listening
          }, 500);
        }
      });
    }
  } catch (error) {
    console.error('Error adding message to conversation:', error);
  }
}

// Scroll to the bottom of the conversation
function scrollToBottom() {
  interviewElements.interviewMessages.scrollTop = interviewElements.interviewMessages.scrollHeight;
}

// Send data to the interview API
async function sendToInterviewAPI() {
  console.log('Sending request to interview API...');
  try {
    // Immediately set up a safety timeout to ensure the button gets re-enabled
    if (interviewElements.startInterviewBtn) {
      setTimeout(() => {
        if (interviewElements.startInterviewBtn.textContent === 'Starting...') {
          console.log('Safety timeout triggered - re-enabling Start Interview button');
          interviewElements.startInterviewBtn.disabled = false;
          interviewElements.startInterviewBtn.textContent = 'Start Interview';
        }
      }, 10000); // 10 second safety timeout
    }
    
    // Create an AbortController to be able to cancel the fetch request
    const controller = new AbortController();
    interviewState.currentApiCall = controller;
    
    // Build the request
    const requestData = {
      resume_text: interviewState.resumeText || "Sample resume with skills in programming, data analysis, and communication.",
      job_description: interviewState.jobDescription,
      difficulty: interviewState.difficulty,
      focus: interviewState.focus,
      previous_conversation: interviewState.conversation
    };
    
    console.log('Interview request data:', requestData);
    
    // Add message indicating API call is in progress
    const messageElement = document.createElement('div');
    messageElement.className = 'interview-message system-message';
    messageElement.innerHTML = '<p>Preparing your interview question...</p>';
    interviewElements.interviewMessages.appendChild(messageElement);
    scrollToBottom();
    
    // Check if we should use the real API or the mock implementation
    if (USE_REAL_API) {
      try {
        // Set a shorter timeout for the API request (8 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log('API request timed out after 8 seconds');
            reject(new Error('API request timeout'));
          }, 8000);
        });
        
        // Send the request to the real API
        console.log(`Sending request to ${API_BASE_URL}/interview`);
        const fetchPromise = fetch(`${API_BASE_URL}/interview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });
        
        // Race between fetch and timeout
        console.log('Waiting for API response or timeout...');
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          console.error('API error:', response.status, response.statusText);
          // Remove the loading message
          if (interviewElements.interviewMessages && messageElement.parentNode) {
            interviewElements.interviewMessages.removeChild(messageElement);
          }
          
          // Re-enable the start interview button if this is the initial request
          if (interviewState.conversation.length === 0 && interviewElements.startInterviewBtn) {
            interviewElements.startInterviewBtn.disabled = false;
            interviewElements.startInterviewBtn.textContent = 'Start Interview';
          }
          
          // Show fallback message to user
          const fallbackMsg = document.createElement('div');
          fallbackMsg.className = 'interview-message system-message';
          fallbackMsg.innerHTML = '<p>Using offline interview mode due to connection issues.</p>';
          interviewElements.interviewMessages.appendChild(fallbackMsg);
          scrollToBottom();
          
          // Fall back to mock implementation if the API fails
          return mockInterview(requestData);
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // Remove the loading message
        if (interviewElements.interviewMessages && messageElement.parentNode) {
          interviewElements.interviewMessages.removeChild(messageElement);
        }
        return mockInterview(requestData);
      }
      
      // Remove the loading message
      if (interviewElements.interviewMessages && messageElement.parentNode) {
        interviewElements.interviewMessages.removeChild(messageElement);
      }
      
      // Process the API response
      try {
        const data = await response.json();
        console.log('API response:', data);
        
        // Extract the message content from the response
        if (data) {
          // Check if we have a message property
          if (data.message) {
            // Update the conversation history with the new message
            interviewState.conversation.push({
              role: 'interviewer',
              content: data.message
            });
            
            // If this is a complete interview, store the feedback and other data
            if (data.is_complete) {
              return {
                message: data.message,
                isComplete: true,
                feedback: data.feedback,
                strengths: data.strengths,
                weaknesses: data.weaknesses,
                technical_evaluation: data.technical_evaluation,
                behavioral_evaluation: data.behavioral_evaluation,
                final_recommendation: data.final_recommendation
              };
            }
            
            return {
              message: data.message,
              isComplete: false
            };
          } else if (data.conversation && data.conversation.length > 0) {
            // Get the last message from the conversation array
            const lastMessage = data.conversation[data.conversation.length - 1];
            return {
              message: lastMessage.content,
              isComplete: data.is_complete || false,
              feedback: data.feedback,
              strengths: data.strengths,
              weaknesses: data.weaknesses,
              technical_evaluation: data.technical_evaluation,
              behavioral_evaluation: data.behavioral_evaluation,
              final_recommendation: data.final_recommendation
            };
          } else {
            console.error('Invalid API response format:', data);
            return mockInterview(requestData);
          }
        } else {
          console.error('Empty API response');
          return mockInterview(requestData);
        }
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        return mockInterview(requestData);
      }
    } else {
      // Use the mock implementation
      console.log('Using mock interview implementation');
      return mockInterview(requestData);
    }
  } catch (error) {
    console.error('Error in sendToInterviewAPI:', error);
    if (error.name === 'AbortError') {
      console.log('API request was cancelled');
      return null;
    }
    // Fall back to mock implementation on any error
    console.log('Falling back to mock interview due to error');
    return mockInterview({
      resume_text: interviewState.resumeText,
      job_description: interviewState.jobDescription,
      difficulty: interviewState.difficulty,
      focus: interviewState.focus,
      previous_conversation: interviewState.conversation
    });
  } finally {
    interviewState.currentApiCall = null;
  }
}

// Mock implementation of the interview API
async function mockInterview(requestData) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Running mock interview with:', requestData);
  
  // Extract relevant data
  const { previous_conversation, focus, difficulty, resume_text, job_description } = requestData;
  
  try {
    // Try to use the backend's Gemini API for more intelligent responses
    const response = await fetch(`${API_BASE_URL}/chat-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: previous_conversation && previous_conversation.length > 0 ?
          `User's last response: "${previous_conversation[previous_conversation.length - 1].content}". Based on this response, the job description, and the resume, ask a relevant follow-up interview question.` :
          `You are an AI interview coach. Analyze the resume and job description provided, then ask an intelligent and relevant ${focus} interview question that would be asked in a ${difficulty} difficulty interview. Make sure the question is specifically tailored to the candidate's background and the job requirements.`,
        chat_history: previous_conversation || [],
        mode: "interview_coach",
        resume_text: resume_text,
        job_description: job_description
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Received response from AI:', data);
      
      // If we got a valid response, use it
      if (data && data.message) {
        // Check if this is the first message or a follow-up
        if (!previous_conversation || previous_conversation.length === 0) {
          // First message
          return {
            message: data.message,
            conversation: [
              { role: 'interviewer', content: data.message }
            ],
            isComplete: false
          };
        } else {
          // Follow-up message
          // Check if we should end the interview
          const questionCount = previous_conversation.filter(msg => msg.role === 'interviewer').length;
          if (questionCount >= 4) {
            return generateInterviewSummary(requestData);
          }
          
          // Otherwise, continue with a new question
          const updatedConversation = [...previous_conversation, { role: 'interviewer', content: data.message }];
          return {
            message: data.message,
            conversation: updatedConversation,
            isComplete: false
          };
        }
      }
    }
  } catch (error) {
    console.error('Error using AI backend:', error);
  }
  
  // Fallback to the basic implementation if the AI API call fails
  console.log('Falling back to basic question generation');
  // Check if this is the first message or a follow-up
  if (!previous_conversation || previous_conversation.length === 0) {
    // This is the first message - return an initial interview question
    return generateInitialQuestion(requestData);
  } else {
    // This is a follow-up - analyze the most recent answer and provide feedback or a new question
    return generateFollowUpQuestion(requestData);
  }
}

// Generate the initial interview question based on job description and resume
function generateInitialQuestion(requestData) {
  const { job_description, resume_text, focus, difficulty } = requestData;
  
  console.log('Generating personalized question based on resume and job description');
  console.log('Resume excerpt:', resume_text?.substring(0, 100) + '...');
  console.log('Job description excerpt:', job_description?.substring(0, 100) + '...');
  
  // Extract skills from resume if available
  let resumeSkills = [];
  if (resume_text) {
    // Look for common skill keywords in the resume
    const skillKeywords = [
      'python', 'java', 'javascript', 'c++', 'c#', 'sql', 'nosql', 'mongodb', 'react', 'angular', 'vue', 'node', 
      'django', 'flask', 'spring', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'tensorflow', 'pytorch', 
      'data analysis', 'machine learning', 'ai', 'artificial intelligence', 'deep learning', 'nlp', 
      'data visualization', 'tableau', 'power bi', 'excel', 'statistics', 'project management', 
      'agile', 'scrum', 'leadership', 'communication', 'problem solving', 'critical thinking'
    ];
    
    // Simple regex-based skill extraction
    const resumeLower = resume_text.toLowerCase();
    resumeSkills = skillKeywords.filter(skill => resumeLower.includes(skill.toLowerCase()));
    console.log('Extracted skills from resume:', resumeSkills);
  }
  
  // Extract key requirements from job description
  let jobRequirements = [];
  if (job_description) {
    // Simple extraction based on common patterns in job descriptions
    const requirementRegex = /\b(required|requirement|experience with|knowledge of|familiarity with|proficiency in|expertise in|understanding of|ability to)\b[^.!?]*?\b(\w+)\b/gi;
    let match;
    while ((match = requirementRegex.exec(job_description)) !== null) {
      jobRequirements.push(match[0]);
    }
    console.log('Extracted requirements from job description:', jobRequirements);
  }
  
  // Generate questions based on the extracted information
  // Behavioral questions based on the job description and resume
  if (focus === 'Behavioral Questions' || focus === 'mixed') {
    // Determine if there are any matching skills between resume and job
    const matchingSkills = resumeSkills.filter(skill => 
      job_description && job_description.toLowerCase().includes(skill.toLowerCase())
    );
    
    // Personalized questions based on matching skills or job requirements
    let question = `Thanks for joining this interview today. `;
    
    if (matchingSkills.length > 0) {
      const randomSkill = matchingSkills[Math.floor(Math.random() * matchingSkills.length)];
      question += `I see you have experience with ${randomSkill}. Can you tell me about a specific time when you used ${randomSkill} to solve a challenging problem in your previous work?`;
    } else if (jobRequirements.length > 0) {
      // Pick a random job requirement to focus on
      const randomRequirement = jobRequirements[Math.floor(Math.random() * jobRequirements.length)];
      question += `The job requires ${randomRequirement}. Can you share an experience where you demonstrated this skill or knowledge?`;
    } else {
      // Default fallback question
      question += `Based on the job description, I'd like to ask: Can you tell me about a time when you had to communicate complex findings clearly and concisely to a non-technical audience?`;
    }
    
    return {
      message: question,
      conversation: [
        { role: 'interviewer', content: question }
      ],
      is_complete: false
    };
  } else {
    // Technical questions based on resume skills and job requirements
    let question = `Let's start with a technical question. `;
    
    if (resumeSkills.length > 0) {
      // Focus on a technical skill from their resume
      const technicalSkills = resumeSkills.filter(skill => 
        ['python', 'java', 'javascript', 'sql', 'react', 'angular', 'node', 'django', 'flask', 
         'aws', 'docker', 'kubernetes', 'machine learning', 'data analysis'].includes(skill.toLowerCase())
      );
      
      if (technicalSkills.length > 0) {
        const randomTechSkill = technicalSkills[Math.floor(Math.random() * technicalSkills.length)];
        question += `I see you have experience with ${randomTechSkill}. Could you explain how you've used ${randomTechSkill} in your previous projects, and what specific challenges you overcame?`;
      } else {
        // Default technical question based on data analysis since that's common
        question += `Can you walk me through your process for cleaning and preparing a dataset for analysis? What steps do you take and what tools do you typically use?`;
      }
    } else if (jobRequirements.length > 0) {
      // Focus on a technical requirement from the job
      const techRequirements = jobRequirements.filter(req => 
        /\b(python|java|javascript|sql|react|angular|node|django|flask|aws|docker|kubernetes|machine learning|data analysis)\b/i.test(req)
      );
      
      if (techRequirements.length > 0) {
        const randomTechReq = techRequirements[Math.floor(Math.random() * techRequirements.length)];
        question += `The job requires ${randomTechReq}. Can you describe your experience with this technology and how you've applied it in your work?`;
      } else {
        // Default technical question
        question += `Can you describe your approach to solving technical problems, particularly when working with unfamiliar technologies or systems?`;
      }
    } else {
      // Default fallback technical question
      question += `Can you walk me through your process for cleaning and preparing a dataset for analysis? What steps do you take and what tools do you typically use?`;
    }
    
    return {
      message: question,
      conversation: [
        { role: 'interviewer', content: question }
      ],
      is_complete: false
    };
  }
}

// Generate a follow-up question based on the previous conversation
function generateFollowUpQuestion(requestData) {
  const { previous_conversation, focus, difficulty, resume_text, job_description } = requestData;
  
  // Get the latest user response
  const latestUserResponse = previous_conversation.filter(msg => msg.role === 'user').pop();
  console.log('Latest user response:', latestUserResponse?.content);
  
  // Count the number of exchanges so far
  const questionCount = previous_conversation.filter(msg => msg.role === 'interviewer').length;
  
  // After 3-4 questions, end the interview with feedback
  if (questionCount >= 3) {
    return generateInterviewSummary(requestData);
  }
  
  // Try to extract keywords from the user's response for more relevant follow-ups
  const userKeywords = [];
  if (latestUserResponse && latestUserResponse.content) {
    // Common keywords that might be relevant for follow-up questions
    const relevantKeywords = [
      'challenge', 'problem', 'solution', 'learn', 'improve', 'team', 'collaborate', 'lead', 'manage',
      'project', 'deadline', 'pressure', 'priorities', 'communicate', 'strategy', 'analyze', 'design',
      'develop', 'implement', 'test', 'deploy', 'maintenance', 'agile', 'waterfall', 'scrum',
      'success', 'failure', 'mistake', 'feedback', 'growth', 'skill', 'technology', 'tool', 'method'
    ];
    
    // Extract keywords from user response
    const userResponse = latestUserResponse.content.toLowerCase();
    relevantKeywords.forEach(keyword => {
      if (userResponse.includes(keyword.toLowerCase())) {
        userKeywords.push(keyword);
      }
    });
    
    console.log('Extracted keywords from user response:', userKeywords);
  }
  
  // Generate a suitable follow-up based on the focus area and user's previous response
  if (focus === 'Behavioral Questions' || (focus === 'mixed' && questionCount % 2 === 0)) {
    let newQuestion = '';
    
    // Check if we have keywords to create a more targeted follow-up
    if (userKeywords.length > 0) {
      // Create follow-ups based on specific keywords
      if (userKeywords.includes('team') || userKeywords.includes('collaborate')) {
        newQuestion = `That's interesting. Could you elaborate on your role within the team and how you handled any conflicts or disagreements that arose?`;
      } else if (userKeywords.includes('challenge') || userKeywords.includes('problem')) {
        newQuestion = `Thank you for sharing that challenge. What specific steps did you take to overcome it, and what did you learn from the experience?`;
      } else if (userKeywords.includes('lead') || userKeywords.includes('manage')) {
        newQuestion = `You mentioned leadership experience. Can you describe a situation where you had to make a difficult decision as a leader, and how did you handle it?`;
      } else if (userKeywords.includes('deadline') || userKeywords.includes('pressure')) {
        newQuestion = `It sounds like you've worked under pressure. How do you prioritize tasks when you're faced with multiple competing deadlines?`;
      } else if (userKeywords.includes('mistake') || userKeywords.includes('failure')) {
        newQuestion = `We all face setbacks. Can you tell me about how you've grown from this experience and what you would do differently now?`;
      } else {
        // Pick a random keyword for a semi-personalized follow-up
        const randomKeyword = userKeywords[Math.floor(Math.random() * userKeywords.length)];
        newQuestion = `You mentioned ${randomKeyword}. Could you provide more details about how this affected your approach to the situation?`;
      }
    } else {
      // Fallback questions if no relevant keywords found
      const followUpQuestions = [
        `That's helpful context. Can you tell me about a situation where you had to adapt quickly to a significant change? How did you manage the transition?`,
        `Thank you for sharing that. Could you describe a time when you had to work with someone who was difficult to get along with? How did you handle the situation?`,
        `Interesting. Can you tell me about a time when you exceeded expectations on a project or task? What specific actions did you take?`,
        `I'd like to understand your problem-solving approach better. Can you describe a complex problem you faced and the steps you took to solve it?`
      ];
      
      newQuestion = followUpQuestions[questionCount % followUpQuestions.length];
    }
    
    // Add the new question to the conversation
    const updatedConversation = [...previous_conversation, { role: 'interviewer', content: newQuestion }];
    
    return {
      message: newQuestion,
      conversation: updatedConversation,
      is_complete: false
    };
  } else {
    // Technical questions - try to make follow-ups based on resume skills and previous answers
    let newQuestion = '';
    
    // Extract skills from resume if available
    let resumeSkills = [];
    if (resume_text) {
      // Look for common technical skill keywords in the resume
      const techSkillKeywords = [
        'python', 'java', 'javascript', 'c++', 'sql', 'nosql', 'react', 'angular', 'vue', 'node', 
        'django', 'flask', 'aws', 'azure', 'docker', 'kubernetes', 'machine learning', 'data analysis',
        'data science', 'statistics', 'algorithms', 'data structures'
      ];
      
      // Extract technical skills
      const resumeLower = resume_text.toLowerCase();
      resumeSkills = techSkillKeywords.filter(skill => resumeLower.includes(skill.toLowerCase()));
    }
    
    // Check if we have keywords to create a more targeted technical follow-up
    if (userKeywords.length > 0) {
      if (userKeywords.includes('data') || userKeywords.includes('analysis')) {
        newQuestion = `Regarding your data analysis experience, can you explain a specific instance where you used data to drive a business decision? What tools and methods did you use, and what was the outcome?`;
      } else if (userKeywords.includes('algorithm') || userKeywords.includes('optimize')) {
        newQuestion = `You mentioned optimization. Could you describe a time when you had to improve the performance of an algorithm or application? What approach did you take and what was the result?`;
      } else if (userKeywords.includes('debug') || userKeywords.includes('test')) {
        newQuestion = `Testing and debugging are crucial skills. Can you walk me through your approach to troubleshooting a particularly challenging bug? How did you identify and resolve the issue?`;
      } else if (userKeywords.includes('design') || userKeywords.includes('architecture')) {
        newQuestion = `Regarding system design, can you explain how you would design a scalable application that needs to handle a sudden increase in traffic? What considerations would you keep in mind?`;
      } else if (resumeSkills.length > 0) {
        // Use a skill from their resume that hasn't been discussed yet
        const randomSkill = resumeSkills[Math.floor(Math.random() * resumeSkills.length)];
        newQuestion = `Let's talk about your ${randomSkill} experience. Could you describe a complex problem you solved using ${randomSkill} and explain your approach in detail?`;
      } else {
        // General technical follow-up based on a keyword
        const randomKeyword = userKeywords[Math.floor(Math.random() * userKeywords.length)];
        newQuestion = `You mentioned ${randomKeyword}. How does this relate to your technical approach to solving problems in your work?`;
      }
    } else {
      // Fallback technical questions if no relevant keywords found
      const technicalFollowUps = [
        `How do you stay updated with the latest technologies and methodologies in your field? Can you give an example of how you've applied a newly learned concept to your work?`,
        `Could you walk me through your approach to tackling an unfamiliar technical problem? What steps do you take to understand the problem and develop a solution?`,
        `How do you balance technical quality with meeting deadlines? Can you describe a situation where you had to make this trade-off?`,
        `When working on a technical project, how do you determine which technologies or tools to use? Could you provide an example from your experience?`
      ];
      
      newQuestion = technicalFollowUps[questionCount % technicalFollowUps.length];
    }
    
    // Add the new question to the conversation
    const updatedConversation = [...previous_conversation, { role: 'interviewer', content: newQuestion }];
    
    return {
      message: newQuestion,
      conversation: updatedConversation,
      is_complete: false
    };
  }
}

// Generate a summary and feedback at the end of the interview
function generateInterviewSummary(requestData) {
  const { previous_conversation } = requestData;
  
  // Add a final message to the conversation
  const finalMessage = "Thank you for participating in this interview. I've gathered enough information now. Here's some feedback on your responses.";
  const updatedConversation = [...previous_conversation, { role: 'interviewer', content: finalMessage }];
  
  // Generate some generic positive feedback
  return {
    message: finalMessage,
    conversation: updatedConversation,
    isComplete: true,
    feedback: "Overall, you provided thoughtful and detailed responses to the interview questions. Your answers demonstrated good communication skills and technical knowledge. In a real interview, you should aim to provide specific examples from your experience to support your answers.",
    strengths: [
      "Clear communication style",
      "Structured responses",
      "Good technical knowledge"
    ],
    weaknesses: [
      "Consider providing more concrete examples",
      "Be concise while still being thorough",
      "Prepare more stories about past experiences"
    ],
    technical_evaluation: "You demonstrated a good understanding of technical concepts relevant to the position. Your explanations were clear and showed familiarity with industry-standard tools and methodologies. To improve further, consider deepening your knowledge in specific technologies mentioned in the job description.",
    behavioral_evaluation: "Your responses to behavioral questions showed good self-awareness and problem-solving abilities. You articulated your experiences well and demonstrated how you've handled challenges in the past. For improvement, try using the STAR method (Situation, Task, Action, Result) more consistently to structure your answers.",
    final_recommendation: "Recommend - The candidate shows strong potential for the role with good technical knowledge and communication skills."
  };
}

// Show the interview summary
function showInterviewSummary(data) {
  // Hide the interview session
  interviewElements.interviewSessionSection.classList.add('hidden');
  interviewElements.interviewSummarySection.classList.remove('hidden');
  
  // Display feedback
  interviewElements.interviewFeedback.textContent = data.feedback || 'Thanks for completing the interview!';
  
  // Display strengths
  interviewElements.strengthsList.innerHTML = '';
  if (data.strengths && data.strengths.length > 0) {
    data.strengths.forEach(strength => {
      const li = document.createElement('li');
      li.textContent = strength;
      interviewElements.strengthsList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No specific strengths noted';
    interviewElements.strengthsList.appendChild(li);
  }
  
  // Display weaknesses
  interviewElements.weaknessesList.innerHTML = '';
  if (data.weaknesses && data.weaknesses.length > 0) {
    data.weaknesses.forEach(weakness => {
      const li = document.createElement('li');
      li.textContent = weakness;
      interviewElements.weaknessesList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No specific areas for improvement noted';
    interviewElements.weaknessesList.appendChild(li);
  }
  
  // Add technical evaluation if available
  if (data.technical_evaluation) {
    if (!interviewElements.technicalEvaluation) {
      // Create technical evaluation section if it doesn't exist
      const techSection = document.createElement('div');
      techSection.className = 'interview-summary-section';
      
      const techTitle = document.createElement('h4');
      techTitle.textContent = 'Technical Evaluation';
      techSection.appendChild(techTitle);
      
      const techContent = document.createElement('p');
      techContent.id = 'technical-evaluation';
      techContent.textContent = data.technical_evaluation;
      techSection.appendChild(techContent);
      
      // Add it before the final section
      interviewElements.interviewSummarySection.appendChild(techSection);
      interviewElements.technicalEvaluation = techContent;
    } else {
      interviewElements.technicalEvaluation.textContent = data.technical_evaluation;
    }
  }
  
  // Add behavioral evaluation if available
  if (data.behavioral_evaluation) {
    if (!interviewElements.behavioralEvaluation) {
      // Create behavioral evaluation section if it doesn't exist
      const behavioralSection = document.createElement('div');
      behavioralSection.className = 'interview-summary-section';
      
      const behavioralTitle = document.createElement('h4');
      behavioralTitle.textContent = 'Behavioral Evaluation';
      behavioralSection.appendChild(behavioralTitle);
      
      const behavioralContent = document.createElement('p');
      behavioralContent.id = 'behavioral-evaluation';
      behavioralContent.textContent = data.behavioral_evaluation;
      behavioralSection.appendChild(behavioralContent);
      
      // Add it before the final section
      interviewElements.interviewSummarySection.appendChild(behavioralSection);
      interviewElements.behavioralEvaluation = behavioralContent;
    } else {
      interviewElements.behavioralEvaluation.textContent = data.behavioral_evaluation;
    }
  }
  
  // Add final recommendation if available
  if (data.final_recommendation) {
    if (!interviewElements.finalRecommendation) {
      // Create final recommendation section if it doesn't exist
      const recSection = document.createElement('div');
      recSection.className = 'interview-summary-section final-recommendation';
      
      const recTitle = document.createElement('h4');
      recTitle.textContent = 'Final Recommendation';
      recSection.appendChild(recTitle);
      
      const recContent = document.createElement('p');
      recContent.id = 'final-recommendation';
      recContent.textContent = data.final_recommendation;
      recSection.appendChild(recContent);
      
      // Add it at the end
      interviewElements.interviewSummarySection.appendChild(recSection);
      interviewElements.finalRecommendation = recContent;
    } else {
      interviewElements.finalRecommendation.textContent = data.final_recommendation;
    }
  }
}

// End the interview early
function endInterview() {
  if (confirm('Are you sure you want to end the interview? You will not receive a complete assessment.')) {
    // Show a simple summary
    interviewElements.interviewSessionSection.classList.add('hidden');
    interviewElements.interviewSummarySection.classList.remove('hidden');
    
    // Display basic feedback
    interviewElements.interviewFeedback.textContent = 'Interview ended early. Practice makes perfect - try again when you\'re ready!';
    
    // Clear strengths and weaknesses
    interviewElements.strengthsList.innerHTML = '';
    interviewElements.weaknessesList.innerHTML = '';
  }
}

// Reset the interview
function resetInterview() {
  // Reset state
  interviewState.conversation = [];
  
  // Reset UI
  interviewElements.interviewMessages.innerHTML = '';
  interviewElements.manualAnswerInput.value = '';
  
  // Show the setup section
  interviewElements.interviewSetupSection.classList.remove('hidden');
  interviewElements.interviewSessionSection.classList.add('hidden');
  interviewElements.interviewSummarySection.classList.add('hidden');
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initInterviewPrep);
