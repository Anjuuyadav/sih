import pickle
import sys
import json

# Load model
with open("sentiment_model.pkl", "rb") as file:
    model = pickle.load(file)

# Load TF-IDF vectorizer
with open("tfidf_vectorizer.pkl", "rb") as file:
    tfidf = pickle.load(file)


# Get feedback from command line
feedback = sys.argv[1]

# Convert feedback to TF-IDF
feedback_tfidf = tfidf.transform([feedback])

# Predict sentiment
prediction = model.predict(feedback_tfidf)[0]

# Get confidence
probabilities = model.predict_proba(feedback_tfidf)[0]
confidence = max(probabilities) * 100

# Return result as JSON
result = {
    "sentiment": prediction,
    "confidence": round(confidence, 2)
}

print(json.dumps(result))