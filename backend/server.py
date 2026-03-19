from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Models ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class MoodCheckinRequest(BaseModel):
    mood: str

class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class SubscriptionCheckoutRequest(BaseModel):
    origin_url: str

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── AI Helper ────────────────────────────────────────────────────────────────

async def generate_ai_content(prompt: str, system_msg: str, session_id: str = None) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ['EMERGENT_LLM_KEY']
    sid = session_id or str(uuid.uuid4())
    chat = LlmChat(api_key=api_key, session_id=sid, system_message=system_msg)
    chat.with_model("openai", "gpt-4o")
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    return response

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "is_premium": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    user_safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_safe}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    user_safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_safe}

# ─── User Profile ─────────────────────────────────────────────────────────────

@api_router.get("/user/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    user_safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    total_checkins = await db.mood_checkins.count_documents({"user_id": user["id"]})
    user_safe["total_checkins"] = total_checkins
    return user_safe

# ─── Daily Affirmation ────────────────────────────────────────────────────────

@api_router.get("/affirmation")
async def get_daily_affirmation(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cached = await db.affirmations.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    if cached:
        return {"affirmation": cached["affirmation"], "date": today}

    recent_checkin = await db.mood_checkins.find_one(
        {"user_id": user["id"]},
        sort=[("created_at", -1)],
        projection={"_id": 0}
    )
    mood_context = f"Their recent mood was '{recent_checkin['mood']}'." if recent_checkin else "No recent mood data available."

    prompt = f"Generate a warm, personalized daily affirmation for someone named {user['name']}. {mood_context} Make it uplifting, spiritual, and grounding. Keep it to 2-3 sentences. Only return the affirmation text, nothing else."
    system_msg = "You are a compassionate spiritual wellness guide. Generate heartfelt, peaceful affirmations that combine mindfulness with gentle faith-based encouragement."

    affirmation = await generate_ai_content(prompt, system_msg)
    await db.affirmations.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": today,
        "affirmation": affirmation,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"affirmation": affirmation, "date": today}

# ─── Mood Check-in ────────────────────────────────────────────────────────────

@api_router.post("/checkin")
async def create_checkin(req: MoodCheckinRequest, user: dict = Depends(get_current_user)):
    mood = req.mood.lower()
    valid_moods = ["stressed", "calm", "sad", "angry", "happy", "anxious", "grateful", "tired"]
    if mood not in valid_moods:
        raise HTTPException(status_code=400, detail=f"Invalid mood. Choose from: {', '.join(valid_moods)}")

    # Generate all three AI responses
    base_system = "You are a compassionate spiritual wellness counselor. Be warm, grounding, and faith-inspired."

    motivational_prompt = f"The user is feeling {mood}. Generate a short, powerful motivational message (2-3 sentences) to uplift them. Only return the message."
    scripture_prompt = f"The user is feeling {mood}. Share one relevant scripture or spiritual verse that addresses this emotion, with a brief 1-sentence explanation of how it applies. Format: 'verse - explanation'."
    exercise_prompt = f"The user is feeling {mood}. Provide a short grounding exercise (3-5 steps, each one sentence) they can do right now to find peace. Number each step."

    try:
        motivational = await generate_ai_content(motivational_prompt, base_system)
        scripture = await generate_ai_content(scripture_prompt, base_system)
        exercise = await generate_ai_content(exercise_prompt, base_system)
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        motivational = "You are stronger than you know. Every moment is a chance to begin again."
        scripture = "\"Peace I leave with you; my peace I give you.\" - John 14:27 - Even in turbulent times, inner peace is always available to you."
        exercise = "1. Close your eyes and take three deep breaths.\n2. Feel your feet firmly on the ground.\n3. Name five things you can see around you.\n4. Place your hand on your heart and feel its rhythm.\n5. Whisper to yourself: 'I am here. I am safe. I am enough.'"

    checkin_id = str(uuid.uuid4())
    checkin = {
        "id": checkin_id,
        "user_id": user["id"],
        "mood": mood,
        "motivational_message": motivational,
        "scripture": scripture,
        "grounding_exercise": exercise,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mood_checkins.insert_one(checkin)
    checkin.pop("_id", None)
    return checkin

@api_router.get("/checkins")
async def get_checkins(user: dict = Depends(get_current_user)):
    checkins = await db.mood_checkins.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return checkins

# ─── AI Chat ──────────────────────────────────────────────────────────────────

@api_router.post("/chat")
async def send_chat_message(req: ChatMessageRequest, user: dict = Depends(get_current_user)):
    # Check premium for unlimited chats
    if not user.get("is_premium"):
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_count = await db.chat_messages.count_documents({
            "user_id": user["id"],
            "role": "user",
            "created_at": {"$gte": today_start}
        })
        if today_count >= 5:
            raise HTTPException(status_code=403, detail="Daily chat limit reached. Upgrade to Premium for unlimited chats.")

    session_id = req.session_id or str(uuid.uuid4())

    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "role": "user",
        "content": req.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_msg)

    # Get recent history for context
    recent_msgs = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    recent_msgs.reverse()

    history_text = "\n".join([f"{'User' if m['role'] == 'user' else 'Guide'}: {m['content']}" for m in recent_msgs[:-1]])
    context = f"Conversation history:\n{history_text}\n\nUser: {req.message}" if history_text else req.message

    system_msg = "You are Peace Within's spiritual wellness guide. You provide compassionate, faith-inspired advice about relationships, stress management, and personal growth. Be warm, empathetic, and practical. Keep responses concise (3-5 sentences). Reference scripture or spiritual wisdom when appropriate."

    try:
        ai_response = await generate_ai_content(context, system_msg, f"chat_{session_id}_{uuid.uuid4()}")
    except Exception as e:
        logger.error(f"Chat AI error: {e}")
        ai_response = "I'm here for you. Take a deep breath and know that this moment will pass. Would you like to share more about what's on your mind?"

    # Save AI response
    ai_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "role": "assistant",
        "content": ai_response,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(ai_msg)
    ai_msg.pop("_id", None)
    user_msg.pop("_id", None)

    return {"session_id": session_id, "user_message": user_msg, "ai_message": ai_msg}

@api_router.get("/chat/history")
async def get_chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

@api_router.get("/chat/sessions")
async def get_chat_sessions(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": "$session_id", "last_message": {"$last": "$content"}, "last_at": {"$last": "$created_at"}, "count": {"$sum": 1}}},
        {"$sort": {"last_at": -1}},
        {"$limit": 20}
    ]
    sessions = await db.chat_messages.aggregate(pipeline).to_list(20)
    return [{"session_id": s["_id"], "last_message": s["last_message"], "last_at": s["last_at"], "message_count": s["count"]} for s in sessions]

# ─── Progress Tracker ─────────────────────────────────────────────────────────

@api_router.get("/progress")
async def get_progress(user: dict = Depends(get_current_user)):
    checkins = await db.mood_checkins.find(
        {"user_id": user["id"]},
        {"_id": 0, "mood": 1, "created_at": 1}
    ).sort("created_at", 1).to_list(200)

    mood_scores = {"happy": 5, "grateful": 5, "calm": 4, "tired": 2, "sad": 2, "anxious": 1, "stressed": 1, "angry": 1}

    # Weekly summary
    weekly_data = {}
    for c in checkins:
        date_str = c["created_at"][:10]
        score = mood_scores.get(c["mood"], 3)
        if date_str not in weekly_data:
            weekly_data[date_str] = {"total": 0, "count": 0, "moods": []}
        weekly_data[date_str]["total"] += score
        weekly_data[date_str]["count"] += 1
        weekly_data[date_str]["moods"].append(c["mood"])

    daily_scores = []
    for date, data in weekly_data.items():
        daily_scores.append({
            "date": date,
            "avg_score": round(data["total"] / data["count"], 1),
            "moods": data["moods"],
            "checkin_count": data["count"]
        })

    # Mood distribution
    mood_counts = {}
    for c in checkins:
        mood_counts[c["mood"]] = mood_counts.get(c["mood"], 0) + 1

    total = len(checkins)
    streak = 0
    if checkins:
        for i in range(30):
            d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            if d in weekly_data:
                streak += 1
            else:
                break

    return {
        "daily_scores": daily_scores[-30:],
        "mood_distribution": mood_counts,
        "total_checkins": total,
        "current_streak": streak,
        "avg_score": round(sum(mood_scores.get(c["mood"], 3) for c in checkins) / max(total, 1), 1)
    }

# ─── Subscription / Stripe ────────────────────────────────────────────────────

SUBSCRIPTION_PRICE = 5.99

@api_router.post("/subscription/checkout")
async def create_subscription_checkout(req: SubscriptionCheckoutRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    stripe_key = os.environ['STRIPE_API_KEY']
    host_url = req.origin_url.rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)

    success_url = f"{host_url}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/profile"

    checkout_req = CheckoutSessionRequest(
        amount=SUBSCRIPTION_PRICE,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["id"], "type": "premium_subscription"}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Create payment transaction record
    txn = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session.session_id,
        "amount": SUBSCRIPTION_PRICE,
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "metadata": {"type": "premium_subscription"},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(txn)

    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscription/status/{session_id}")
async def get_subscription_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_key = os.environ['STRIPE_API_KEY']
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")

    status = await stripe_checkout.get_checkout_status(session_id)

    # Update transaction
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn and txn.get("payment_status") != "paid":
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        # Activate premium if paid
        if status.payment_status == "paid":
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"is_premium": True}}
            )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    stripe_key = os.environ['STRIPE_API_KEY']
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")

    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")

    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        if webhook_response.payment_status == "paid":
            txn = await db.payment_transactions.find_one({"session_id": webhook_response.session_id}, {"_id": 0})
            if txn and txn.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "complete", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                if txn.get("user_id"):
                    await db.users.update_one({"id": txn["user_id"]}, {"$set": {"is_premium": True}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ─── Include Router ───────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
