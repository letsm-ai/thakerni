"""
Voice transcription endpoint for WhatsApp voice messages.
Uses OpenAI Whisper via Emergent Integrations.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from database import EMERGENT_LLM_KEY
from emergentintegrations.llm.openai import OpenAISpeechToText
import tempfile
import os
import logging

logger = logging.getLogger(__name__)
voice_router = APIRouter(prefix="/api")


@voice_router.post("/whatsapp/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Transcribe a voice message (ogg/mp3/wav/m4a) to text using Whisper."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    # Save uploaded file to temp
    suffix = os.path.splitext(file.filename or "audio.ogg")[1] or ".ogg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)

        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json"
            )

        text = response.text.strip() if response and response.text else ""
        logger.info(f"Transcribed voice: {text[:80]}...")
        return {"text": text, "success": True}

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"text": "", "success": False, "error": str(e)[:100]}
    finally:
        os.unlink(tmp_path)
