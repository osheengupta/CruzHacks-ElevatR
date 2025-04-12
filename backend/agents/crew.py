from crewai import Crew
from .agents import JobSkillAgents
from .tasks import JobSkillTasks

class JobSkillCrew:
    def __init__(self):
        self.agents = JobSkillAgents()
        self.tasks = JobSkillTasks()
    
    def process_job_description(self, job_description):
        """
        Process a job description to extract skills and requirements.
        """
        # Create the extraction agent
        extraction_agent = self.agents.create_extraction_agent()
        
        # Create the extraction task
        extraction_task = self.tasks.extraction_task(extraction_agent, job_description)
        
        # Create and run the crew with just the extraction agent and task
        crew = Crew(
            agents=[extraction_agent],
            tasks=[extraction_task],
            verbose=True
        )
        
        # Run the crew and get the result
        result = crew.kickoff()
        return result
    
    def analyze_resume(self, resume_text, extracted_job_skills):
        """
        Analyze a resume against job requirements.
        """
        # Create the resume analyzer agent
        resume_analyzer = self.agents.create_resume_analyzer_agent()
        
        # Create the resume analysis task
        resume_task = self.tasks.resume_analysis_task(resume_analyzer, resume_text, extracted_job_skills)
        
        # Create and run the crew
        crew = Crew(
            agents=[resume_analyzer],
            tasks=[resume_task],
            verbose=True
        )
        
        # Run the crew and get the result
        result = crew.kickoff()
        return result
    
    def recommend_projects(self, skill_gaps, current_skills):
        """
        Recommend projects based on skill gaps.
        """
        # Create the project recommendation agent
        project_recommender = self.agents.create_project_recommendation_agent()
        
        # Create the project recommendation task
        project_task = self.tasks.project_recommendation_task(project_recommender, skill_gaps, current_skills)
        
        # Create and run the crew
        crew = Crew(
            agents=[project_recommender],
            tasks=[project_task],
            verbose=True
        )
        
        # Run the crew and get the result
        result = crew.kickoff()
        return result
