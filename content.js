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
  
  // Site-specific selectors for popular job sites
  if (url.includes("linkedin.com")) {
    // LinkedIn selectors
    const titleElement = document.querySelector(".job-details-jobs-unified-top-card__job-title");
    const companyElement = document.querySelector(".job-details-jobs-unified-top-card__company-name");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
  } 
  else if (url.includes("indeed.com")) {
    // Indeed selectors
    const titleElement = document.querySelector(".jobsearch-JobInfoHeader-title");
    const companyElement = document.querySelector("[data-company-name]");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
  }
  else if (url.includes("glassdoor.com")) {
    // Glassdoor selectors
    const titleElement = document.querySelector(".job-title");
    const companyElement = document.querySelector(".employer-name");
    
    if (titleElement) jobTitle = titleElement.textContent.trim();
    if (companyElement) companyName = companyElement.textContent.trim();
  }
  
  // Extract the full job description
  // First try to find a specific job description container
  let descriptionElement = document.querySelector(".job-description") || 
                          document.querySelector("#job-description") ||
                          document.querySelector("[data-automation='jobDescriptionText']") ||
                          document.querySelector(".description__text");
  
  // If no specific container found, get the main content
  if (!descriptionElement) {
    // Try common content containers
    descriptionElement = document.querySelector("main") || 
                        document.querySelector("article") || 
                        document.querySelector(".content") ||
                        document.body; // Fallback to body if nothing else found
  }
  
  const description = descriptionElement ? descriptionElement.innerText : document.body.innerText;
  
  // Return the extracted data
  return {
    url: url,
    title: jobTitle,
    company: companyName,
    description: description
  };
}
