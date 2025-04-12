// Interview Preparation Module

// API base URL - adjust this to match your backend API URL
const API_BASE_URL = 'http://localhost:8001';

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
  recognition: null,
  resumeText: '',
  jobDescription: '',
  currentApiCall: null
};

// Initialize the module
function initInterviewPrep() {
  // Set up event listeners
  setupInterviewEventListeners();
  // Initialize speech recognition
  setupSpeechRecognition();
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
    const storedResumeData = localStorage.getItem('resumeData');
    if (storedResumeData) {
      const resumeData = JSON.parse(storedResumeData);
      if (resumeData.rawText) {
        interviewState.resumeText = resumeData.rawText;
        console.log('Retrieved resume text from localStorage');
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
function toggleMicrophone() {
  if (!interviewState.recognition) {
    setupSpeechRecognition();
    if (!interviewState.recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
  }
  
  if (interviewState.isListening) {
    // Stop listening
    interviewState.recognition.stop();
  } else {
    // Start listening
    interviewState.recognition.start();
    // Clear previous input
    interviewElements.manualAnswerInput.value = '';
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
async function startInterview() {
  // Validate inputs
  const jobDescription = interviewElements.jobDescriptionInput.value.trim();
  if (!jobDescription) {
    alert('Please enter a job description');
    return;
  }
  
  if (!interviewState.resumeText) {
    alert('Please upload your resume first before starting the interview');
    return;
  }
  
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
      role: 'user',
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
  const messageElement = document.createElement('div');
  messageElement.className = `interview-message ${role === 'interviewer' ? 'interviewer-message' : 'user-message'}`;
  
  const messageText = document.createElement('p');
  messageText.textContent = content;
  
  messageElement.appendChild(messageText);
  interviewElements.interviewMessages.appendChild(messageElement);
}

// Scroll to the bottom of the conversation
function scrollToBottom() {
  interviewElements.interviewMessages.scrollTop = interviewElements.interviewMessages.scrollHeight;
}

// Send data to the interview API
async function sendToInterviewAPI() {
  try {
    // Create an AbortController to be able to cancel the fetch request
    const controller = new AbortController();
    interviewState.currentApiCall = controller;
    
    // Build the request
    const requestData = {
      resume_text: interviewState.resumeText,
      job_description: interviewState.jobDescription,
      difficulty: interviewState.difficulty,
      focus: interviewState.focus,
      previous_conversation: interviewState.conversation
    };
    
    // Send the request
    const response = await fetch(`${API_BASE_URL}/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'API request failed');
    }
    
    const data = await response.json();
    
    // Update the conversation history
    interviewState.conversation = data.conversation;
    
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('API request was cancelled');
      return null;
    }
    throw error;
  } finally {
    interviewState.currentApiCall = null;
  }
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
