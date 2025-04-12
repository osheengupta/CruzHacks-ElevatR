from crewai import Task

class JobSkillTasks:
    def extraction_task(self, agent, job_description):
        """
        Creates a task for extracting skills from a job description.
        """
        return Task(
            description=f"""
            Analyze the following job description and extract:
            1. All technical skills mentioned (programming languages, tools, platforms, etc.)
            2. All soft skills mentioned (communication, leadership, etc.)
            3. Key responsibilities of the role
            4. Required experience level
            5. Any other notable requirements

            Job Description:
            {job_description}

            Format your response as a JSON object with the following structure:
            {{
                "technical_skills": ["skill1", "skill2", ...],
                "soft_skills": ["skill1", "skill2", ...],
                "responsibilities": ["responsibility1", "responsibility2", ...],
                "experience_level": "entry/mid/senior",
                "other_requirements": ["requirement1", "requirement2", ...]
            }}
            """,
            agent=agent
        )
    
    def resume_analysis_task(self, agent, resume_text, extracted_job_skills):
        """
        Creates a task for analyzing a resume against job requirements.
        """
        return Task(
            description=f"""
            Analyze the following resume and compare it with the extracted job skills:
            
            Resume:
            {resume_text}
            
            Job Skills Required:
            Technical Skills: {extracted_job_skills.get('technical_skills', [])}
            Soft Skills: {extracted_job_skills.get('soft_skills', [])}
            Other Requirements: {extracted_job_skills.get('other_requirements', [])}
            
            Identify:
            1. Skills present in the resume
            2. Skills missing from the resume but required by jobs
            3. Strength of existing skills (beginner, intermediate, advanced)
            
            Format your response as a JSON object with the following structure:
            {{
                "present_skills": [
                    {{"name": "skill1", "type": "technical/soft", "level": "beginner/intermediate/advanced"}},
                    ...
                ],
                "missing_skills": [
                    {{"name": "skill1", "type": "technical/soft", "importance": "high/medium/low"}},
                    ...
                ],
                "strengths": ["strength1", "strength2", ...],
                "improvement_areas": ["area1", "area2", ...]
            }}
            """,
            agent=agent
        )
    
    def project_recommendation_task(self, agent, skill_gaps, current_skills):
        """
        Creates a task for recommending projects based on skill gaps.
        """
        return Task(
            description=f"""
            Based on the identified skill gaps and current skills, recommend 3-5 projects that would help 
            the person develop the missing skills required for their target jobs.
            
            Missing Skills: {skill_gaps}
            Current Skills: {current_skills}
            
            For each project, provide:
            1. A title
            2. A brief description
            3. The skills it would help develop
            4. Estimated time to complete
            5. Difficulty level (beginner, intermediate, advanced)
            6. Resources to help get started
            
            Format your response as a JSON array of project objects:
            [
                {{
                    "title": "Project Title",
                    "description": "Brief project description",
                    "skills_targeted": ["skill1", "skill2", ...],
                    "time_estimate": "X weeks/hours",
                    "difficulty": "beginner/intermediate/advanced",
                    "resources": ["resource1", "resource2", ...]
                }},
                ...
            ]
            
            Ensure the projects are practical, relevant to the person's career goals, and will effectively 
            demonstrate the missing skills to potential employers.
            """,
            agent=agent
        )
