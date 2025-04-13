from crewai import Task

class JobSkillTasks:
    def extraction_task(self, agent, job_description):
        """
        Creates a task for extracting structured data from job descriptions.
        """
        return Task(
            description=f"""
            You are an expert in analyzing job descriptions and extracting structured data.

            Given the following job description text, identify and extract the following:

            1. **Company name** – The organization hiring for the role.
            2. **Role or job title** – The official job title.
            3. **Key skills** – List technical and soft skills mentioned. These should be specific abilities or knowledge areas.
            4. **Requirements** – List qualifications like education, experience, certifications, etc.
            5. **Salary or compensation** – If provided, include it exactly as mentioned.

            IMPORTANT GUIDELINES:
            - ONLY use what's explicitly mentioned in the text. Do NOT guess.
            - Avoid repetition or redundancy in skills (e.g., don't list "communication skills" and "excellent communication" separately)
            - Experience and degree requirements should be listed under "requirements" not "key_skills"
            - If salary is not mentioned, leave it as an empty string

            Here is the job description:
            {job_description}

            IMPORTANT: You MUST return your answer as a valid JSON object with this exact structure:
            {{
                "company": "Company Name",
                "role": "Job Title",
                "key_skills": ["Skill 1", "Skill 2", ...],
                "requirements": ["Requirement 1", "Requirement 2", ...],
                "salary": "If mentioned, include it here. Otherwise leave empty."
            }}

            Be concise and extract only what's present. Don't include unrelated or generic information.
            Your response must be ONLY the JSON object, nothing else before or after.
            """,
            expected_output="""
            A JSON object with the following structure:
            {
                "company": "Company Name",
                "role": "Job Title",
                "key_skills": ["Skill 1", "Skill 2", ...],
                "requirements": ["Requirement 1", "Requirement 2", ...],
                "salary": "Salary information if available"
            }
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
            Technical Skills: {extracted_job_skills.get('key_skills', [])}
            Requirements: {extracted_job_skills.get('requirements', [])}
            
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
            expected_output="""
            A JSON object with the structure described above.
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
            expected_output="""
            A JSON array of project objects as described above.
            """,
            agent=agent
        )
