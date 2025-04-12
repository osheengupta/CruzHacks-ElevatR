# JobSkillTracker - CruzHacks Project

A Chrome extension that helps students track job skills from descriptions and get personalized project recommendations to enhance their resumes.

## Features

- **Job Description Scraping**: Automatically extracts information from job postings
- **Skill Tracking**: Identifies and categorizes technical and soft skills from job descriptions
- **Resume Analysis**: Compares your resume against job requirements to identify skill gaps
- **Project Recommendations**: Suggests personalized projects to build missing skills
- **Skills Dashboard**: Visualizes skill frequency across saved jobs

## Architecture

This project consists of two main components:

1. **Chrome Extension**: Frontend interface for saving job descriptions and viewing analysis
2. **CrewAI Backend**: Multi-agent system that processes job descriptions, analyzes resumes, and recommends projects

### AI Agents

The backend uses CrewAI to implement three specialized AI agents:

- **Job Description Analyzer**: Extracts skills and requirements from job descriptions
- **Resume Analyzer**: Identifies skills in resumes and compares to job requirements
- **Project Recommender**: Suggests personalized projects based on skill gaps

## Setup

### Chrome Extension

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right)
4. Click "Load unpacked" and select the repository folder
5. The extension should appear in your toolbar

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install the required Python packages:
```bash
pip install -r requirements.txt
```

3. Set up your environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your OpenAI API key to the `.env` file

4. Run the API server:
```bash
python run_api.py
```

The API will be available at `http://localhost:8000`.

## Usage

1. Browse job listings on sites like LinkedIn, Indeed, or Glassdoor
2. Click the JobSkillTracker extension icon and select "Save Job Description"
3. The extension will extract skills and save the job information
4. Click "View Dashboard" to see your saved jobs and skill analysis
5. Upload your resume to identify skill gaps
6. Get personalized project recommendations based on your skill gaps

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript, Chart.js
- **Backend**: Python, FastAPI, CrewAI, LangChain
- **AI**: OpenAI GPT models
- **Storage**: Chrome Extension Storage API

## Project Structure

- `/images` - Extension icons
- `/backend` - CrewAI backend service
  - `/agents` - AI agent definitions
  - `/api` - FastAPI server
- Root files - Chrome extension files (manifest.json, popup.html, etc.)

## CruzHacks Submission

This project was created for CruzHacks, focusing on helping students improve their job prospects by identifying and addressing skill gaps through targeted project work.

## License

MIT
