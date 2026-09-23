from core.rag import SimpleRAG

class LLMRouter:
    def __init__(self):
        self.rag = SimpleRAG()

    def route_and_respond(self, transcript: str):
        # 1. Check RAG context
        prompt = self.rag.format_prompt(transcript)
        
        if prompt:
            # In production, this sends 'prompt' to Ollama (Qwen2.5:7b)
            # For the demo, we will simulate the LLM's answer based on the retrieved context
            context_retrieved = self.rag.retrieve(transcript)
            
            # Simple mock LLM logic based on what was retrieved
            if "E360" in transcript.upper() or "hydraulic temp" in transcript.lower():
                return "The E360 alarm means your hydraulic fluid is over 95 degrees Celsius. Stop operating immediately and cycle the boom without load at low idle to cool it down.", "rag.troubleshooting"
            elif "oil" in transcript.lower() and "engine" in transcript.lower():
                return "You need to use CAT DEO 15W-40 for the engine oil, and change it every 250 hours.", "rag.maintenance"
            elif "reach" in transcript.lower() or "deep" in transcript.lower():
                return "The excavator has a maximum digging depth of 6.7 meters and a ground reach of 9.8 meters.", "rag.specs"
                
            # Generic fallback that uses the first piece of context
            return f"According to the manual: {context_retrieved[0]}", "rag.generic"
            
        return "I couldn't find that in the manual. Do you want me to connect you to a supervisor?", "fallback"
