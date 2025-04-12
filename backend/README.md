# JobSkillTracker Backend

This is the backend service for the JobSkillTracker Chrome extension, which uses CrewAI to implement a multi-agent system for processing job descriptions, analyzing resumes, and recommending projects.

## Setup

1. Install the required Python packages:

```bash
pip install -r requirements.txt
```

2. Set up your environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your OpenAI API key to the `.env` file

```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the API server:

```bash
python run_api.py
```

The API will be available at `http://localhost:8000`.

## API Endpoints

- `POST /process-job`: Process a job description to extract skills and requirements
- `POST /analyze-resume`: Analyze a resume against job requirements
- `POST /recommend-projects`: Recommend projects based on skill gaps

## CrewAI Agents

This backend uses three specialized AI agents:

1. **Job Description Analyzer**: Extracts skills, responsibilities, and requirements from job descriptions
2. **Resume Analyzer**: Identifies skills in resumes and compares them to job requirements
3. **Project Recommender**: Suggests personalized projects to help build missing skills

Each agent is specialized in its task and they work together to provide comprehensive insights and recommendations.
