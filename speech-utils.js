// Speech Utilities for ElevatR
// This module provides text-to-speech and speech recognition utilities

// Text-to-Speech Configuration
const speechConfig = {
  voice: null,          // Will be set during initialization
  pitch: 1.0,           // Default pitch
  rate: 1.0,            // Default rate
  volume: 1.0,          // Default volume
  voices: [],           // Available voices
  speaking: false,      // Flag to track if currently speaking
  preferredVoice: 'en-US',  // Preferred voice language
  interviewerVoice: null,   // Voice for the interviewer
  cancelSpeech: false   // Flag to cancel ongoing speech
};

// Initialize Text-to-Speech
function initSpeech() {
  return new Promise((resolve) => {
    // Get available voices
    speechConfig.voices = window.speechSynthesis.getVoices();
    
    // If voices are already available
    if (speechConfig.voices.length > 0) {
      setupVoices();
      resolve(true);
    } else {
      // Wait for voices to be loaded
      window.speechSynthesis.onvoiceschanged = () => {
        speechConfig.voices = window.speechSynthesis.getVoices();
        setupVoices();
        resolve(true);
      };
      
      // Fallback in case voices don't load
      setTimeout(() => {
        if (speechConfig.voices.length === 0) {
          console.warn('No voices available for speech synthesis');
          resolve(false);
        }
      }, 1000);
    }
  });
}

// Set up voices for the interview
function setupVoices() {
  // Filter for English voices
  const englishVoices = speechConfig.voices.filter(voice => 
    voice.lang.includes('en-') || voice.lang.includes('en_')
  );
  
  if (englishVoices.length > 0) {
    // Try to find a professional sounding voice for the interviewer
    // Prefer voices like "Google UK English Male" or similar professional voices
    const professionalVoices = englishVoices.filter(voice => 
      voice.name.includes('Male') && 
      (voice.name.includes('UK') || voice.name.includes('US'))
    );
    
    if (professionalVoices.length > 0) {
      speechConfig.interviewerVoice = professionalVoices[0];
    } else {
      // Fallback to any English voice
      speechConfig.interviewerVoice = englishVoices[0];
    }
    
    console.log(`Selected interviewer voice: ${speechConfig.interviewerVoice.name}`);
  } else {
    console.warn('No English voices found for speech synthesis');
  }
}

// Speak text with the interviewer voice
function speakText(text, onEndCallback = null) {
  return new Promise((resolve, reject) => {
    // Reset cancel flag
    speechConfig.cancelSpeech = false;
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      reject('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice and properties
    if (speechConfig.interviewerVoice) {
      utterance.voice = speechConfig.interviewerVoice;
    }
    
    utterance.pitch = speechConfig.pitch;
    utterance.rate = speechConfig.rate;
    utterance.volume = speechConfig.volume;
    
    // Set event handlers
    utterance.onstart = () => {
      speechConfig.speaking = true;
      console.log('Started speaking');
    };
    
    utterance.onend = () => {
      speechConfig.speaking = false;
      console.log('Finished speaking');
      if (onEndCallback && typeof onEndCallback === 'function') {
        onEndCallback();
      }
      resolve();
    };
    
    utterance.onerror = (event) => {
      speechConfig.speaking = false;
      console.error('Speech synthesis error:', event);
      reject(event);
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  });
}

// Stop speaking
function stopSpeaking() {
  speechConfig.cancelSpeech = true;
  window.speechSynthesis.cancel();
  speechConfig.speaking = false;
}

// Check if speech synthesis is supported
function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window;
}

// Check if speech recognition is supported
function isSpeechRecognitionSupported() {
  return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
}

// Export functions
window.speechUtils = {
  initSpeech,
  speakText,
  stopSpeaking,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
  speechConfig
};
