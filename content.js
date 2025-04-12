// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extractJobDescription") {
    try {
      // Extract job data from the current page
      const jobData = extractJobData();
      sendResponse({jobData: jobData});
    } catch (error) {
      sendResponse({error: error.message});
    }
  }
  return true; // Required for async response
});

// Function to extract job data from the page
function extractJobData() {
  // Get the current URL
  const url = window.location.href;
  
  // Get the page title (often contains job title)
  const pageTitle = document.title;
  
  // Try to extract job title more specifically
  let jobTitle = pageTitle;
  
  // Try to extract company name
  let companyName = "";
  
  // Extract the job description directly as a fallback for Firecrawl
  let description = "";
  
  // Site-specific selectors for popular job sites
  if (url.includes("linkedin.com")) {
    // LinkedIn selectors
    const titleElement = document.querySelector(".job-details-jobs-unified-top-card__job-title");
    const companyElement = document.querySelector(".job-details-jobs-unified-top-card__company-name");
    const descriptionElement = document.querySelector(".jobs-description-content__text");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
    if (descriptionElement) description = descriptionElement.textContent.trim();
  } 
  else if (url.includes("indeed.com")) {
    // Indeed selectors
    const titleElement = document.querySelector(".jobsearch-JobInfoHeader-title");
    const companyElement = document.querySelector("[data-company-name]");
    const descriptionElement = document.querySelector("#jobDescriptionText");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
    if (descriptionElement) description = descriptionElement.textContent.trim();
  }
  else if (url.includes("glassdoor.com")) {
    // Glassdoor selectors
    const titleElement = document.querySelector(".job-title");
    const companyElement = document.querySelector(".employer-name");
    const descriptionElement = document.querySelector(".jobDescriptionContent");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
    if (descriptionElement) description = descriptionElement.textContent.trim();
  }
  else if (url.includes("deloitte.com")) {
    // Deloitte selectors
    const titleElement = document.querySelector("h1") || document.querySelector("h2");
    companyName = "Deloitte"; // Hardcoded since it's the Deloitte website
    
    // For Deloitte, try to get the main content
    const mainContent = document.querySelector("main") || 
                        document.querySelector(".content-wrapper") || 
                        document.querySelector(".article-content");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (mainContent) description = mainContent.innerText;
    
    // If we still don't have a description, get all paragraph content
    if (!description) {
      const paragraphs = Array.from(document.querySelectorAll("p"));
      description = paragraphs.map(p => p.innerText).join("\n\n");
    }
  }
  
  // If no specific description container found, get the main content
  if (!description) {
    // Try common content containers
    const descriptionElement = document.querySelector(".job-description") || 
                              document.querySelector("#job-description") ||
                              document.querySelector("[data-automation='jobDescriptionText']") ||
                              document.querySelector(".description__text") ||
                              document.querySelector("main") || 
                              document.querySelector("article") || 
                              document.querySelector(".content");
    
    if (descriptionElement) {
      description = descriptionElement.innerText;
    } else {
      // Last resort: get a portion of the body text
      const bodyText = document.body.innerText;
      // Take the first 5000 characters as a reasonable description size
      description = bodyText.substring(0, 5000);
    }
  }
  
  // Make sure we have at least some description
  if (!description || description.trim() === "") {
    // Absolute last resort: get visible text from the page
    description = getVisibleText(document.body);
  }
  
  // Return the extracted data
  return {
    url: url,
    title: jobTitle,
    company: companyName,
    description: description,
    useFirecrawl: true  // Still try Firecrawl first, but we have a fallback now
  };
}

// Helper function to get visible text from an element
function getVisibleText(element) {
  let text = "";
  
  // If this is a text node, get its text
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent.trim();
  }
  
  // Skip hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return "";
  }
  
  // Process child nodes
  for (let i = 0; i < element.childNodes.length; i++) {
    text += getVisibleText(element.childNodes[i]) + " ";
  }
  
  return text.trim();
}
