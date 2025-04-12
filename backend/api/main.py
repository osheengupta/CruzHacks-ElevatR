from fastapi import FastAPI, HTTPException, Body, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sys
import os
import io
import PyPDF2
import docx
import openai
import requests
from bs4 import BeautifulSoup
import re
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to the path so we can import from agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.crew import JobSkillCrew

# Configure OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
    print("OpenAI API key configured successfully")
    # Set the client to use the API key
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    
    try:
        # Test the API connection
        models = client.models.list()
        print("Available OpenAI models:")
        for model in models.data[:5]:  # Just print the first few to avoid clutter
            print(f"- {model.id}")
        print("...")
    except Exception as e:
        print(f"Error listing OpenAI models: {str(e)}")
else:
    print("Warning: OPENAI_API_KEY not found in environment variables")
    client = None

# Configure Google Generative AI (Gemini) API
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Google Generative AI (Gemini) API key configured successfully")
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables")

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
    extracted_job_skills: Optional[Dict[str, List[str]]] = None
    
class SkillGoalsRequest(BaseModel):
    user_id: str  # Unique identifier for the user
    skill_goals: List[str]  # List of skills the user wants to acquire
    current_skills: List[str] = []  # Optional list of skills the user already has
    
class JobMatchRequest(BaseModel):
    user_id: str
    job_description: str
    job_title: str
    company: str
    url: str
    
class JobSearchRequest(BaseModel):
    user_id: str
    resume_text: str
    keywords: List[str] = []  # Optional additional keywords
    location: str = ""  # Optional location
    experience_level: str = ""  # Optional experience level

class ProjectRecommendationRequest(BaseModel):
    skill_gaps: List[Dict[str, Any]]
    current_skills: List[Dict[str, Any]]
    
class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[Dict[str, str]]] = []
    mode: Optional[str] = "general"  # general, paper_summary, roadmap
    paper_url: Optional[str] = None
    paper_text: Optional[str] = None
    target_skill: Optional[str] = None

# Define API endpoints
@app.post("/extract-job-skills")
async def extract_job_skills(request: dict = Body(...)):
    """
    Extract skills from a job description using AI.
    """
    try:
        job_description = request.get("job_description", "")
        job_title = request.get("job_title", "")
        company = request.get("company", "")
        
        if not job_description:
            return {"error": "Job description is required"}
        
        print(f"Extracting skills from job description for {job_title} at {company}")
        print(f"Description length: {len(job_description)} characters")
        
        # Use OpenAI API to extract skills if available
        if OPENAI_API_KEY and client:
            try:
                # Create prompt for skill extraction
                prompt = f"Extract all technical and soft skills from the following job description for {job_title} at {company}.\n\nJob Description:\n{job_description[:5000]}\n\nReturn ONLY a JSON array of strings with the skill names. For example: [\"JavaScript\", \"React\", \"Communication\", \"Problem Solving\"]\nDo not include any explanations, just the JSON array."
                
                # Generate response using OpenAI
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",  # Using GPT-3.5 for cost efficiency
                    messages=[
                        {"role": "system", "content": "You are a skilled job analyzer that extracts technical and soft skills from job descriptions. Return only a JSON array of skills without any explanation."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,  # Lower temperature for more consistent results
                    max_tokens=1000
                )
                
                # Extract the response text
                response_text = response.choices[0].message.content
                
                # Extract JSON array from response
                import re
                import json
                
                # Try to find a JSON array in the response
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                
                if json_match:
                    try:
                        skills_array = json.loads(json_match.group(0))
                        print(f"Extracted {len(skills_array)} skills")
                        return {"skills": skills_array}
                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON from response: {str(e)}")
                        print(f"Response text: {response_text}")
                        # Fall back to simple extraction
                        skills = re.findall(r'"([^"]+)"', response_text)
                        if skills:
                            print(f"Extracted {len(skills)} skills using regex")
                            return {"skills": skills}
                else:
                    print(f"No JSON array found in response: {response_text}")
                    # Try to extract skills using regex as fallback
                    skills = re.findall(r'"([^"]+)"', response_text)
                    if skills:
                        print(f"Extracted {len(skills)} skills using regex")
                        return {"skills": skills}
            except Exception as e:
                print(f"Error using OpenAI API for skill extraction: {str(e)}")
        
        # Fallback to rule-based extraction if AI fails or is not available
        skills = extract_skills_rule_based(job_description, job_title)
        print(f"Extracted {len(skills)} skills using rule-based approach")
        return {"skills": skills}
        
    except Exception as e:
        print(f"Unexpected error in skill extraction: {str(e)}")
        return {"error": f"Error extracting skills: {str(e)}"}

def extract_skills_rule_based(job_description, job_title):
    """
    Extract skills from job description using rule-based approach.
    This is a fallback method when AI extraction is not available.
    """
    # Common technical skills to look for
    tech_skills = [
        "Python", "JavaScript", "Java", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Go",
        "React", "Angular", "Vue.js", "Node.js", "Django", "Flask", "Spring", "ASP.NET",
        "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Oracle", "Firebase",
        "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "Git",
        "Machine Learning", "AI", "Data Science", "TensorFlow", "PyTorch", "NLP",
        "HTML", "CSS", "SASS", "LESS", "Bootstrap", "Tailwind CSS",
        "REST API", "GraphQL", "Microservices", "Serverless", "WebSockets",
        "Agile", "Scrum", "Kanban", "JIRA", "Confluence", "DevOps"
    ]
    
    # Common soft skills to look for
    soft_skills = [
        "Communication", "Teamwork", "Problem Solving", "Critical Thinking", "Adaptability",
        "Time Management", "Leadership", "Creativity", "Attention to Detail", "Collaboration",
        "Analytical Thinking", "Decision Making", "Emotional Intelligence", "Conflict Resolution",
        "Project Management", "Presentation Skills", "Negotiation", "Customer Service",
        "Interpersonal Skills", "Work Ethic", "Self-Motivation", "Organization"
    ]
    
    # Combine all skills to check
    all_skills = tech_skills + soft_skills
    
    # Convert job description to lowercase for case-insensitive matching
    job_desc_lower = job_description.lower()
    
    # Find skills mentioned in the job description
    found_skills = []
    for skill in all_skills:
        # Check for exact match or plural form
        if skill.lower() in job_desc_lower or f"{skill.lower()}s" in job_desc_lower:
            found_skills.append(skill)
    
    # If we found very few skills, add some based on the job title
    if len(found_skills) < 3:
        # Add skills based on job title keywords
        title_lower = job_title.lower()
        if "python" in title_lower or "data" in title_lower:
            found_skills.extend(["Python", "SQL", "Data Analysis"])
        elif "javascript" in title_lower or "frontend" in title_lower or "front-end" in title_lower:
            found_skills.extend(["JavaScript", "HTML", "CSS", "React"])
        elif "backend" in title_lower or "back-end" in title_lower:
            found_skills.extend(["Node.js", "SQL", "API Design"])
        elif "fullstack" in title_lower or "full-stack" in title_lower:
            found_skills.extend(["JavaScript", "HTML", "CSS", "Node.js", "SQL"])
        elif "devops" in title_lower or "cloud" in title_lower:
            found_skills.extend(["AWS", "Docker", "CI/CD", "Kubernetes"])
        elif "mobile" in title_lower or "android" in title_lower or "ios" in title_lower:
            found_skills.extend(["Mobile Development", "Swift", "Kotlin", "React Native"])
        elif "ui" in title_lower or "ux" in title_lower or "design" in title_lower:
            found_skills.extend(["UI/UX Design", "Figma", "Adobe XD", "Wireframing"])
        elif "product" in title_lower or "manager" in title_lower:
            found_skills.extend(["Product Management", "Agile", "Leadership", "Communication"])
        
        # Add some generic soft skills
        found_skills.extend(["Communication", "Problem Solving", "Teamwork"])
    
    # Remove duplicates and return
    return list(set(found_skills))

@app.post("/extract-resume-text")
async def extract_resume_text(file: UploadFile = File(...)):
    """
    Extract text from a resume file (PDF, DOCX, TXT).
    This endpoint is specifically optimized for resume text extraction.
    """
    try:
        print(f"Processing resume file: {file.filename}, content type: {file.content_type}")
        
        # Read file content
        try:
            content = await file.read()
            print(f"Successfully read file content, size: {len(content)} bytes")
        except Exception as e:
            print(f"Error reading file content: {str(e)}")
            return {"error": f"Error reading file: {str(e)}"}
        
        # Determine file extension
        file_extension = file.filename.split('.')[-1].lower()
        print(f"Resume file extension: {file_extension}")
        extracted_text = ""
        
        if file_extension == 'pdf':
            # Extract text from PDF with improved error handling for resumes
            try:
                print("Creating PDF reader...")
                pdf_file = io.BytesIO(content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                print(f"Resume PDF has {len(pdf_reader.pages)} pages")
                
                for page_num in range(len(pdf_reader.pages)):
                    try:
                        print(f"Processing page {page_num+1}...")
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        if page_text:
                            print(f"Extracted {len(page_text)} characters from page {page_num+1}")
                            extracted_text += page_text + "\n"
                        else:
                            print(f"Warning: No text extracted from resume page {page_num+1}")
                    except Exception as e:
                        print(f"Error extracting text from resume page {page_num+1}: {str(e)}")
                        continue
                        
                if not extracted_text.strip():
                    # If PyPDF2 failed to extract text, return an error
                    print("No text extracted from PDF")
                    return {"error": "Could not extract text from the PDF resume. Please try a different file format or ensure the PDF contains selectable text."}
            except Exception as e:
                print(f"Error processing resume PDF: {str(e)}")
                return {"error": f"Error processing PDF: {str(e)}"}
        
        elif file_extension == 'docx':
            # Extract text from DOCX
            try:
                doc = docx.Document(io.BytesIO(content))
                extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                print(f"Extracted {len(extracted_text)} characters from DOCX")
            except Exception as e:
                print(f"Error processing DOCX: {str(e)}")
                return {"error": f"Error processing DOCX: {str(e)}"}
        
        elif file_extension == 'txt':
            # Extract text from TXT
            try:
                extracted_text = content.decode('utf-8')
                print(f"Extracted {len(extracted_text)} characters from TXT using utf-8")
            except UnicodeDecodeError:
                try:
                    # Try with a different encoding if utf-8 fails
                    extracted_text = content.decode('latin-1')
                    print(f"Extracted {len(extracted_text)} characters from TXT using latin-1")
                except Exception as e:
                    print(f"Error decoding TXT file: {str(e)}")
                    return {"error": f"Error processing TXT file: {str(e)}"}
        
        else:
            return {"error": f"Unsupported file format: {file_extension}. Please upload a PDF, DOCX, or TXT file."}
        
        # Basic validation of extracted text
        if not extracted_text or len(extracted_text.strip()) < 50:
            print(f"Extracted text too short: {len(extracted_text.strip()) if extracted_text else 0} characters")
            return {"error": "The extracted text is too short or empty. Please ensure your resume contains extractable text."}
            
        # Print the first 100 characters of extracted text for debugging
        print(f"Extracted text (first 100 chars): {extracted_text[:100]}")
        
        # Return the extracted text
        # Log success message
        print(f"Successfully extracted {len(extracted_text)} characters from resume")
        return {"text": extracted_text}
    
    except Exception as e:
        print(f"Unexpected error processing resume file: {str(e)}")
        return {"error": f"Error processing file: {str(e)}"}

@app.post("/upload-paper")
async def upload_paper(file: UploadFile = File(...)):
    """
    Upload a research paper file (PDF, DOCX, TXT) and extract its text content.
    """
    try:
        print(f"Processing uploaded file: {file.filename}")
        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        print(f"File extension: {file_extension}")
        extracted_text = ""
        
        if file_extension == 'pdf':
            # Extract text from PDF with improved error handling
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                print(f"PDF has {len(pdf_reader.pages)} pages")
                
                for page_num in range(len(pdf_reader.pages)):
                    try:
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                        else:
                            print(f"Warning: No text extracted from page {page_num+1}")
                    except Exception as e:
                        print(f"Error extracting text from page {page_num+1}: {str(e)}")
                        continue
                        
                if not extracted_text.strip():
                    # If PyPDF2 failed to extract text, try a fallback method
                    print("Using fallback method for PDF text extraction")
                    # Save the PDF temporarily and use a different approach if needed
                    # This is a placeholder for a more robust extraction method
                    extracted_text = "The PDF content could not be fully extracted. Please provide a summary of what the paper is about in your message, and I'll help you analyze it based on your description."
            except Exception as e:
                print(f"Error processing PDF: {str(e)}")
                raise
        
        elif file_extension == 'docx':
            # Extract text from DOCX
            doc = docx.Document(io.BytesIO(content))
            extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        
        elif file_extension == 'txt':
            # Extract text from TXT
            extracted_text = content.decode('utf-8')
        
        else:
            return {"error": f"Unsupported file format: {file_extension}. Please upload a PDF, DOCX, or TXT file."}
        
        # Return the extracted text
        print(f"Extracted text length: {len(extracted_text)}")
        print(f"First 100 chars: {extracted_text[:100]}")
        return {"paper_text": extracted_text}
    
    except Exception as e:
        print(f"Error processing uploaded file: {str(e)}")
        return {"error": f"Error processing uploaded file: {str(e)}"}

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Chat with the AI assistant. Supports different modes:
    - general: General conversation and learning assistance
    - paper_summary: Summarize a research paper from a URL
    - roadmap: Create a learning roadmap for a specific skill
    """
    try:
        if not OPENAI_API_KEY or not client:
            return {"error": "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."}
        
        try:
            # Prepare chat history in OpenAI format if provided
            chat_history = []
            
            # Convert chat history to OpenAI format
            for msg in request.chat_history:
                if msg.get("role") in ["user", "assistant", "system"]:
                    chat_history.append({
                        "role": msg.get("role"),
                        "content": msg.get("content", "")
                    })
        except Exception as e:
            print(f"Error initializing OpenAI client: {str(e)}")
            return {"error": f"Error initializing OpenAI client: {str(e)}"}
        
        # We've already prepared the chat history in OpenAI format above
        
        # Prepare prompt based on the mode
        if request.mode == "paper_summary":
            if request.paper_url:
                prompt = f"""Please summarize the research paper at this URL: {request.paper_url}
                
                Provide a comprehensive summary including:
                1. Main research question or objective
                2. Methodology used
                3. Key findings and results
                4. Implications and conclusions
                5. Any limitations mentioned
                
                Make the summary accessible to a student who is trying to learn about this topic.
                
                User's message: {request.message}
                """
            elif request.paper_text:
                prompt = f"""Please summarize the following research paper text:
                
                {request.paper_text[:10000]}  # Limit text length to avoid token limits
                
                Provide a comprehensive summary including:
                1. Main research question or objective
                2. Methodology used
                3. Key findings and results
                4. Implications and conclusions
                5. Any limitations mentioned
                
                Make the summary accessible to a student who is trying to learn about this topic.
                
                User's message: {request.message}
                """
            else:
                return {"error": "For paper summary mode, either paper_url or paper_text must be provided."}
        elif request.mode == "roadmap" and request.target_skill:
            prompt = f"""Create a detailed learning roadmap for someone who wants to learn {request.target_skill}.
            
            Include:
            1. Prerequisites and foundational knowledge needed
            2. Step-by-step learning path from beginner to advanced
            3. Recommended resources (books, courses, tutorials, projects)
            4. Estimated time commitment for each stage
            5. How to practice and apply the skills
            6. How to measure progress and know when you've mastered each level
            
            User's message: {request.message}
            """
        else:  # general mode
            prompt = request.message
        
        # Prepare system and user prompts based on the mode
        if request.mode == "paper_summary":
            if request.paper_url:
                system_prompt = "You are a research assistant that specializes in summarizing academic papers in a way that's accessible to students."
                user_prompt = f"Please summarize the research paper at this URL: {request.paper_url}\n\nProvide a comprehensive summary including:\n1. Main research question or objective\n2. Methodology used\n3. Key findings and results\n4. Implications and conclusions\n5. Any limitations mentioned\n\nMake the summary accessible to a student who is trying to learn about this topic.\n\nUser's message: {request.message}"
            elif request.paper_text:
                system_prompt = "You are a research assistant that specializes in summarizing academic papers in a way that's accessible to students."
                user_prompt = f"Please summarize the following research paper text:\n\n{request.paper_text[:10000]}\n\nProvide a comprehensive summary including:\n1. Main research question or objective\n2. Methodology used\n3. Key findings and results\n4. Implications and conclusions\n5. Any limitations mentioned\n\nMake the summary accessible to a student who is trying to learn about this topic.\n\nUser's message: {request.message}"
            else:
                return {"error": "For paper summary mode, either paper_url or paper_text must be provided."}
        elif request.mode == "roadmap" and request.target_skill:
            system_prompt = "You are an educational expert who creates personalized learning roadmaps for students."
            user_prompt = f"Create a detailed learning roadmap for someone who wants to learn {request.target_skill}.\n\nInclude:\n1. Prerequisites and foundational knowledge needed\n2. Step-by-step learning path from beginner to advanced\n3. Recommended resources (books, courses, tutorials, projects)\n4. Estimated time commitment for each stage\n5. How to practice and apply the skills\n6. How to measure progress and know when you've mastered each level\n\nUser's message: {request.message}"
        else:
            # General chat mode
            system_prompt = "You are a helpful AI learning assistant. Provide clear, concise, and accurate information. Format your response using markdown for better readability when appropriate."
            user_prompt = request.message
        
        # Create messages array with system message, chat history, and current user message
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add chat history if available
        messages.extend(chat_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_prompt})
        
        # Generate response using OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Using GPT-3.5 for cost efficiency
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )
        
        # Return the response
        return {"response": response.choices[0].message.content}
    
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return {"error": f"Error processing request: {str(e)}"}

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
        # Print debug info about the received resume
        resume_length = len(request.resume_text) if request.resume_text else 0
        print(f"Received resume text with length: {resume_length}")
        if resume_length > 0:
            print(f"First 100 chars: {request.resume_text[:100]}")
        
        # Print debug info about the extracted job skills
        if request.extracted_job_skills:
            print(f"Received extracted job skills: {request.extracted_job_skills}")
        else:
            print("No extracted job skills received")
        
        # Basic validation for empty or very short text
        if not request.resume_text or len(request.resume_text.strip()) < 50:
            print("Resume validation failed: Empty or too short text")
            return {"error": "The uploaded document appears to be empty or too short. Please upload a valid resume."}
        
        # Validate if the document is a resume
        if not is_valid_resume(request.resume_text):
            print("Resume validation failed: Not a valid resume format")
            return {"error": "The uploaded document does not appear to be a valid resume. Please ensure your document contains sections like education, experience, and skills."}
        
        # Proceed with resume analysis using OpenAI directly
        print("Resume validation passed, proceeding with analysis using OpenAI")
        
        # Check if OpenAI API key is configured
        if not OPENAI_API_KEY or not client:
            print("OpenAI API key not configured")
            return {"error": "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."}
        
        # Create prompt for resume analysis with more detailed skill extraction instructions
        system_prompt = """
        You are an expert resume analyzer with years of experience in career counseling and technical recruiting.
        You excel at identifying both technical and soft skills from resumes and providing accurate skill gap analysis.
        Follow these guidelines meticulously:
        1. Identify ONLY REAL skills from the resume (programming languages, tools, methodologies, soft skills)
        2. Do NOT invent skills that aren't explicitly mentioned in the resume
        3. Be comprehensive but precise - extract skills that are clearly indicated
        4. For technical resumes, focus on programming languages, frameworks, tools, and technologies
        5. For missing skills, only list those that are in the job requirements but not in the resume
        """
        
        # Format the job skills as a comma-separated list
        job_skills = []
        if request.extracted_job_skills:
            try:
                # Extract skills from both technical and soft skills lists
                if 'technical_skills' in request.extracted_job_skills:
                    tech_skills = request.extracted_job_skills['technical_skills']
                    print(f"Technical skills: {tech_skills}")
                    if isinstance(tech_skills, list):
                        job_skills.extend(tech_skills)
                    else:
                        print(f"Warning: technical_skills is not a list: {type(tech_skills)}")
                
                if 'soft_skills' in request.extracted_job_skills:
                    soft_skills = request.extracted_job_skills['soft_skills']
                    print(f"Soft skills: {soft_skills}")
                    if isinstance(soft_skills, list):
                        job_skills.extend(soft_skills)
                    else:
                        print(f"Warning: soft_skills is not a list: {type(soft_skills)}")
            except Exception as e:
                print(f"Error processing job skills: {str(e)}")
                # Continue with empty job skills rather than failing
        
        # Check if any job skills were provided
        has_job_skills = len(job_skills) > 0
        job_skills_text = ", ".join(job_skills) if has_job_skills else "No specific job skills provided"
        print(f"Formatted job skills text: {job_skills_text}")
        
        # Force empty missing_skills if no job skills were provided
        force_empty_gaps = not has_job_skills
        
        # Extract some common skills via regex to help guide the AI
        import re
        
        # Look for programming languages and common technologies
        tech_pattern = r'\b(python|java|javascript|typescript|c\+\+|c#|ruby|php|swift|kotlin|go|rust|sql|html|css|react|angular|vue|node\.js|django|flask|spring|express|tensorflow|pytorch|docker|kubernetes|aws|azure|gcp|git)\b'
        found_tech = set(re.findall(tech_pattern, request.resume_text.lower()))
        
        # Look for soft skills
        soft_pattern = r'\b(leadership|communication|teamwork|problem.?solving|critical.?thinking|project.?management|time.?management|collaboration|adaptability|creativity)\b'
        found_soft = set(re.findall(soft_pattern, request.resume_text.lower()))
        
        # Combine the regex findings
        regex_skills = list(found_tech) + list(found_soft)
        regex_skills_text = ", ".join(regex_skills) if regex_skills else "No skills found via regex"
        print(f"Skills found via regex: {regex_skills_text}")
        
        user_prompt = f"""
        ## Resume Analysis Task
        
        Analyze the following resume carefully and extract ALL skills mentioned (technical and soft skills).
        Then compare these skills with the job requirements to identify gaps.
        
        ### Resume Text:
        ```
        {request.resume_text[:4000]}  # Limiting text to avoid token limits
        ```
        
        ### Job Skills Required:
        {job_skills_text}
        
        ### Skills Detected by Regex (for reference):
        {regex_skills_text}
        
        ### Instructions:
        1. Extract ALL explicit skills from the resume - do not invent skills that aren't mentioned
        2. For technical positions, focus on programming languages, frameworks, libraries, and tools
        3. Include soft skills only if explicitly mentioned in the resume
        4. BE ACCURATE - do not hallucinate skills that are not clearly indicated in the resume
        5. Compare extracted skills with job requirements to identify gaps
        
        ### Response Format:
        Provide a JSON response with the following structure:
        {{
            "present_skills": [List of actual skills found in the resume],
            "missing_skills": [List of required job skills not found in the resume],
            "recommendations": [3-5 specific recommendations to improve the resume]
        }}
        
        ### IMPORTANT NOTES:
        - If no specific job skills are provided, leave the missing_skills list EMPTY
        - DO NOT create artificial job requirements or skill gaps
        - DO NOT list any skills that are in the resume as missing skills
        - A skill should only appear in missing_skills if it is in job_skills_required AND NOT in the resume
        
        Return ONLY the JSON object without any additional text or explanations.
        """
        
        try:
            print("Making OpenAI API call...")
            # Generate response using OpenAI
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Using GPT-3.5 for cost efficiency
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent results
                max_tokens=1500
            )
            
            # Extract the response text
            result = response.choices[0].message.content
            print(f"Received OpenAI response, length: {len(result)}")
            print(f"First 100 chars of response: {result[:100]}")
            
            # Parse the result if it's a string
            if isinstance(result, str):
                try:
                    # Try to find JSON content in the response
                    # Sometimes the model adds explanatory text before/after the JSON
                    import re
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        result = json.loads(json_str)
                        print("Successfully parsed JSON result")
                    else:
                        # If no JSON pattern found, try parsing the whole string
                        result = json.loads(result)
                        print("Successfully parsed JSON result")
                except json.JSONDecodeError as e:
                    print(f"Failed to parse result as JSON: {str(e)}")
                    print(f"Raw result: {result}")
                    # If we can't parse as JSON, create a simple structure with the raw text
                    result = {
                        "present_skills": [], 
                        "missing_skills": [], 
                        "recommendations": ["Could not parse AI response. Please try again."],
                        "raw_response": result[:500]  # Include part of the raw response for debugging
                    }
        except Exception as e:
            print(f"Error in OpenAI API call: {str(e)}")
            return {"error": f"Error analyzing resume with AI service: {str(e)}"}
        
        return {"result": result}
    except Exception as e:
        print(f"Error in analyze_resume: {str(e)}")
        return {"error": f"Error analyzing resume: {str(e)}"}

def is_valid_resume(text: str) -> bool:
    """
    Check if the provided text appears to be a valid resume.
    
    A valid resume typically contains sections like:
    - Education
    - Experience/Work Experience/Professional Experience
    - Skills
    - Contact information
    
    This function validates whether a document looks like a resume without being too strict.
    Returns True if the text appears to be a resume, False otherwise.
    """
    # Check for minimum length
    if len(text.strip()) < 200:  # Reduced minimum length requirement
        print("Resume too short to be valid")
        return False
    
    # Convert text to lowercase for case-insensitive matching
    text_lower = text.lower()
    
    # Define resume section keywords with more inclusive patterns
    education_keywords = ['education', 'academic', 'university', 'college', 'degree', 'bachelor', 'master', 'phd', 'school']
    experience_keywords = ['experience', 'employment', 'work', 'professional', 'job', 'position', 'career', 'internship', 'project']
    skills_keywords = ['skills', 'technical', 'competencies', 'proficiencies', 'abilities', 'technologies', 'programming', 'software', 'tools']
    contact_keywords = ['email', 'phone', 'contact', 'address', 'linkedin', 'github', 'portfolio', '@', '.com']
    
    # Check for presence of key resume sections - more lenient matching
    has_education = any(keyword in text_lower for keyword in education_keywords)
    has_experience = any(keyword in text_lower for keyword in experience_keywords)
    has_skills = any(keyword in text_lower for keyword in skills_keywords)
    has_contact = any(keyword in text_lower for keyword in contact_keywords)
    
    # Count how many sections are present
    section_count = sum([has_education, has_experience, has_skills, has_contact])
    
    # Look for date patterns (common in resumes for education/experience timeframes)
    import re
    date_patterns = re.findall(r'\b(19|20)\d{2}\b', text)  # Years like 1990, 2020, etc.
    has_dates = len(date_patterns) >= 1  # Just need a single year mentioned
    
    # Look for common resume structural indicators
    has_bullets = '•' in text or '*' in text or '-' in text
    has_multiple_sections = len([line for line in text.split('\n') if line.strip()]) > 10
    
    print(f"Resume validation - Sections found: {section_count}, Keywords found:")
    print(f"  Education: {has_education}, Experience: {has_experience}, Skills: {has_skills}, Contact: {has_contact}")
    print(f"  Has dates: {has_dates}, Has bullets: {has_bullets}, Multiple sections: {has_multiple_sections}")
    
    # Much more lenient criteria for resume validation
    # This will catch most legitimate resumes without being too strict
    
    # Case 1: Has at least 2 of the main sections (education, experience, skills)
    main_sections = sum([has_education, has_experience, has_skills]) 
    if main_sections >= 2:
        return True
    
    # Case 2: Has at least 1 main section plus dates and contact information
    if main_sections >= 1 and has_dates and has_contact:
        return True
    
    # Case 3: Has typical resume structure (bullets, multiple lines, at least 1 section)
    if main_sections >= 1 and has_bullets and has_multiple_sections:
        return True
    
    # Case 4: Long enough text with dates and structured content
    if len(text.strip()) > 500 and has_dates and has_multiple_sections:
        return True
    
    # For debugging with real-world resumes that might be getting rejected
    print("Resume validation failed - adding debug bypass for testing")
    # TEMPORARY: For testing, return True for substantial documents
    if len(text.strip()) > 1000 and has_dates:
        print("Temporarily accepting document based on length and dates")
        return True
    
    # If none of the conditions are met, it's likely not a resume
    return False

# PDF Text Extraction Endpoint
class PDFExtractionRequest(BaseModel):
    pdf_base64: str

@app.post("/extract-pdf-text")
async def extract_pdf_text(request: PDFExtractionRequest):
    """
    Extract text from a PDF file (base64 encoded)
    """
    try:
        # Decode base64 string to bytes
        pdf_bytes = base64.b64decode(request.pdf_base64)
        
        # Create a file-like object for PyPDF2
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Extract text from PDF
        reader = PyPDF2.PdfReader(pdf_file)
        
        # Check if PDF is valid
        if len(reader.pages) == 0:
            return {"error": "The uploaded PDF file appears to be empty or corrupted."}
        
        # Extract text from all pages
        text = ""
        for i in range(len(reader.pages)):
            page = reader.pages[i]
            text += page.extract_text() + "\n"
        
        # Basic validation
        if not text or len(text.strip()) < 100:
            return {"error": "The extracted text is too short or empty."}
        
        print(f"Extracted {len(text)} characters from PDF with {len(reader.pages)} pages")
        
        return {"text": text}
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return {"error": f"Failed to extract text from PDF: {str(e)}"}

@app.post("/extract-pdf-text-direct")
async def extract_pdf_text_direct(file: UploadFile = File(...)):
    """
    Extract text from a PDF file uploaded directly (no base64 encoding)
    """
    try:
        print(f"Received PDF file upload: {file.filename}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Read the uploaded file
        contents = await file.read()
        
        # Create a file-like object for PyPDF2
        pdf_file = io.BytesIO(contents)
        
        try:
            # Extract text from PDF
            reader = PyPDF2.PdfReader(pdf_file)
            
            # Check if PDF is valid
            if len(reader.pages) == 0:
                return {"error": "The uploaded PDF file appears to be empty or corrupted."}
            
            # Extract text from all pages
            text = ""
            for i in range(len(reader.pages)):
                page = reader.pages[i]
                text += page.extract_text() + "\n"
            
            # Basic validation
            if not text or len(text.strip()) < 100:
                return {"error": "The extracted text is too short or empty."}
            
            print(f"Extracted {len(text)} characters from directly uploaded PDF with {len(reader.pages)} pages")
            
            return {"text": text}
        except Exception as pdf_error:
            print(f"Error processing PDF: {str(pdf_error)}")
            return {"error": f"Failed to extract text from PDF: {str(pdf_error)}"}
    except Exception as e:
        print(f"Error handling PDF file upload: {str(e)}")
        return {"error": f"Failed to process uploaded PDF: {str(e)}"}

# DOCX Text Extraction Endpoint
class DOCXExtractionRequest(BaseModel):
    docx_base64: str

@app.post("/extract-docx-text")
async def extract_docx_text(request: DOCXExtractionRequest):
    """
    Extract text from a DOCX file (base64 encoded)
    """
    try:
        # Decode base64 string to bytes
        docx_bytes = base64.b64decode(request.docx_base64)
        
        # Create a temp file for docx
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            # Write the binary content to the temp file
            tmp.write(docx_bytes)
            tmp_path = tmp.name
        
        try:
            # Extract text using python-docx
            doc = docx.Document(tmp_path)
            
            # Extract text from all paragraphs
            text = "\n".join([para.text for para in doc.paragraphs])
            
            # Add text from tables if any
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + "\n"
            
            # Basic validation
            if not text or len(text.strip()) < 100:
                return {"error": "The extracted text is too short or empty."}
            
            print(f"Extracted {len(text)} characters from DOCX")
            
            return {"text": text}
        finally:
            # Always remove the temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        print(f"Error extracting text from DOCX: {str(e)}")
        return {"error": f"Failed to extract text from DOCX: {str(e)}"}

@app.post("/extract-docx-text-direct")
async def extract_docx_text_direct(file: UploadFile = File(...)):
    """
    Extract text from a DOCX file uploaded directly (no base64 encoding)
    """
    try:
        print(f"Received DOCX file upload: {file.filename}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Read the uploaded file
        contents = await file.read()
        
        # Create a temp file for docx
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            # Write the binary content to the temp file
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Extract text using python-docx
            doc = docx.Document(tmp_path)
            
            # Extract text from all paragraphs
            text = "\n".join([para.text for para in doc.paragraphs])
            
            # Add text from tables if any
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + "\n"
            
            # Basic validation
            if not text or len(text.strip()) < 100:
                return {"error": "The extracted text is too short or empty."}
            
            print(f"Extracted {len(text)} characters from directly uploaded DOCX")
            
            return {"text": text}
        finally:
            # Always remove the temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        print(f"Error handling DOCX file upload: {str(e)}")
        return {"error": f"Failed to process uploaded DOCX: {str(e)}"}

# In-memory storage for user skill goals and job matches
# In a production environment, this would be a database
skill_goals_db = {}
job_matches_db = {}

@app.post("/set-skill-goals")
async def set_skill_goals(request: SkillGoalsRequest):
    """
    Set or update a user's skill goals.
    """
    try:
        # Store the user's skill goals
        skill_goals_db[request.user_id] = {
            "skill_goals": request.skill_goals,
            "current_skills": request.current_skills
        }
        
        print(f"Stored skill goals for user {request.user_id}: {request.skill_goals}")
        return {"success": True, "message": "Skill goals updated successfully"}
    except Exception as e:
        print(f"Error setting skill goals: {str(e)}")
        return {"error": f"Error setting skill goals: {str(e)}"}

@app.get("/get-skill-goals/{user_id}")
async def get_skill_goals(user_id: str):
    """
    Get a user's skill goals.
    """
    try:
        if user_id not in skill_goals_db:
            return {"error": "No skill goals found for this user"}
            
        return skill_goals_db[user_id]
    except Exception as e:
        print(f"Error getting skill goals: {str(e)}")
        return {"error": f"Error getting skill goals: {str(e)}"}

@app.post("/match-job")
async def match_job(request: JobMatchRequest):
    """
    Match a job with a user's skill goals and determine if it's a good fit.
    """
    try:
        # Check if the user has skill goals
        if request.user_id not in skill_goals_db:
            return {"error": "No skill goals found for this user"}
            
        user_goals = skill_goals_db[request.user_id]
        
        # Extract skills from the job description
        if not OPENAI_API_KEY or not client:
            return {"error": "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."}
        
        # Create prompt for skill extraction
        system_prompt = "You are a skilled job analyzer that extracts technical and soft skills from job descriptions."
        user_prompt = f"Extract all technical and soft skills from the following job description for {request.job_title} at {request.company}.\n\nJob Description:\n{request.job_description[:5000]}\n\nReturn ONLY a JSON array of strings with the skill names."
        
        # Generate response using OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        # Extract the response text
        response_text = response.choices[0].message.content
        
        # Extract JSON array from response
        import re
        
        # Try to find a JSON array in the response
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        
        job_skills = []
        if json_match:
            try:
                job_skills = json.loads(json_match.group(0))
                print(f"Extracted {len(job_skills)} skills from job")
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from response: {str(e)}")
                # Fall back to simple extraction
                job_skills = re.findall(r'"([^"]+)"', response_text)
        
        # Calculate match score and relevant skills
        matching_skills = [skill for skill in job_skills if skill.lower() in [s.lower() for s in user_goals["current_skills"]]]
        goal_skills = [skill for skill in job_skills if skill.lower() in [s.lower() for s in user_goals["skill_goals"]]]
        
        # Calculate match percentage
        total_skills = len(job_skills) if job_skills else 1  # Avoid division by zero
        match_percentage = (len(matching_skills) / total_skills) * 100
        
        # Determine if this is a good match
        is_good_match = match_percentage >= 50 or len(goal_skills) >= 2
        
        # Store the match result
        match_result = {
            "job_title": request.job_title,
            "company": request.company,
            "url": request.url,
            "job_skills": job_skills,
            "matching_skills": matching_skills,
            "goal_skills": goal_skills,
            "match_percentage": match_percentage,
            "is_good_match": is_good_match
        }
        
        # Store the match in the database
        if request.user_id not in job_matches_db:
            job_matches_db[request.user_id] = []
            
        job_matches_db[request.user_id].append(match_result)
        
        return match_result
    except Exception as e:
        print(f"Error matching job: {str(e)}")
        return {"error": f"Error matching job: {str(e)}"}

@app.get("/get-job-matches/{user_id}")
async def get_job_matches(user_id: str):
    """
    Get all job matches for a user.
    """
    try:
        if user_id not in job_matches_db:
            return {"matches": []}
            
        return {"matches": job_matches_db[user_id]}
    except Exception as e:
        print(f"Error getting job matches: {str(e)}")
        return {"error": f"Error getting job matches: {str(e)}"}

@app.post("/extract-resume-skills")
async def extract_resume_skills(request: ResumeAnalysisRequest):
    """
    Extract skills from a resume and return them.
    """
    try:
        # Basic validation for empty or very short text
        if not request.resume_text or len(request.resume_text.strip()) < 50:
            return {"error": "The resume text is too short or empty."}
        
        # Check if OpenAI API key is configured
        if not OPENAI_API_KEY or not client:
            return {"error": "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."}
        
        # Create prompt for skill extraction
        system_prompt = "You are an expert resume analyzer that extracts skills, experience, and qualifications from resumes."
        user_prompt = f"""Extract all skills, experience details, and qualifications from the following resume. 
        
        Resume text:
        {request.resume_text[:5000]}  # Limit text length to avoid token limits
        
        Please provide a JSON response with the following structure:
        {{
            "skills": [List of technical and soft skills found in the resume],
            "experience": [List of job roles and responsibilities],
            "years_of_experience": Estimated total years of experience,
            "education": [List of educational qualifications],
            "industries": [List of industries the person has worked in]
        }}
        
        Return ONLY the JSON object without any explanations.
        """
        
        try:
            # Generate response using OpenAI
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            # Extract the response text
            result_text = response.choices[0].message.content
            
            # Parse the result if it's a string
            if isinstance(result_text, str):
                try:
                    result = json.loads(result_text)
                    print("Successfully parsed resume analysis JSON result")
                except json.JSONDecodeError:
                    print("Failed to parse result as JSON, extracting skills with regex")
                    # Fallback to regex extraction of skills
                    skills_match = re.search(r'"skills"\s*:\s*\[(.*?)\]', result_text, re.DOTALL)
                    if skills_match:
                        skills_text = skills_match.group(1)
                        skills = re.findall(r'"([^"]+)"', skills_text)
                        result = {"skills": skills}
                    else:
                        result = {"skills": [], "error": "Could not extract skills from AI response"}
            
            return result
        except Exception as e:
            print(f"Error in OpenAI API call: {str(e)}")
            return {"error": f"Error analyzing resume with AI service: {str(e)}"}
            
    except Exception as e:
        print(f"Error extracting resume skills: {str(e)}")
        return {"error": f"Error extracting resume skills: {str(e)}"}

@app.post("/search-jobs")
async def search_jobs(request: JobSearchRequest):
    """
    Search for jobs on LinkedIn or Indeed based on resume content.
    """
    try:
        # Extract skills and experience from resume if not provided
        resume_analysis = await extract_resume_skills(ResumeAnalysisRequest(resume_text=request.resume_text))
        
        if "error" in resume_analysis:
            return {"error": resume_analysis["error"]}
        
        # Get skills from resume analysis
        skills = resume_analysis.get("skills", [])
        experience = resume_analysis.get("experience", [])
        years_exp = resume_analysis.get("years_of_experience", 0)
        industries = resume_analysis.get("industries", [])
        
        # Combine with provided keywords
        search_keywords = list(set(skills + request.keywords))
        
        # Limit to top 5 skills to avoid overly specific searches
        if len(search_keywords) > 5:
            search_keywords = search_keywords[:5]
        
        # Create search query
        search_query = " ".join(search_keywords)
        
        # Determine experience level based on years
        if not request.experience_level:
            if years_exp < 2:
                experience_level = "Entry level"
            elif years_exp < 5:
                experience_level = "Mid level"
            else:
                experience_level = "Senior level"
        else:
            experience_level = request.experience_level
        
        # Search for jobs
        jobs = []
        
        # Try LinkedIn first
        try:
            linkedin_jobs = search_linkedin_jobs(search_query, request.location, experience_level)
            jobs.extend(linkedin_jobs)
        except Exception as e:
            print(f"Error searching LinkedIn: {str(e)}")
        
        # Then try Indeed if we don't have enough jobs
        if len(jobs) < 5:
            try:
                indeed_jobs = search_indeed_jobs(search_query, request.location, experience_level)
                jobs.extend(indeed_jobs)
            except Exception as e:
                print(f"Error searching Indeed: {str(e)}")
        
        # Limit to 10 jobs
        jobs = jobs[:10]
        
        # Match jobs with user's skills
        matched_jobs = []
        for job in jobs:
            # Extract skills from job description
            job_skills = extract_skills_from_job(job["description"])
            
            # Calculate match score
            matching_skills = [skill for skill in job_skills if skill.lower() in [s.lower() for s in skills]]
            match_percentage = (len(matching_skills) / len(job_skills)) * 100 if job_skills else 0
            
            # Add match info to job
            job["matching_skills"] = matching_skills
            job["match_percentage"] = match_percentage
            job["is_good_match"] = match_percentage >= 50
            
            matched_jobs.append(job)
        
        # Sort by match percentage
        matched_jobs.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        # Store matches in database
        if request.user_id not in job_matches_db:
            job_matches_db[request.user_id] = []
        
        # Add new matches to database
        for job in matched_jobs:
            # Check if job already exists
            if not any(existing["url"] == job["url"] for existing in job_matches_db[request.user_id]):
                job_matches_db[request.user_id].append(job)
        
        return {"matches": matched_jobs, "resume_analysis": resume_analysis}
    except Exception as e:
        print(f"Error searching jobs: {str(e)}")
        return {"error": f"Error searching jobs: {str(e)}"}

# Helper function to search LinkedIn jobs
def search_linkedin_jobs(query, location="", experience_level=""):
    # This is a simplified implementation that would need to be replaced with
    # a proper LinkedIn API integration or web scraping in a production environment
    
    # For demo purposes, return mock LinkedIn jobs
    return [
        {
            "title": f"Senior {query.split()[0]} Developer",
            "company": "LinkedIn Tech",
            "location": location or "San Francisco, CA",
            "description": f"We are looking for a skilled {query} developer with experience in web development, "
                          f"cloud technologies, and agile methodologies. The ideal candidate should have "
                          f"strong problem-solving abilities and excellent communication skills.",
            "url": "https://www.linkedin.com/jobs/view/senior-developer-at-linkedin",
            "source": "LinkedIn"
        },
        {
            "title": f"{query.split()[0]} Engineer",
            "company": "Tech Innovations",
            "location": location or "Remote",
            "description": f"Join our team as a {query} Engineer. Required skills include: programming, "
                          f"software development, testing, and deployment. Experience with cloud platforms "
                          f"and containerization is a plus.",
            "url": "https://www.linkedin.com/jobs/view/engineer-at-tech-innovations",
            "source": "LinkedIn"
        }
    ]

# Helper function to search Indeed jobs
def search_indeed_jobs(query, location="", experience_level=""):
    # This is a simplified implementation that would need to be replaced with
    # a proper Indeed API integration or web scraping in a production environment
    
    # For demo purposes, return mock Indeed jobs
    return [
        {
            "title": f"{query.split()[0]} Specialist",
            "company": "Indeed Solutions",
            "location": location or "New York, NY",
            "description": f"We're hiring a {query} Specialist to join our growing team. You'll be responsible "
                          f"for developing and maintaining applications, collaborating with cross-functional "
                          f"teams, and implementing best practices in software development.",
            "url": "https://www.indeed.com/viewjob?jk=specialist",
            "source": "Indeed"
        },
        {
            "title": f"Lead {query.split()[0]} Developer",
            "company": "Global Tech",
            "location": location or "Chicago, IL",
            "description": f"Lead {query} Developer needed for an exciting project. The ideal candidate has "
                          f"experience with modern frameworks, database design, and API development. "
                          f"You should be comfortable mentoring junior developers and driving technical decisions.",
            "url": "https://www.indeed.com/viewjob?jk=lead-developer",
            "source": "Indeed"
        }
    ]

# Helper function to extract skills from job description
def extract_skills_from_job(description):
    # In a production environment, this would use the OpenAI API
    # For demo purposes, extract common tech skills from the description
    common_skills = [
        "Python", "JavaScript", "Java", "C#", "C++", "Ruby", "Go", "PHP", "Swift", "Kotlin",
        "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring", "ASP.NET",
        "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Oracle", "Firebase",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git",
        "Machine Learning", "AI", "Data Science", "Big Data", "DevOps", "Agile", "Scrum",
        "Communication", "Teamwork", "Problem Solving", "Leadership"
    ]
    
    found_skills = []
    for skill in common_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', description, re.IGNORECASE):
            found_skills.append(skill)
    
    return found_skills
    # Check if text is empty or too short
    if not text or len(text.strip()) < 100:
        print(f"Resume validation failed: Text too short ({len(text.strip()) if text else 0} chars)")
        return False
    
    # Clean the text - remove extra whitespace and normalize
    cleaned_text = ' '.join(text.split())
    text_lower = cleaned_text.lower()
    
    # Define resume section indicators with variations and common headers
    resume_sections = {
        'education': ['education', 'academic background', 'degree', 'university', 'college', 'school', 'gpa'],
        'experience': ['experience', 'work experience', 'employment', 'job history', 'professional experience', 
                      'work history', 'career history', 'positions held'],
        'skills': ['skills', 'technical skills', 'competencies', 'expertise', 'proficiencies', 'abilities',
                  'qualifications', 'core competencies'],
        'contact': ['contact', 'email', 'phone', 'address', 'linkedin', 'github', '@gmail', '@yahoo', '@hotmail'],
        'other': ['objective', 'summary', 'profile', 'about me', 'references', 'certifications', 'projects',
                'achievements', 'awards', 'languages', 'volunteer', 'interests', 'activities']
    }
    
    # Count sections found in the resume
    sections_found = {}
    for section_type, indicators in resume_sections.items():
        # Check for each indicator in this section type
        for indicator in indicators:
            if indicator in text_lower:
                if section_type not in sections_found:
                    sections_found[section_type] = []
                sections_found[section_type].append(indicator)
    
    # Print debug information
    print(f"Resume validation - Sections found: {sections_found}")
    
    # Check for minimum required sections (at least 3 different section types)
    # AND at least one must be either education or experience
    has_key_section = 'education' in sections_found or 'experience' in sections_found
    enough_sections = len(sections_found) >= 2
    
    is_valid = has_key_section and enough_sections
    print(f"Resume validation result: {is_valid} (Key section: {has_key_section}, Enough sections: {enough_sections})")
    
    return is_valid

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

# Interview preparation models
class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str
    difficulty: str = "medium"  # easy, medium, hard
    focus: str = "mixed"  # technical, behavioral, mixed
    previous_conversation: Optional[List[Dict[str, str]]] = []

class InterviewResponse(BaseModel):
    message: str
    conversation: List[Dict[str, str]]
    is_complete: bool = False
    feedback: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None

@app.post("/interview")
async def conduct_interview(request: InterviewRequest):
    """
    Conduct an AI-powered job interview based on resume and job description.
    """
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        # Prepare context based on resume and job description
        context = f"""
        You are an AI-powered interview coach. Your job is to simulate a realistic job interview experience 
        for the candidate based on their resume and the job description they provided.
        
        Resume:
        {request.resume_text}
        
        Job Description:
        {request.job_description}
        
        Interview Difficulty: {request.difficulty.capitalize()}
        Focus Area: {request.focus.capitalize()}
        """
        
        is_first_message = len(request.previous_conversation) == 0
        is_final_message = False
        feedback = None
        strengths = None
        weaknesses = None
        
        if is_first_message:
            # For the first message, introduce yourself and ask the first question
            prompt = f"{context}\n\nYou are starting a new interview. Introduce yourself briefly as the interviewer and ask your first question related to the job description and candidate's resume. Keep your response concise."
        elif len(request.previous_conversation) >= 10:
            # If we've had 5+ exchanges, generate a summary and feedback
            is_final_message = True
            prompt = f"{context}\n\nThe interview is now complete. Please provide:\n1. A brief thank you and conclusion to the interview.\n2. Detailed feedback on the candidate's responses.\n3. A list of 3-5 strengths demonstrated in the interview.\n4. A list of 2-4 areas for improvement."
        else:
            # For follow-up questions, build on the conversation
            conversation_history = "\n".join([f"{'Interviewer' if i % 2 == 0 else 'Candidate'}: {msg['content']}" for i, msg in enumerate(request.previous_conversation)])
            
            prompt = f"{context}\n\nConversation history:\n{conversation_history}\n\nBased on the candidate's last response, provide your next interview question or follow-up. Keep your response concise and relevant to the job requirements."
        
        # Call Gemini API for response generation
        gemini_model = genai.GenerativeModel('gemini-pro')
        response = gemini_model.generate_content(prompt)
        interview_response = response.text
        
        # If this is the final message, extract feedback and lists
        if is_final_message:
            try:
                # Try to structure the response
                parts = interview_response.split('\n\n')
                conclusion = parts[0]
                
                # Extract feedback if available (might be in different formats)
                feedback_section = next((p for p in parts if 'feedback' in p.lower()), None)
                feedback = feedback_section if feedback_section else interview_response
                
                # Try to extract strengths
                strengths_section = next((p for p in parts if 'strength' in p.lower()), None)
                if strengths_section:
                    # Extract bullet points
                    strengths = re.findall(r'[-*]\s*(.*)', strengths_section)
                    if not strengths:
                        # Fall back to numbered list
                        strengths = re.findall(r'\d+\.\s*(.*)', strengths_section)
                
                # Try to extract weaknesses/areas for improvement
                weaknesses_section = next((p for p in parts if 'improvement' in p.lower() or 'weakness' in p.lower()), None)
                if weaknesses_section:
                    # Extract bullet points
                    weaknesses = re.findall(r'[-*]\s*(.*)', weaknesses_section)
                    if not weaknesses:
                        # Fall back to numbered list
                        weaknesses = re.findall(r'\d+\.\s*(.*)', weaknesses_section)
                
                # If extraction failed, use simpler approach
                if not strengths or not weaknesses:
                    interview_response = conclusion
            except Exception as e:
                print(f"Error extracting feedback: {str(e)}")
                pass
        
        # Update conversation history
        conversation = request.previous_conversation.copy()
        conversation.append({"role": "interviewer", "content": interview_response})
        
        return InterviewResponse(
            message=interview_response,
            conversation=conversation,
            is_complete=is_final_message,
            feedback=feedback if is_final_message else None,
            strengths=strengths if is_final_message else None,
            weaknesses=weaknesses if is_final_message else None
        )
        
    except Exception as e:
        print(f"Error in interview API: {str(e)}")
        # Return a helpful error message
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating interview response: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
