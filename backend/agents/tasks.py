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
        # Extract and format the required skills for better comparison
        technical_skills = extracted_job_skills.get('technical_skills', [])
        soft_skills = extracted_job_skills.get('soft_skills', [])
        other_requirements = extracted_job_skills.get('other_requirements', [])
        
        # Format the skills as a string with each skill on a new line for better visibility
        technical_skills_str = '\n'.join([f'- {skill}' for skill in technical_skills]) if technical_skills else 'None provided'
        soft_skills_str = '\n'.join([f'- {skill}' for skill in soft_skills]) if soft_skills else 'None provided'
        other_requirements_str = '\n'.join([f'- {req}' for req in other_requirements]) if other_requirements else 'None provided'
        
        return Task(
            description=f"""
            You are a professional resume analyzer with expertise in identifying skills and matching them to job requirements.
            Your task is to carefully analyze the resume text and identify skills that are EXPLICITLY mentioned.
            
            Resume Text to Analyze:
            ```
            {resume_text}
            ```
            
            Job Skills Required:
            
            Technical Skills:
            {technical_skills_str}
            
            Soft Skills:
            {soft_skills_str}
            
            Other Requirements:
            {other_requirements_str}
            
            STRICT ANALYSIS RULES - FOLLOW THESE EXACTLY:
            1. ONLY identify skills that are EXPLICITLY mentioned in the resume using the exact words or very close synonyms.
            2. DO NOT infer skills that aren't clearly stated - if you're unsure, mark it as missing.
            3. For each skill you identify as present, you MUST include the exact text snippet from the resume as evidence.
            4. Be extremely precise - false positives are worse than false negatives.
            5. Check for exact matches first, then check for clear synonyms or alternative phrasings.
            6. DO NOT list skills as present based on job titles alone without supporting evidence in the description.
            
            SKILL MATCHING PROCESS:
            1. For each required skill, search for exact matches in the resume.
            2. If no exact match, look for clear synonyms or alternative phrasings.
            3. If still no match, mark as missing.
            4. For each match, extract the relevant text snippet as evidence.
            
            Format your response as a JSON object with the following structure:
            {{
                "present_skills": [
                    {{"name": "skill1", "type": "technical/soft", "level": "beginner/intermediate/advanced", "evidence": "exact text from resume"}},
                    ...
                ],
                "missing_skills": [
                    {{"name": "skill1", "type": "technical/soft", "importance": "high/medium/low"}},
                    ...
                ],
                "strengths": ["strength1", "strength2", ...],
                "improvement_areas": ["area1", "area2", ...]
            }}
            
            FINAL VERIFICATION:
            Before submitting your analysis, verify each skill you've marked as present by confirming the evidence directly quotes text from the resume.
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
