# AI Interview Simulator

A full-stack web application that simulates technical interviews using Google's Gemini AI. Users can select a target role, answer AI-generated interview questions, receive instant feedback, and review their overall performance through a detailed score report.

This project demonstrates AI integration, API development, frontend-backend communication, state management, and structured response handling using a lightweight Flask architecture and vanilla JavaScript.

---

## Features

* Generate 5 role-specific interview questions dynamically using Gemini AI.
* Support multiple technical domains such as:

  * AI/ML Engineer
  * Data Scientist
  * Full Stack Developer
  * Backend Developer
  * Frontend Developer
  * Software Engineer
* Receive instant evaluation for each answer.
* Get a score out of 10 for every response.
* View strengths, weaknesses, and improvement suggestions.
* Track progress throughout the interview session.
* Receive a final performance report with average score and overall feedback.
* Clean and responsive user interface built with vanilla HTML, CSS, and JavaScript.

---

## Tech Stack

### Backend
* Python 3
* Flask

### AI Integration
* Google Gemini 2.5 Flash
* Google GenAI SDK

### Frontend
* HTML5
* CSS3
* JavaScript (ES6)

### Configuration
* Python Dotenv

---

## Architecture Overview
The application follows a simple three-layer architecture:

### Frontend
Handles user interaction, interview flow, score tracking, and communication with the backend using the Fetch API.

### Backend
Flask manages API endpoints, processes requests, communicates with Gemini, and returns structured JSON responses.

### AI Layer
Gemini generates interview questions and evaluates user responses using carefully designed prompts and JSON-formatted outputs.

---

## Project Structure
```text
AI-Interview-Simulator/
│
├── static/
│   ├── script.js
│   └── style.css
│
├── templates/
│   └── index.html
│
├── app.py
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

---

## Prerequisites
Before running the project, ensure you have:

* Python 3.11 or later
* pip installed
* A Gemini API key from Google AI Studio

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Kaushikpjain/AI-Interview-Simulator.git
cd AI-Interview-Simulator
```

### Create a Virtual Environment

#### macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Windows
```bash
python -m venv venv
venv\Scripts\activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Environment Variables
Create a `.env` file in the project root directory:

```env
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Gemini API key.

---

## Running the Application
Start the Flask server:
```bash
python app.py
```

Open your browser and visit:
```text
http://127.0.0.1:5000
```

---

## How It Works
```text
User
  ↓
Select Role
  ↓
Frontend Sends Request
  ↓
Flask Backend
  ↓
Gemini AI Generates Questions
  ↓
User Answers Questions
  ↓
Gemini Evaluates Responses
  ↓
Score & Feedback Returned
  ↓
Final Performance Report Generated
```

---

## Usage Guide
1. Select a target role.
2. Click **Start Interview**.
3. Answer the generated interview question.
4. Submit your answer.
5. Review the feedback and score.
6. Continue until all 5 questions are completed.
7. View the final performance summary.

---

## Example Evaluation Response
```json
{
  "score": 8,
  "strengths": "Good understanding of the concept and clear explanation.",
  "weaknesses": "Missed some advanced technical details.",
  "suggestions": "Include implementation details and practical examples."
}
```

---
## Learning Outcomes

This project helped demonstrate:
* REST API development using Flask
* AI application development using Gemini
* Prompt engineering and structured JSON outputs
* Frontend-backend communication
* Client-side state management
* Environment variable security practices
* Building full-stack AI-powered applications

---

## Future Enhancements
* Voice-based interview mode
* Resume upload and analysis
* User authentication
* Interview history tracking
* Export reports as PDF
* Follow-up question generation
* Database integration for persistent storage
* Coding interview mode with code editor support

---

## Author
**Kaushik P Jain**
Computer Science Engineering (AI & ML)
SRMIST