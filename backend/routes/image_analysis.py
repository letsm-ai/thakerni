"""
Image analysis endpoint — GPT-5.2 Vision via Emergent Integrations.
Analyzes uploaded images and returns AI-generated descriptions.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from database import db, EMERGENT_LLM_KEY
from auth_helpers import get_current_user
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from datetime import datetime, timezone
import base64
import uuid
import logging

logger = logging.getLogger(__name__)
image_router = APIRouter(prefix="/api")


@image_router.post("/image/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Form(default="Describe this image in detail. If there's text, read it. If there's a document, summarize it."),
    user: dict = Depends(get_current_user)
):
    """Analyze an uploaded image using GPT-5.2 Vision."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp"}
    content_type = file.content_type or ""
    if content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {content_type}. Use JPEG, PNG, or WEBP.")

    # Read and encode
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")

    image_b64 = base64.b64encode(content).decode("utf-8")

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img_{uuid.uuid4().hex[:8]}",
            system_message="You are an expert image analyst. Describe images accurately and thoroughly. Support Arabic and English — respond in the user's language."
        )
        chat.with_model("openai", "gpt-4o-mini")

        image_content = ImageContent(image_base64=image_b64)
        user_message = UserMessage(text=prompt, file_contents=[image_content])
        analysis = await chat.send_message(user_message)

        # Save to DB
        record_id = f"img_{uuid.uuid4().hex[:12]}"
        await db.image_analyses.insert_one({
            "analysis_id": record_id,
            "user_id": user["user_id"],
            "filename": file.filename,
            "prompt": prompt,
            "analysis": analysis,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"analysis": analysis, "analysis_id": record_id}

    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        if "budget" in str(e).lower():
            raise HTTPException(status_code=429, detail="AI budget exceeded. Please top up your Universal Key.")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)[:100]}")


@image_router.get("/image/history")
async def get_image_history(user: dict = Depends(get_current_user)):
    """Get user's image analysis history."""
    records = await db.image_analyses.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"analyses": records}
