from .grammar import GRAMMAR
from .classifier import IntentClassifier
from .escalation import LLMRouter

class VoiceRouter:
    def __init__(self):
        self.classifier = IntentClassifier()
        self.llm_router = LLMRouter()
        
    def route(self, transcript: str):
        # Tier 0: Grammar
        for pattern, skill in GRAMMAR.items():
            if __import__('re').search(pattern, transcript):
                return skill
                
        # Tier 1: Classifier
        skill, confidence = self.classifier.predict(transcript)
        if confidence > 0.75:
            return skill
            
        # Tier 2: LLM Escalation
        return self.llm_router.route(transcript)
