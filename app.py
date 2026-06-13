import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Initialize the Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set in .env file.")
client = genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json() or {}
    role = data.get('role')
    
    if not role:
        return jsonify({"error": "Role selection is required"}), 400

    prompt = f"""
    You are an expert technical recruiter. Generate exactly 5 distinct technical interview questions 
    tailored specifically for a {role} role. 
    Return the questions strictly as a JSON object with a single key 'questions' containing an array of strings.
    Do not wrap the response in markdown code blocks like ```json.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        
        # Parse the JSON string received from Gemini
        questions_data = json.loads(response.text)
        return jsonify(questions_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate questions: {str(e)}"}), 500

@app.route('/evaluate-answer', methods=['POST'])
def evaluate_answer():
    data = request.get_json() or {}
    question = data.get('question')
    answer = data.get('answer', '').strip()

    if not question:
        return jsonify({"error": "Question is required for evaluation"}), 400
    if not answer:
        return jsonify({"error": "Answer cannot be empty"}), 400

    prompt = f"""
    You are an experienced technical interviewer.
    
    Question: {question}
    Candidate Answer: {answer}
    
    Evaluate the answer and return a JSON object containing exactly these fields:
    - score (an integer out of 10)
    - strengths (string or list of strings)
    - weaknesses (string or list of strings)
    - suggestions (string or list of strings)
    
    Return ONLY the raw JSON object. Do not format with markdown blocks.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        
        evaluation_data = json.loads(response.text)
        return jsonify(evaluation_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to evaluate answer: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)