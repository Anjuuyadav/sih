from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

# Load model and vectorizer
model = joblib.load("sentiment_model.pkl")
vectorizer = joblib.load("tfidf_vectorizer.pkl")


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "Please provide text"}), 400

    text = data["text"]

    # Convert text into TF-IDF features
    text_vector = vectorizer.transform([text])

    # Predict sentiment
    prediction = model.predict(text_vector)[0]

    # Get confidence
    probabilities = model.predict_proba(text_vector)[0]
    confidence = max(probabilities) * 100

    return jsonify({
        "sentiment": prediction,
        "confidence": round(confidence, 2)
    })


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Panchakarma Sentiment Analysis API is running"
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)