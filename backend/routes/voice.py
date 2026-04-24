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

    # Convert ogg/opus to mp3 (Whisper doesn't support ogg)
    mp3_path = None
    file_to_transcribe = tmp_path
    if suffix.lower() in ('.ogg', '.opus', '.oga'):
        mp3_path = tmp_path.replace(suffix, '.mp3')
        try:
            import subprocess
            result = subprocess.run(
                ['ffmpeg', '-i', tmp_path, '-y', '-ar', '16000', '-ac', '1', mp3_path],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0 and os.path.exists(mp3_path):
                file_to_transcribe = mp3_path
                logger.info("Converted ogg to mp3 successfully")
            else:
                logger.error(f"ffmpeg error: {result.stderr[:200]}")
        except Exception as e:
            logger.error(f"Conversion error: {e}")

    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)

        with open(file_to_transcribe, "rb") as audio_file:
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
        if mp3_path and os.path.exists(mp3_path):
            os.unlink(mp3_path)
