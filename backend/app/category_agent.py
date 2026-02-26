"""
CategoryAgent: TF-IDF + LogisticRegression text classifier for Department 56 item categorization.
Learns series/category from item name + description via online training.
"""
import pickle, base64, io, logging
from typing import Optional
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

MIN_SAMPLES_TO_PREDICT = 5
CONFIDENCE_THRESHOLD = 0.70

class CategoryAgent:
    def __init__(self):
        self.pipeline: Optional[Pipeline] = None
        self.label_encoder = LabelEncoder()
        self.training_samples: int = 0
        self.version: int = 1
        self._X: list[str] = []
        self._y: list[str] = []

    def predict(self, name: str, description: str = "") -> dict:
        if self.pipeline is None or self.training_samples < MIN_SAMPLES_TO_PREDICT:
            return {}
        text = f"{name} {description}".strip()
        proba = self.pipeline.predict_proba([text])[0]
        confidence = float(proba.max())
        if confidence < CONFIDENCE_THRESHOLD:
            return {}
        label_idx = proba.argmax()
        predicted = self.label_encoder.inverse_transform([label_idx])[0]
        return {"series": predicted, "confidence": round(confidence, 3), "training_samples": self.training_samples, "model_version": self.version}

    def learn(self, name: str, description: str, correct_series: str) -> None:
        text = f"{name} {description}".strip()
        self._X.append(text)
        self._y.append(correct_series)
        self.training_samples = len(self._X)
        if self.training_samples >= MIN_SAMPLES_TO_PREDICT:
            self._retrain()

    def _retrain(self) -> None:
        unique_labels = list(set(self._y))
        if len(unique_labels) < 2:
            return
        self.label_encoder.fit(unique_labels)
        y_encoded = self.label_encoder.transform(self._y)
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ('clf', LogisticRegression(max_iter=500, C=1.0)),
        ])
        self.pipeline.fit(self._X, y_encoded)
        self.version += 1
        logger.info("CategoryAgent retrained: %d samples, %d classes", self.training_samples, len(unique_labels))

    def get_series_distribution(self) -> dict:
        counts = {}
        for label in self._y:
            counts[label] = counts.get(label, 0) + 1
        return counts

    def serialize(self) -> str:
        state = {'pipeline': self.pipeline, 'label_encoder': self.label_encoder, 'training_samples': self.training_samples, 'version': self.version, 'X': self._X, 'y': self._y}
        buf = io.BytesIO()
        pickle.dump(state, buf)
        return base64.b64encode(buf.getvalue()).decode()

    @classmethod
    def deserialize(cls, data: str) -> 'CategoryAgent':
        buf = io.BytesIO(base64.b64decode(data))
        state = pickle.load(buf)
        agent = cls()
        agent.pipeline = state['pipeline']
        agent.label_encoder = state['label_encoder']
        agent.training_samples = state['training_samples']
        agent.version = state['version']
        agent._X = state['X']
        agent._y = state['y']
        return agent
