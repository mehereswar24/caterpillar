from fastapi import APIRouter
from pydantic import BaseModel
from core.router.router import VoiceRouter

router = APIRouter()
voice_router = VoiceRouter()

class VoiceRespondReq(BaseModel):
    transcript: str
    operator_id: str
    machine_id: str

@router.post('/transcribe')
async def transcribe():
    return {"transcript": "what oil does the engine take?", "confidence": 0.95}

@router.post('/respond')
async def respond(req: VoiceRespondReq):
    transcript = req.transcript.lower()
    
    # Send through the multi-tier router
    skill_id = voice_router.route(transcript)
    action_taken = "none"
    speech_text = "I didn't quite catch that."
    
    # Handle known T0/T1 intents
    if skill_id == "task.estimate":
        speech_text = "Estimated 52 minutes, plus or minus 9. Wet soil adds 18 minutes."
    elif skill_id == "safety.log_incident":
        speech_text = "Incident logged with timestamp and camera snapshot."
        action_taken = "log_incident"
    elif skill_id == "anomaly.idle_check":
        speech_text = "You idled 58 minutes today. Fuel cost is approximately 3.2 litres."
    elif skill_id == "operator.safety_score":
        speech_text = "Your safety score today is 84 out of 100. One seatbelt alert."
    elif skill_id == "machine.fault_check":
        speech_text = "Checking machine faults. Everything looks normal."
    else:
        # T2 Escalation (RAG / LLM)
        from core.router.escalation import LLMRouter
        llm = LLMRouter()
        speech_text, skill_id = llm.route_and_respond(req.transcript)
    
    return {
        "speech_text": speech_text,
        "action_taken": action_taken,
        "skill_id": skill_id
    }
