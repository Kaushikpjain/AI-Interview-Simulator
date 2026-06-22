import os
import json
import time
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError  # Catch exact API infrastructure exceptions

# Load environment configuration
load_dotenv()

app = Flask(__name__)

# Verify API authentication configuration
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from the environment configuration profile (.env).")

# Initialize the Gemini GenAI Client
client = genai.Client(api_key=api_key)

DB_FILE = "interviews.db"

def init_db():
    """Initializes the SQLite relational database schema."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                date_timestamp TEXT NOT NULL,
                average_score REAL DEFAULT 0.0
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interview_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                score INTEGER NOT NULL,
                strengths TEXT,
                weaknesses TEXT,
                suggestions TEXT,
                FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
            )
        ''')
        conn.commit()

# Ensure tables are built upon initialization
init_db()

def call_gemini_with_retry(prompt, response_schema, max_retries=3, initial_delay=2):
    """
    Executes content generation requests via the GenAI SDK, utilizing an 
    exponential backoff retry routine to handle transient 503 server overloads.
    """
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema
                )
            )
            return response.text
        except APIError as e:
            # Catch transient 503 errors or explicit rate-limit thresholds
            if e.code == 503 or "503" in str(e):
                if attempt == max_retries - 1:
                    raise e  # Propagate error forward if retries are completely exhausted
                
                print(f"[API Warning] 503 Unavailable encountered. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff modifier multiplication loop
            else:
                raise e  # Immediately propagate non-transient API failures (e.g., invalid key)
        except Exception as e:
            raise e

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get-history', methods=['GET'])
def get_history():
    """Fetches all past historical interview metrics entries from the database."""
    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, role, date_timestamp, average_score FROM interviews ORDER BY id DESC")
            history = [dict(row) for row in cursor.fetchall()]
        return jsonify({"history": history}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    """Generates exactly 5 structured questions and registers the initial database log entry."""
    try:
        data = request.get_json() or {}
        role = data.get("role")
        if not role:
            return jsonify({"error": "No role selected."}), 400

        prompt = f"You are an expert technical interviewer. Generate exactly 5 challenging technical and behavioral interview questions for a candidate interviewing for the role of: {role}."
        
        schema = types.Schema(
            type=types.Type.OBJECT,
            properties={
                "questions": types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING)
                )
            },
            required=["questions"]
        )
        
        # Call the new resilient retry workflow method
        response_text = call_gemini_with_retry(prompt, schema)
        parsed_data = json.loads(response_text)
        
        if "questions" not in parsed_data or len(parsed_data["questions"]) != 5:
            raise ValueError("Incomplete structured payload array received from AI engine.")

        # Log session instantiation inside relational storage schema
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO interviews (role, date_timestamp, average_score) VALUES (?, ?, ?)",
                (role, timestamp, 0.0)
            )
            interview_id = cursor.lastrowid
            conn.commit()

        return jsonify({
            "interview_id": interview_id,
            "questions": parsed_data["questions"]
        }), 200

    except Exception as e:
        return jsonify({"error": f"API Overload Recovery Failure: {str(e)}. The server is heavily loaded, please click start again."}), 500

@app.route('/evaluate-answer', methods=['POST'])
def evaluate_answer():
    """Evaluates input entries dynamically and logs metrics matching foreign key relations."""
    try:
        data = request.get_json() or {}
        interview_id = data.get("interview_id")
        question = data.get("question")
        answer = data.get("answer")

        if not all([interview_id, question, answer]):
            return jsonify({"error": "Missing structural validation request payloads."}), 400

        prompt = f"""
        You are an expert technical interviewer evaluating an engineering candidate's response.
        Question: {question}
        Candidate Answer: {answer}
        Evaluate accurately and output raw metric calculations.
        """

        schema = types.Schema(
            type=types.Type.OBJECT,
            properties={
                "score": types.Schema(type=types.Type.INTEGER),
                "strengths": types.Schema(type=types.Type.STRING),
                "weaknesses": types.Schema(type=types.Type.STRING),
                "suggestions": types.Schema(type=types.Type.STRING)
            },
            required=["score", "strengths", "weaknesses", "suggestions"]
        )

        # Call the resilient retry workflow method
        response_text = call_gemini_with_retry(prompt, schema)
        evaluation = json.loads(response_text)

        # Log itemized evaluation step details to database
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO evaluations (interview_id, question, answer, score, strengths, weaknesses, suggestions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                interview_id, question, answer, 
                evaluation["score"], evaluation["strengths"], 
                evaluation["weaknesses"], evaluation["suggestions"]
            ))
            conn.commit()

        return jsonify(evaluation), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/finalize-interview', methods=['POST'])
def finalize_interview():
    """Computes final mathematical run averages and patches historical master session tables."""
    try:
        data = request.get_json() or {}
        interview_id = data.get("interview_id")
        if not interview_id:
            return jsonify({"error": "Missing reference session token identifiers."}), 400

        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT score FROM evaluations WHERE interview_id = ?", (interview_id,))
            scores = [row[0] for row in cursor.fetchall()]
            
            if not scores:
                return jsonify({"error": "No matching question items found."}), 404
                
            avg_score = round(sum(scores) / len(scores), 1)
            cursor.execute("UPDATE interviews SET average_score = ? WHERE id = ?", (avg_score, interview_id))
            conn.commit()

        return jsonify({"success": True, "average_score": avg_score}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)