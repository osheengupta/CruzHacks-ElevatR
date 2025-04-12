from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sys
import os

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

# Define request models
class JobDescription(BaseModel):
    url: str
    title: str
    company: str
    description: str

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
    Process a job description to extract skills and requirements.
    """
    try:
        result = job_skill_crew.process_job_description(job_data.description)
        # Parse the result if it's a string (it might be JSON formatted)
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                # If it's not valid JSON, keep it as is
                pass
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
