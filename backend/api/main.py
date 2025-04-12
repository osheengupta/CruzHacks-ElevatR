from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sys
import os
from firecrawl import FirecrawlApp
import os
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

# Add the parent directory to the path so we can import from agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.crew import JobSkillCrew

app = FastAPI(title="JobSkillTracker API")

# Add CORS middleware to allow requests from our Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, in production you'd restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the JobSkillCrew
job_skill_crew = JobSkillCrew()

# Initialize Firecrawl with API key from environment variables
firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY", "")
firecrawl_app = FirecrawlApp(api_key=firecrawl_api_key) if firecrawl_api_key else None

# Define request models
class JobDescription(BaseModel):
    url: str
    title: Optional[str] = ""
    company: Optional[str] = ""
    description: Optional[str] = ""  # Added back for fallback
    useFirecrawl: Optional[bool] = True

class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    extracted_job_skills: Dict[str, Any]

class ProjectRecommendationRequest(BaseModel):
    skill_gaps: List[Dict[str, Any]]
    current_skills: List[Dict[str, Any]]

# Define API endpoints
@app.post("/process-job")
async def process_job(job_data: JobDescription):
    """
    Process a job description using CrewAI.
    """
    try:
        # Initialize Firecrawl if API key is available
        firecrawl_app_local = None
        if os.environ.get("FIRECRAWL_API_KEY"):
            firecrawl_app_local = FirecrawlApp(api_key=os.environ.get("FIRECRAWL_API_KEY"))
            print(f"Firecrawl initialized with API key")
        else:
            print(f"Firecrawl API key not found in environment variables")

        job_description = job_data.description
        
        # Try to use Firecrawl if requested and available
        if job_data.useFirecrawl and firecrawl_app_local:
            try:
                print(f"Attempting to scrape URL with Firecrawl: {job_data.url}")
                # Use Firecrawl to get a clean version of the job page
                scrape_result = firecrawl_app_local.scrape_url(job_data.url, params={'formats': ['markdown', 'extract']})
                
                # Log the scrape result for debugging
                print(f"Firecrawl scrape result: {json.dumps(scrape_result, indent=2)}")
                
                if scrape_result.get('markdown'):
                    print(f"Using Firecrawl markdown content")
                    job_description = scrape_result['markdown']
                elif scrape_result.get('extract'):
                    print(f"Using Firecrawl extract content")
                    job_description = scrape_result['extract']
                else:
                    print(f"No usable content found in Firecrawl result, falling back to provided description")
                
                # Try to extract structured data if available
                if scrape_result.get('extract_result'):
                    extract_result = scrape_result['extract_result']
                    if extract_result.get('job_title'):
                        job_data.title = extract_result['job_title']
                        print(f"Updated job title from Firecrawl: {job_data.title}")
                    if extract_result.get('company_name'):
                        job_data.company = extract_result['company_name']
                        print(f"Updated company name from Firecrawl: {job_data.company}")
            except Exception as e:
                print(f"Error using Firecrawl: {str(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                print(f"Falling back to provided job description")
        else:
            if not job_data.useFirecrawl:
                print(f"Firecrawl not requested by client")
            elif not firecrawl_app_local:
                print(f"Firecrawl not available (API key missing)")
        
        # Ensure we have a job description to work with
        if not job_description or len(job_description.strip()) < 10:
            print(f"Job description is too short or empty, using fallback text")
            job_description = f"Job title: {job_data.title}, Company: {job_data.company}"
        
        # Limit the job description length to prevent overwhelming the LLM
        max_length = 8000
        if len(job_description) > max_length:
            print(f"Job description too long ({len(job_description)} chars), truncating to {max_length} chars")
            job_description = job_description[:max_length]
        
        print(f"Processing job description with CrewAI (length: {len(job_description)} chars)")
        
        # Process with CrewAI
        try:
            result = job_skill_crew.process_job_description(job_description)
            
            # Convert CrewOutput to a dictionary if needed
            if hasattr(result, 'raw_output'):
                # If it's a CrewOutput object with raw_output attribute
                result_dict = result.raw_output
            elif hasattr(result, '__dict__'):
                # If it has a __dict__ attribute, convert it to a dictionary
                result_dict = result.__dict__
            elif isinstance(result, str):
                # If it's a string, try to parse it as JSON
                try:
                    result_dict = json.loads(result)
                except json.JSONDecodeError:
                    result_dict = {"raw_text": result}
            else:
                # Otherwise, just use the result as is
                result_dict = result
                
            print(f"CrewAI result (processed): {json.dumps(result_dict, indent=2) if isinstance(result_dict, dict) else str(result_dict)}")
            return {"result": result_dict}
        except Exception as e:
            print(f"Error processing with CrewAI: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error processing with CrewAI: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/analyze-resume")
async def analyze_resume(request: ResumeAnalysisRequest):
    """
    Analyze a resume against job requirements.
    """
    try:
        result = job_skill_crew.analyze_resume(
            request.resume_text, 
            request.extracted_job_skills
        )
        # Parse the result if it's a string
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                pass
        return {"result": result}
    except Exception as e:
        print("❌ Error in analyze_resume endpoint:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-projects")
async def recommend_projects(request: ProjectRecommendationRequest):
    """
    Recommend projects based on skill gaps.
    """
    try:
        result = job_skill_crew.recommend_projects(
            request.skill_gaps,
            request.current_skills
        )
        # Parse the result if it's a string
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                pass
        return {"result": result}
    except Exception as e:
        print("❌ Error in recommend_projects endpoint:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
