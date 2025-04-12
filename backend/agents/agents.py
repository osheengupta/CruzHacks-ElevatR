from crewai import Agent
from langchain.llms import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize the OpenAI LLM
llm = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.7,
    model_name="gpt-4"
)

class JobSkillAgents:
    def __init__(self):
        self.llm = llm
    
    def create_extraction_agent(self):
        """
        Creates an agent specialized in extracting skills and responsibilities from job descriptions.
        """
        return Agent(
            role="Job Description Analyzer",
            goal="Extract all relevant skills, responsibilities, and requirements from job descriptions",
            backstory="""You are an expert in analyzing job descriptions and identifying key skills, 
            responsibilities, and requirements. You have years of experience in HR and recruitment, 
            and you understand the nuances of job postings across different industries. Your expertise 
            allows you to accurately identify both technical and soft skills from any job description.""",
            verbose=True,
            llm=self.llm,
            allow_delegation=False
        )
    
    def create_resume_analyzer_agent(self):
        """
        Creates an agent specialized in analyzing resumes and identifying skills.
        """
        return Agent(
            role="Resume Analyzer",
            goal="Extract skills from resumes and identify gaps compared to job requirements",
            backstory="""You are an expert resume analyst with years of experience in career counseling. 
            You excel at identifying skills from resumes and understanding how they match or don't match 
            with job requirements. Your guidance has helped thousands of job seekers improve their resumes 
            and land their dream jobs.""",
            verbose=True,
            llm=self.llm,
            allow_delegation=True
        )
    
    def create_project_recommendation_agent(self):
        """
        Creates an agent specialized in recommending projects based on skill gaps.
        """
        return Agent(
            role="Project Recommender",
            goal="Recommend personalized projects to help job seekers build missing skills",
            backstory="""You are a career development expert who specializes in recommending practical 
            projects that help people build job-relevant skills. You have a deep understanding of what 
            employers look for and how candidates can demonstrate their abilities through projects. 
            Your recommendations are always tailored to the individual's skill gaps and career goals.""",
            verbose=True,
            llm=self.llm,
            allow_delegation=True
        )
