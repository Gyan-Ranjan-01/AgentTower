from __future__ import annotations
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DOCUMENTS_FILE = Path(__file__).resolve().parent / "documents.json"


class LocalRetriever:
    """Local offline TF-IDF retriever for enterprise documents. Requires no external embedding API."""

    def __init__(self, documents_path: Path = DOCUMENTS_FILE):
        self.documents_path = documents_path
        self.documents: List[Dict[str, Any]] = []
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = None
        self.load_corpus()

    def load_corpus(self) -> None:
        if not self.documents_path.exists():
            self.documents = []
            return
        with open(self.documents_path, "r", encoding="utf-8") as f:
            self.documents = json.load(f)

        if self.documents:
            corpus_texts = [f"{d['title']} {d['content']}" for d in self.documents]
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus_texts)

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        force_department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top matching documents.
        If force_department is provided, prioritizes or filters by that department.
        """
        if not self.documents or self.tfidf_matrix is None:
            return []

        # If force_department is specified, check if query specifically targets that department
        if force_department:
            dept_docs = [d for d in self.documents if d.get("department") == force_department]
            if dept_docs:
                dept_texts = [f"{d['title']} {d['content']}" for d in dept_docs]
                vec = TfidfVectorizer(stop_words="english")
                mat = vec.fit_transform(dept_texts)
                q_vec = vec.transform([query])
                scores = cosine_similarity(q_vec, mat)[0]
                ranked_indices = scores.argsort()[::-1][:top_k]
                return [dept_docs[i] for i in ranked_indices]

        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        ranked_indices = scores.argsort()[::-1][:top_k]

        return [self.documents[i] for i in ranked_indices]


local_retriever = LocalRetriever()

