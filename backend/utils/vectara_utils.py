"""
Vectara integration utilities for JobSkillTracker.
This module provides functions to interact with the Vectara API for enhanced
interview preparation and context retrieval.
"""

import os
import json
import random
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Vectara client with API key
VECTARA_API_KEY = os.getenv("VECTARA_API_KEY")
VECTARA_CUSTOMER_ID = os.getenv("VECTARA_CUSTOMER_ID", "2310034097")
VECTARA_CORPUS_ID = os.getenv("VECTARA_CORPUS_ID", "4")

# Vectara API endpoints - updated to ensure correct version
VECTARA_INDEX_ENDPOINT = "https://api.vectara.io/v1/index"
VECTARA_QUERY_ENDPOINT = "https://api.vectara.io/v1/query"

# Simple API client for Vectara with improved error handling and authentication
class VectaraClient:
    def __init__(self, api_key, customer_id):
        self.api_key = api_key
        self.customer_id = customer_id
        self.headers = {
            "x-api-key": api_key,
            "customer-id": str(customer_id),  # Ensure customer_id is sent as a string
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        print(f"Initialized VectaraClient with customer_id: {customer_id} and API key: {api_key[:5]}...")
    
    async def test_connection(self):
        """Test the Vectara connection"""
        try:
            # Simple query to test connection
            test_request = {
                "query": [{
                    "query": "test query",
                    "num_results": 1,
                    "corpus_key": [{"customer_id": self.customer_id, "corpus_id": VECTARA_CORPUS_ID}]
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    VECTARA_QUERY_ENDPOINT,
                    headers=self.headers,
                    json=test_request,
                    timeout=10.0
                )
                
                print(f"Vectara test connection status: {response.status_code}")
                print(f"Vectara test response headers: {response.headers}")
                if response.status_code != 200:
                    print(f"Vectara test connection error: {response.text}")
                    return False
                    
                return True
        except Exception as e:
            print(f"Vectara test connection exception: {str(e)}")
            return False
    
    async def index_document(self, corpus_id, document, metadata=None):
        """Index a document in Vectara"""
        if metadata is None:
            metadata = {}
            
        try:
            document_id = f"doc-{random.randint(1000, 9999)}"
            payload = {
                "customer_id": self.customer_id,
                "corpus_id": corpus_id,
                "document": {
                    "document_id": document_id,
                    "title": metadata.get("title", "Untitled Document"),
                    "metadata_json": json.dumps(metadata),
                    "section": [{
                        "text": document
                    }]
                }
            }
            
            print(f"Indexing document with ID: {document_id}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    VECTARA_INDEX_ENDPOINT,
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                
                print(f"Vectara index response status: {response.status_code}")
                if response.status_code != 200:
                    print(f"Error indexing document: {response.text}")
                    return None
                    
                result = response.json()
                print(f"Successfully indexed document: {result}")
                return result
        except Exception as e:
            print(f"Exception in index_document: {str(e)}")
            return None
    
    async def query(self, query_request):
        """Query Vectara for relevant documents"""
        try:
            print(f"Querying Vectara with request: {json.dumps(query_request)[:200]}...")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    VECTARA_QUERY_ENDPOINT,
                    headers=self.headers,
                    json=query_request,
                    timeout=30.0
                )
                
                print(f"Vectara query response status: {response.status_code}")
                if response.status_code != 200:
                    print(f"Error querying Vectara: {response.text}")
                    return {"responseSet": []}
                    
                result = response.json()
                print(f"Received Vectara query response with {len(result.get('responseSet', []))} response sets")
                return result
        except Exception as e:
            print(f"Exception in query: {str(e)}")
            return {"responseSet": []}

# Initialize Vectara client
vectara_client = VectaraClient(
    api_key=VECTARA_API_KEY,
    customer_id=VECTARA_CUSTOMER_ID
)

class VectaraInterviewHelper:
    """Helper class for using Vectara in interview preparation."""
    
    def __init__(self):
        self.client = vectara_client
        self.corpus_id = VECTARA_CORPUS_ID
    
    async def index_job_description(self, job_description: str, job_title: str, metadata: Optional[Dict] = None) -> str:
        """
        Index a job description in Vectara for better context retrieval.
        
        Args:
            job_description: The job description text
            job_title: The job title
            metadata: Additional metadata about the job
            
        Returns:
            document_id: The ID of the indexed document
        """
        try:
            # Prepare metadata
            if metadata is None:
                metadata = {}
            
            metadata["title"] = job_title
            metadata["type"] = "job_description"
            
            # Index the document
            response = await self.client.index_document(
                corpus_id=self.corpus_id,
                document=job_description,
                metadata=metadata
            )
            
            if response:
                print(f"Successfully indexed job description: {job_title}")
                return response.get("document_id", "")
            else:
                print("Failed to index job description")
                return ""
                
        except Exception as e:
            print(f"Error indexing job description: {str(e)}")
            return ""
    
    async def index_resume(self, resume_text: str, metadata: Optional[Dict] = None) -> str:
        """
        Index a resume in Vectara for better context retrieval.
        
        Args:
            resume_text: The resume text
            metadata: Additional metadata about the resume
            
        Returns:
            document_id: The ID of the indexed document
        """
        try:
            # Prepare metadata
            if metadata is None:
                metadata = {}
            
            metadata["title"] = "Resume"
            metadata["type"] = "resume"
            
            # Index the document
            response = await self.client.index_document(
                corpus_id=self.corpus_id,
                document=resume_text,
                metadata=metadata
            )
            
            if response:
                print("Successfully indexed resume")
                return response.get("document_id", "")
            else:
                print("Failed to index resume")
                return ""
                
        except Exception as e:
            print(f"Error indexing resume: {str(e)}")
            return ""
    
    async def index_interview_question(self, question: str, sample_answer: str, category: str, difficulty: str) -> str:
        """
        Index an interview question in Vectara.
        
        Args:
            question: The interview question
            sample_answer: A sample answer to the question
            category: The category of the question (e.g., technical, behavioral)
            difficulty: The difficulty level (easy, medium, hard)
            
        Returns:
            document_id: The ID of the indexed document
        """
        try:
            # Prepare the document text
            document_text = f"Question: {question}\nSample Answer: {sample_answer}"
            
            # Prepare metadata
            metadata = {
                "title": question[:50] + "...",
                "type": "interview_question",
                "category": category,
                "difficulty": difficulty
            }
            
            # Index the document
            response = await self.client.index_document(
                corpus_id=self.corpus_id,
                document=document_text,
                metadata=metadata
            )
            
            if response:
                print(f"Successfully indexed interview question: {question[:30]}...")
                return response.get("document_id", "")
            else:
                print("Failed to index interview question")
                return ""
                
        except Exception as e:
            print(f"Error indexing interview question: {str(e)}")
            return ""
    
    async def get_interview_questions(self, query: str, job_description: str, resume_text: str, 
                                    difficulty: str = "medium", limit: int = 5) -> List[Dict]:
        """
        Get relevant interview questions based on a query, job description, and resume.
        
        Args:
            query: The search query
            job_description: The job description text
            resume_text: The resume text
            difficulty: The difficulty level (easy, medium, hard)
            limit: Maximum number of questions to return
            
        Returns:
            questions: A list of relevant interview questions
        """
        try:
            # Add context from job description and resume
            context = f"Job Description: {job_description}\n\nResume: {resume_text}"
            
            # Create query request using the updated Vectara API structure
            request = {
                "query": [{
                    "query": query,
                    "num_results": limit,
                    "corpus_key": [{"customer_id": VECTARA_CUSTOMER_ID, "corpus_id": self.corpus_id}],
                    "context": context,
                    "metadata_filter": f"type = 'interview_question' and difficulty = '{difficulty}'"
                }]
            }
            
            # Execute the query
            response = await self.client.query(request)
            
            # Process the results
            questions = []
            if response and "responseSet" in response and len(response["responseSet"]) > 0:
                for result in response["responseSet"][0].get("response", []):
                    text = result.get("text", "")
                    score = result.get("score", 0)
                    metadata = json.loads(result.get("metadata", "{}"))
                    
                    # Parse the question and answer from the text
                    parts = text.split("Sample Answer:")
                    question = parts[0].replace("Question:", "").strip() if len(parts) > 0 else text
                    answer = parts[1].strip() if len(parts) > 1 else ""
                    
                    questions.append({
                        "question": question,
                        "sample_answer": answer,
                        "category": metadata.get("category", "general"),
                        "difficulty": metadata.get("difficulty", difficulty),
                        "relevance_score": score
                    })
            
            return questions
            
        except Exception as e:
            print(f"Error getting interview questions: {str(e)}")
            return []
    
    async def generate_interview_question(self, job_description: str, resume_text: str, 
                                         conversation_history: List[Dict] = None,
                                         difficulty: str = "medium", focus: str = "general") -> Dict:
        """
        Generate a contextually relevant interview question based on job description and resume.
        
        Args:
            job_description: The job description text
            resume_text: The resume text
            conversation_history: Previous conversation messages
            difficulty: The difficulty level (easy, medium, hard)
            focus: The focus area (technical, behavioral, etc.)
            
        Returns:
            question_data: The generated question data
        """
        try:
            if conversation_history is None:
                conversation_history = []
            
            # Determine query based on conversation history
            if len(conversation_history) == 0:
                # First question - focus on job requirements and candidate skills
                query = f"interview question about {focus} skills for job"
            else:
                # Follow-up question - analyze previous conversation
                last_response = conversation_history[-1]["content"] if conversation_history else ""
                query = f"follow-up interview question about {focus} based on previous answer: {last_response[:100]}"
            
            # Add context from job description and resume
            context = f"Job Description: {job_description}\n\nResume: {resume_text}"
            
            # Create query request with MMR (Maximum Marginal Relevance) for diversity
            # Using updated Vectara API structure
            request = {
                "query": [{
                    "query": query,
                    "num_results": 3,  # Get multiple options to choose from
                    "corpus_key": [{"customer_id": VECTARA_CUSTOMER_ID, "corpus_id": self.corpus_id}],
                    "context": context,
                    "re_rank": "mmr",  # Use MMR for diversity
                    "mmr_diversity_bias": 0.3  # Balance between relevance and diversity
                }]
            }
            
            # Execute the query
            response = await self.client.query(request)
            
            # Process the results
            questions = []
            if response and "responseSet" in response and len(response["responseSet"]) > 0:
                for result in response["responseSet"][0].get("response", []):
                    text = result.get("text", "")
                    score = result.get("score", 0)
                    
                    # Parse the question from the text
                    if "Question:" in text:
                        question = text.split("Question:")[1].split("Sample Answer:")[0].strip()
                    else:
                        question = text
                    
                    questions.append({
                        "question": question,
                        "relevance_score": score
                    })
            
            # If no questions found or error, generate a fallback question
            if not questions:
                fallback_questions = {
                    "technical": [
                        "Can you explain your experience with the technologies mentioned in your resume?",
                        "How would you solve a problem where you need to process large amounts of data efficiently?",
                        "Tell me about a technical challenge you faced and how you overcame it."
                    ],
                    "behavioral": [
                        "Describe a situation where you had to work under pressure to meet a deadline.",
                        "Tell me about a time when you had to collaborate with a difficult team member.",
                        "How do you prioritize tasks when you have multiple competing deadlines?"
                    ],
                    "general": [
                        "Why are you interested in this position?",
                        "What do you consider your greatest professional achievement?",
                        "Where do you see yourself in 5 years?"
                    ]
                }
                
                category = focus if focus in fallback_questions else "general"
                question = random.choice(fallback_questions[category])
                
                return {
                    "question": question,
                    "is_fallback": True
                }
            
            # Select the best question (highest score)
            best_question = max(questions, key=lambda q: q["relevance_score"])
            
            return {
                "question": best_question["question"],
                "is_fallback": False
            }
            
        except Exception as e:
            print(f"Error generating interview question: {str(e)}")
            return {
                "question": "Tell me about your experience and how it relates to this position.",
                "is_fallback": True
            }

# Initialize the helper
interview_helper = VectaraInterviewHelper()

# Sample interview questions to index (can be expanded)
SAMPLE_INTERVIEW_QUESTIONS = [
    # General Questions
    {
        "question": "Tell me about yourself and how your experience relates to this position.",
        "sample_answer": "I'm a software engineer with 5 years of experience in web development, focusing on JavaScript frameworks like React and Node.js. I've worked on projects ranging from e-commerce platforms to data visualization tools, which aligns well with the requirements for this position.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "question": "What are you looking for in your next role?",
        "sample_answer": "I'm looking for a role where I can continue to grow my technical skills while taking on more leadership responsibilities. I want to work on challenging problems with a collaborative team and contribute to products that have meaningful impact. This position seems to offer that balance of technical depth and growth opportunity.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "question": "Why are you interested in working for our company?",
        "sample_answer": "I'm drawn to your company's mission of using technology to solve real-world problems. I've been following your recent projects in AI and machine learning, and I'm impressed by the innovation and impact. I also appreciate your company culture that emphasizes both technical excellence and work-life balance, which aligns with my own values.",
        "category": "general",
        "difficulty": "easy"
    },
    
    # Behavioral Questions
    {
        "question": "What is your greatest professional achievement?",
        "sample_answer": "My greatest achievement was leading a team that redesigned our company's main product, resulting in a 40% increase in user engagement and a 25% reduction in customer support tickets. I coordinated between design, development, and product teams to ensure we delivered on time and exceeded expectations.",
        "category": "behavioral",
        "difficulty": "medium"
    },
    {
        "question": "How do you handle tight deadlines and pressure?",
        "sample_answer": "I thrive under pressure by maintaining organization and clear communication. When facing tight deadlines, I break down the work into manageable tasks, prioritize them, and focus on delivering the most critical components first. I also make sure to communicate progress regularly with stakeholders.",
        "category": "behavioral",
        "difficulty": "medium"
    },
    {
        "question": "Describe a situation where you had to work with a difficult team member. How did you handle it?",
        "sample_answer": "I once worked with a team member who was resistant to new ideas and often critical in team meetings. Instead of avoiding them, I scheduled one-on-one meetings to better understand their concerns. I discovered they had valuable insights based on past experiences, but struggled with communication. By acknowledging their expertise and creating a structured way for them to provide feedback, we developed a productive working relationship that benefited the entire team.",
        "category": "behavioral",
        "difficulty": "medium"
    },
    {
        "question": "Tell me about a time when you failed. How did you handle it and what did you learn?",
        "sample_answer": "Early in my career, I underestimated the complexity of a project and committed to an unrealistic deadline. When it became clear we would miss the deadline, I immediately informed my manager, took responsibility, and proposed a revised timeline with specific milestones. From this experience, I learned the importance of thorough planning, building in buffer time, and setting realistic expectations. Now I use a more structured approach to estimating project timelines and regularly reassess progress.",
        "category": "behavioral",
        "difficulty": "hard"
    },
    {
        "question": "Describe a situation where you had to make a difficult decision with limited information. What was your approach?",
        "sample_answer": "During a critical product launch, we discovered a potential security vulnerability two days before release. With limited time to fully assess the risk, I had to decide whether to delay the launch or proceed. I quickly assembled a cross-functional team to evaluate the severity, potential impact, and mitigation options. Based on their input, I decided to delay the launch by one week to address the vulnerability. This decision was difficult but ultimately protected our users and company reputation. I learned that when facing uncertainty, it's essential to gather diverse perspectives and prioritize long-term security over short-term deadlines.",
        "category": "behavioral",
        "difficulty": "hard"
    },
    
    # Technical Questions - Python
    {
        "question": "Explain the difference between lists and tuples in Python. When would you use one over the other?",
        "sample_answer": "Lists and tuples are both sequence data types in Python, but they have key differences. Lists are mutable (can be modified after creation), while tuples are immutable (cannot be changed after creation). Lists use square brackets [] and tuples use parentheses (). I would use lists when I need a collection that will change during program execution, such as when gathering user inputs or building a result set. I would use tuples for data that should remain constant, like coordinates, database records, or dictionary keys. Tuples are also slightly more memory-efficient and faster than lists due to their immutability.",
        "category": "technical",
        "difficulty": "easy"
    },
    {
        "question": "How do you handle exceptions in Python? Provide an example of when you would use a try-except block.",
        "sample_answer": "In Python, exceptions are handled using try-except blocks. The try block contains code that might raise an exception, and the except block contains the code to execute if an exception occurs. For example, when parsing user input or reading from external files, I would use a try-except block to gracefully handle potential errors. Here's an example: try: user_input = int(input('Enter a number: ')) result = 100 / user_input except ValueError: print('Please enter a valid number') except ZeroDivisionError: print('Cannot divide by zero') except Exception as e: print(f'An unexpected error occurred: {e}') finally: print('Processing complete'). This structure allows the program to continue running even when errors occur, providing appropriate feedback instead of crashing.",
        "category": "technical",
        "difficulty": "medium"
    },
    {
        "question": "Explain the concept of decorators in Python and provide an example of how you would use them.",
        "sample_answer": "Decorators in Python are a powerful way to modify or extend the behavior of functions or methods without changing their code. They use the @decorator syntax and are essentially functions that take another function as an argument and return a new function with added functionality. I've used decorators for cross-cutting concerns like logging, timing, authentication, and caching. For example, to create a timing decorator: def timer_decorator(func): def wrapper(*args, **kwargs): start_time = time.time() result = func(*args, **kwargs) end_time = time.time() print(f'{func.__name__} executed in {end_time - start_time:.4f} seconds') return result return wrapper. Then I can apply it to any function with @timer_decorator. This separates the timing logic from the business logic, making the code more maintainable and following the single responsibility principle.",
        "category": "technical",
        "difficulty": "hard"
    },
    
    # Technical Questions - Data Structures & Algorithms
    {
        "question": "What is the time complexity of searching for an element in a binary search tree? How does it compare to searching in a linked list?",
        "sample_answer": "The time complexity of searching for an element in a balanced binary search tree is O(log n), where n is the number of nodes. This is because each comparison allows us to eliminate half of the remaining tree. In contrast, searching in a linked list has a time complexity of O(n) because, in the worst case, we need to examine each element sequentially until we find the target. This makes binary search trees much more efficient for large datasets when searching operations are frequent. However, it's important to note that if a binary search tree becomes unbalanced, its search performance can degrade to O(n) in the worst case, similar to a linked list.",
        "category": "technical",
        "difficulty": "medium"
    },
    {
        "question": "Explain how you would implement a least recently used (LRU) cache. What data structures would you use and why?",
        "sample_answer": "To implement an LRU cache, I would use a combination of a hash map (dictionary) and a doubly linked list. The hash map provides O(1) lookups by mapping keys to nodes in the linked list, while the doubly linked list maintains the order of access. When an item is accessed, I move it to the front of the list (most recently used position). When the cache reaches capacity and a new item needs to be added, I remove the item at the end of the list (least recently used). This approach gives O(1) time complexity for both get and put operations. The hash map enables fast retrieval, and the doubly linked list allows for efficient reordering and removal operations without having to search through the entire structure.",
        "category": "technical",
        "difficulty": "hard"
    },
    
    # Technical Questions - Web Development
    {
        "question": "What is the difference between cookies and local storage in web browsers?",
        "sample_answer": "Cookies and local storage are both client-side storage mechanisms, but they have several key differences. Cookies are limited to about 4KB of data, while local storage can hold around 5MB. Cookies are automatically sent with every HTTP request to the same domain, which can impact performance with larger cookies, whereas local storage data stays in the browser. Cookies can have an expiration date and can be made accessible only via HTTP (not JavaScript), making them more secure for sensitive data. Local storage persists until explicitly cleared and is always accessible via JavaScript. I typically use cookies for authentication tokens and user preferences that need to be server-accessible, and local storage for larger datasets and application state that only needs to be available to the client-side application.",
        "category": "technical",
        "difficulty": "medium"
    },
    {
        "question": "Explain the concept of Cross-Origin Resource Sharing (CORS) and why it's important for web security.",
        "sample_answer": "Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. This is known as the same-origin policy. CORS works through HTTP headers that tell the browser which origins are permitted to access resources. It's important because it prevents malicious websites from making unauthorized requests to other domains using the user's credentials, which could lead to data theft or unauthorized actions. For example, without CORS, a malicious site could make API calls to a user's banking website if they're logged in. As a developer, I implement CORS by configuring server responses with appropriate Access-Control-Allow-Origin headers, carefully considering which origins should have access to my API resources, and using techniques like CSRF tokens for additional protection against cross-site request forgery attacks.",
        "category": "technical",
        "difficulty": "hard"
    },
    
    # Technical Questions - System Design
    {
        "question": "Explain a complex technical concept you understand well to someone without technical background.",
        "sample_answer": "I'd explain machine learning as teaching computers to learn from examples rather than explicit programming. It's like how humans learn - we see examples and recognize patterns. For instance, if you show a child many pictures of cats, they learn to identify cats. Similarly, we can feed a computer thousands of labeled images, and it learns to recognize patterns that define what a cat looks like.",
        "category": "technical",
        "difficulty": "hard"
    },
    {
        "question": "How would you design a system to handle millions of concurrent users?",
        "sample_answer": "I would approach this by implementing a scalable architecture with load balancing, caching, and database sharding. First, I'd use a CDN to distribute static content globally. Then, I'd implement horizontal scaling with multiple application servers behind load balancers. For the database layer, I'd use read replicas and potentially sharding for write operations. Finally, I'd implement caching at multiple levels to reduce database load.",
        "category": "technical",
        "difficulty": "hard"
    },
    {
        "question": "Describe how you would design a URL shortening service like bit.ly.",
        "sample_answer": "For a URL shortening service, I'd design a system with several key components. First, an API gateway to handle incoming requests for both creating short URLs and redirecting. For the core functionality, I'd use a hash function to generate a unique short code for each URL, ensuring it's collision-resistant. I'd store the mapping between short codes and original URLs in a database, using a NoSQL database like DynamoDB for its scalability and fast key-value lookups. To improve performance, I'd implement caching with Redis to store frequently accessed URLs. For analytics, I'd use a separate data pipeline to track clicks and user metrics without slowing down the main service. To handle scale, I'd make the service stateless and horizontally scalable, deploying it across multiple regions for global availability. Finally, I'd implement rate limiting to prevent abuse and ensure the service remains available for all users.",
        "category": "technical",
        "difficulty": "hard"
    },
    
    # Technical Questions - Machine Learning
    {
        "question": "What is the difference between supervised and unsupervised learning?",
        "sample_answer": "Supervised and unsupervised learning are two fundamental approaches in machine learning that differ primarily in the type of data they use and their objectives. Supervised learning uses labeled data, where each training example has an input and the correct output. The algorithm learns to map inputs to outputs, making it suitable for classification (predicting categories) and regression (predicting continuous values) tasks. Examples include spam detection or house price prediction. Unsupervised learning, on the other hand, works with unlabeled data and aims to find patterns or structures within the data without predefined outputs. Common unsupervised techniques include clustering (grouping similar data points), dimensionality reduction (simplifying data while preserving important information), and anomaly detection (identifying outliers). The choice between these approaches depends on the available data and the specific problem I'm trying to solve.",
        "category": "technical",
        "difficulty": "medium"
    },
    
    # Situational Questions
    {
        "question": "How would you approach working on a project with unclear requirements?",
        "sample_answer": "When facing unclear requirements, I first seek to understand the core business objectives behind the project. I schedule meetings with stakeholders to ask clarifying questions and document their responses. I then create a draft specification with my understanding and share it for feedback. For complex projects, I might propose breaking it into smaller phases, starting with a minimum viable product (MVP) that addresses the most critical needs. Throughout development, I maintain regular communication with stakeholders, showing them incremental progress and gathering feedback. This iterative approach helps refine requirements over time while still making forward progress. I've found that visualizations like wireframes or prototypes are particularly effective at uncovering unstated requirements and aligning expectations early in the process.",
        "category": "situational",
        "difficulty": "medium"
    },
    {
        "question": "If you joined our team and found that our codebase had significant technical debt, how would you approach addressing it while still delivering new features?",
        "sample_answer": "Balancing technical debt reduction with new feature development requires a strategic approach. First, I would assess and categorize the technical debt to understand its impact on development velocity, system stability, and security. Then, I would propose a gradual refactoring strategy that follows the 'boy scout rule' - leave the code better than you found it. This means improving code we touch while implementing new features. For critical issues that pose security risks or frequently cause bugs, I would advocate for dedicated time to address them, presenting a business case that quantifies the cost of not fixing them. I would also implement better practices moving forward, such as code reviews, automated testing, and documentation, to prevent accumulating more debt. In my experience, communicating the business value of addressing technical debt in terms of increased development speed and reduced bugs is key to getting stakeholder buy-in for this approach.",
        "category": "situational",
        "difficulty": "hard"
    }
]

async def initialize_vectara_corpus():
    """
    Initialize connection to the Vectara corpus with existing interview questions.
    This should be called once when the application starts.
    """
    try:
        print("Testing Vectara connection...")
        # Test connection to Vectara before proceeding
        connection_successful = await vectara_client.test_connection()
        
        if not connection_successful:
            print("WARNING: Could not connect to Vectara. Using fallback interview questions.")
            return False
            
        print("Vectara connection successful. Using existing corpus data from https://console.vectara.com/console/corpus/key/cruzhacks/data")
        return True
                
        print(f"Successfully initialized Vectara corpus with {question_count} sample interview questions")
        return True
    except Exception as e:
        print(f"Error initializing Vectara corpus: {str(e)}")
        return False
