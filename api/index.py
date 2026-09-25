import os
import random
import base64
import requests
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import bcrypt
import jwt
from dotenv import load_dotenv

# ১. এনভায়রনমেন্ট এবং কনফিগারেশন
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "taskbee-secret-token-key-2024")
JWT_ALGORITHM = "HS256"

if not SUPABASE_URL or not SUPABASE_KEY:
    # Vercel Environment Variables চেক
    print("Warning: Supabase credentials missing in Environment Variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ২. FastAPI ইনিশিয়ালাইজেশন ও CORS
app = FastAPI(title="TaskBee Unified API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- ৩. হেল্পার ফাংশনসমূহ ----------------- #

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: int = 1440) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_unique_5digit_id() -> str:
    """ইউজারের জন্য ৫ ডিজিটের ইউনিক রেফার আইডি তৈরি করে"""
    while True:
        code = str(random.randint(10000, 99999))
        existing = supabase.table("users").select("user_id").eq("user_id", code).execute()
        if not existing.data:
            return code

def upload_to_imgbb(image_bytes: bytes, api_keys: list[str]) -> str:
    """মাল্টিপল ImgBB Key সাপোর্ট: একটা নষ্ট হলে পরবর্তী কী দিয়ে কাজ করবে"""
    if not api_keys:
        raise Exception("কোনো সক্রিয় ImgBB API Key পাওয়া যায়নি!")

    b64_image = base64.b64encode(image_bytes).decode('utf-8')

    for key in api_keys:
        try:
            url = "https://api.imgbb.com/1/upload"
            payload = {"key": key, "image": b64_image}
            response = requests.post(url, data=payload, timeout=12)
            data = response.json()
            if response.status_code == 200 and data.get("success"):
                return data["data"]["url"]
        except Exception:
            continue  # Failover to next key

    raise Exception("সবগুলো ImgBB API Key ব্লক বা লিমিট ক্রস করেছে!")
    
# ----------------- ৪. Pydantic স্কিমাস ----------------- #

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    device_id: str
    referred_by: Optional[str] = None   # <--- Optional[str] করে দেওয়া হয়েছে

class LoginSchema(BaseModel):
    email: str
    password: str

class CreateTaskSchema(BaseModel):
    title: str
    keyword: str
    reward_amount: float

class ActionSubmissionSchema(BaseModel):
    submission_id: int
    action: str  # 'approve' অথবা 'reject'
    admin_note: Optional[str] = ""      # <--- Optional[str] করে দেওয়া হয়েছে

class ImgbbKeySchema(BaseModel):
    api_key: str
    

# ----------------- ৫. AUTHENTICATION APIs ----------------- #

@app.post("/api/auth/register")
def register(data: RegisterSchema):
    # ১ ডিভাইসে ১ একাউন্ট চেক
    device_check = supabase.table("users").select("id").eq("device_id", data.device_id).execute()
    if device_check.data:
        raise HTTPException(status_code=400, detail="এই ডিভাইস থেকে ইতিমধ্যে একটি একাউন্ট খোলা হয়েছে! একটির বেশি একাউন্ট নিষিদ্ধ।")

    # ইমেইল চেক
    email_check = supabase.table("users").select("id").eq("email", data.email).execute()
    if email_check.data:
        raise HTTPException(status_code=400, detail="এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট আছে!")

    # ৫ ডিজিটের রেফার আইডি
    user_5digit_id = generate_unique_5digit_id()

    # ইউজার তৈরি
    new_user_payload = {
        "user_id": user_5digit_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "device_id": data.device_id,
        "referred_by": data.referred_by if data.referred_by else None,
        "balance": 0.00
    }
    insert_res = supabase.table("users").insert(new_user_payload).execute()
    new_user = insert_res.data[0]

    # রেফারেল বোনাস ২০ টাকা বণ্টন (দুইজনেই ২০ টাকা পাবে)
    if data.referred_by:
        ref_user = supabase.table("users").select("id, balance").eq("user_id", data.referred_by).execute()
        if ref_user.data:
            # যিনি রেফার করেছেন তাকে ২০ টাকা দেওয়া
            supabase.table("users").update({"balance": float(ref_user.data[0]["balance"]) + 20.00}).eq("id", ref_user.data[0]["id"]).execute()
            # যিনি একাউন্ট খুলেছেন তাকেও ২০ টাকা দেওয়া
            supabase.table("users").update({"balance": 20.00}).eq("id", new_user["id"]).execute()

    token = create_access_token({"sub": str(new_user["id"]), "user_id": user_5digit_id, "role": "user"})
    return {"message": "নিবন্ধন সফল হয়েছে!", "token": token, "user_id": user_5digit_id}


# ----------------- WITHDRAWAL APIs ----------------- #

class WithdrawSchema(BaseModel):
    user_id: int
    amount: float
    method: str
    account_number: str

@app.post("/api/user/withdraw")
def request_withdraw(data: WithdrawSchema):
    # ১. ইউজার ডাটা আনা
    user_res = supabase.table("users").select("*").eq("id", data.user_id).single().execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
    
    user = user_res.data
    user_balance = float(user["balance"])

    # ২. শর্ত ১: নূন্যতম ব্যালেন্স ৩৫০ টাকা
    if data.amount < 350.00:
        raise HTTPException(status_code=400, detail="নূন্যতম উত্তোলনের পরিমাণ ৩৫০ টাকা!")

    if user_balance < data.amount:
        raise HTTPException(status_code=400, detail="আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই!")

    # ৩. শর্ত ২: নূন্যতম ৫টি রেফার থাকতে হবে
    ref_res = supabase.table("users").select("id", count="exact").eq("referred_by", user["user_id"]).execute()
    ref_count = ref_res.count if ref_res.count is not None else 0

    if ref_count < 5:
        raise HTTPException(status_code=400, detail=f"টাকা উত্তোলনের জন্য কমপক্ষে ৫টি সফল রেফার প্রয়োজন! আপনার বর্তমান রেফার: {ref_count}টি।")

    # ৪. ব্যালেন্স থেকে টাকা কাটা
    new_balance = user_balance - data.amount
    supabase.table("users").update({"balance": new_balance}).eq("id", user["id"]).execute()

    # ৫. উত্তোলন রিকোয়েস্ট তৈরি
    supabase.table("withdrawals").insert({
        "user_id": user["id"],
        "amount": data.amount,
        "method": data.method,
        "account_number": data.account_number,
        "status": "pending"
    }).execute()

    return {"message": "উত্তোলন রিকোয়েস্ট সফলভাবে জমা হয়েছে! শীঘ্রই পেমেন্ট সম্পন্ন হবে।"}

@app.get("/api/user/withdrawals")
def get_user_withdrawals(user_id: int):
    res = supabase.table("withdrawals")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return res.data
    
@app.post("/api/auth/login")
def login(data: LoginSchema):
    res = supabase.table("users").select("*").eq("email", data.email).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="ভুল ইমেইল বা পাসওয়ার্ড!")

    user = res.data[0]
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="ভুল ইমেইল বা পাসওয়ার্ড!")

    token = create_access_token({"sub": str(user["id"]), "user_id": user["user_id"], "role": user.get("role", "user")})
    return {
        "message": "লগইন সফল হয়েছে!",
        "token": token,
        "user": {
            "id": user["id"],
            "user_id": user["user_id"],
            "name": user["name"],
            "balance": user["balance"],
            "role": user.get("role", "user")
        }
    }

# ----------------- ৬. USER TASK APIs ----------------- #

# ----------------- ADMIN WITHDRAWAL ACTION APIs ----------------- #

class ActionWithdrawalSchema(BaseModel):
    withdrawal_id: int
    action: str  # 'approve' অথবা 'reject'
    admin_note: Optional[str] = ""

@app.get("/api/admin/withdrawals/pending")
def get_pending_withdrawals():
    res = supabase.table("withdrawals")\
        .select("id, user_id, amount, method, account_number, status, created_at, users(name, user_id, email)")\
        .eq("status", "pending")\
        .order("created_at", desc=True)\
        .execute()
    return res.data

@app.post("/api/admin/withdrawals/action")
def take_withdrawal_action(data: ActionWithdrawalSchema):
    w_res = supabase.table("withdrawals").select("*").eq("id", data.withdrawal_id).single().execute()
    if not w_res.data:
        raise HTTPException(status_code=404, detail="উইথড্র রিকোয়েস্ট পাওয়া যায়নি!")

    withdrawal = w_res.data
    if data.action == "approve":
        supabase.table("withdrawals").update({
            "status": "approved",
            "admin_note": data.admin_note
        }).eq("id", data.withdrawal_id).execute()
        return {"message": "পেমেন্ট সফলভাবে এপ্রুভ করা হয়েছে!"}

    elif data.action == "reject":
        # রিজেক্ট হলে টাকা ইউজারের ব্যালেন্সে ফেরত যাবে
        user = supabase.table("users").select("balance").eq("id", withdrawal["user_id"]).single().execute()
        refund_balance = float(user.data["balance"]) + float(withdrawal["amount"])
        supabase.table("users").update({"balance": refund_balance}).eq("id", withdrawal["user_id"]).execute()

        supabase.table("withdrawals").update({
            "status": "rejected",
            "admin_note": data.admin_note
        }).eq("id", data.withdrawal_id).execute()
        return {"message": "উইথড্র রিকোয়েস্ট বাতিল এবং টাকা ইউজারের ব্যালেন্সে রিফান্ড হয়েছে!"}

    raise HTTPException(status_code=400, detail="ভুল অ্যাকশন কমান্ড!")https://i.ibb.co.com/PZV16bNp/file-00000000bea481f5b7ca59b2fe930fea.png
@app.get("/api/tasks/google-search")
def get_google_search_tasks():
    res = supabase.table("tasks").select("*").eq("task_type", "google_search").eq("status", "active").execute()
    return res.data

@app.post("/api/tasks/submit-google-search")
async def submit_google_search(
    task_id: int = Form(...),
    user_id: int = Form(...),
    screenshot: UploadFile = File(...)
):
    # ইউজার স্ট্যাটাস চেক (একবারই করা যাবে, তবে রিজেক্ট হলে পুনরায় সাবমিট করা যাবে)
    sub = supabase.table("task_submissions").select("*").eq("task_id", task_id).eq("user_id", user_id).order("id", desc=True).limit(1).execute()
    if sub.data:
        last_status = sub.data[0]["status"]
        if last_status == "approved":
            raise HTTPException(status_code=400, detail="আপনি ইতিমধ্যে কাজটি সফলভাবে শেষ করেছেন!")
        elif last_status == "pending":
            raise HTTPException(status_code=400, detail="আপনার স্ক্রিনশটটি এখনো পেন্ডিং আছে। অনুগ্রহ করে অপেক্ষা করুন।")

    # ডাটাবেস থেকে সচল ImgBB Key এনে ছবি আপলোড
    keys_res = supabase.table("imgbb_keys").select("api_key").eq("is_active", True).execute()
    api_keys = [k["api_key"] for k in keys_res.data]

    image_bytes = await screenshot.read()
    image_url = upload_to_imgbb(image_bytes, api_keys)

    # সাবমিশন সংরক্ষণ
    supabase.table("task_submissions").insert({
        "task_id": task_id,
        "user_id": user_id,
        "screenshot_url": image_url,
        "status": "pending"
    }).execute()

    return {"message": "স্ক্রিনশট জমা দেওয়া হয়েছে! এডমিন ভেরিফাই করবে।"}

# ----------------- ৭. ADMIN PANEL APIs ----------------- #

@app.post("/api/admin/tasks/google-search")
def create_google_search_task(data: CreateTaskSchema):
    res = supabase.table("tasks").insert({
        "task_type": "google_search",
        "title": data.title,
        "keyword": data.keyword,
        "reward_amount": data.reward_amount,
        "status": "active"
    }).execute()
    return {"message": "গুগল সার্চ টাস্ক যোগ হয়েছে!", "data": res.data}

@app.get("/api/admin/submissions/pending")
def get_pending_submissions():
    res = supabase.table("task_submissions")\
        .select("id, task_id, user_id, screenshot_url, status, created_at, tasks(title, reward_amount), users(name, user_id)")\
        .eq("status", "pending").execute()
    return res.data

@app.post("/api/admin/submissions/action")
def take_action(data: ActionSubmissionSchema):
    sub = supabase.table("task_submissions").select("*, tasks(reward_amount)").eq("id", data.submission_id).single().execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="সাবমিশন পাওয়া যায়নি!")

    submission = sub.data

    if data.action == "approve":
        # টাকা অ্যাকাউন্টে জমা করা
        user = supabase.table("users").select("balance").eq("id", submission["user_id"]).single().execute()
        new_balance = float(user.data["balance"]) + float(submission["tasks"]["reward_amount"])
        supabase.table("users").update({"balance": new_balance}).eq("id", submission["user_id"]).execute()

        # এপ্রুভ স্ট্যাটাস আপডেট
        supabase.table("task_submissions").update({"status": "approved", "admin_note": data.admin_note}).eq("id", data.submission_id).execute()
        return {"message": "টাস্ক অ্যাপ্রুভ হয়েছে এবং টাকা ইউজারের একাউন্টে যোগ হয়েছে!"}

    elif data.action == "reject":
        # রিজেক্ট করা (ইউজার আবার সাবমিট করতে পারবে)
        supabase.table("task_submissions").update({"status": "rejected", "admin_note": data.admin_note}).eq("id", data.submission_id).execute()
        return {"message": "টাস্ক রিজেক্ট করা হয়েছে। ইউজার পুনরায় করতে পারবে।"}

    raise HTTPException(status_code=400, detail="ইনভ্যালিড অ্যাকশন কমান্ড!")

@app.get("/api/admin/imgbb-keys")
def get_imgbb_keys():
    return supabase.table("imgbb_keys").select("*").execute().data

@app.post("/api/admin/imgbb-keys")
def add_imgbb_key(data: ImgbbKeySchema):
    supabase.table("imgbb_keys").insert({"api_key": data.api_key, "is_active": True}).execute()
    return {"message": "API Key সফলভাবে সেভ হয়েছে!"}

# ----------------- REFERRAL STATS & PAGINATION API ----------------- #

@app.get("/api/user/referrals")
def get_user_referrals(user_code: str, page: int = 1, limit: int = 20):
    # ১. মোট রেফারের সংখ্যা গণনা
    count_res = supabase.table("users").select("id", count="exact").eq("referred_by", user_code).execute()
    total_count = count_res.count if count_res.count is not None else 0
    total_earnings = total_count * 20.00  # প্রতি রেফারে ২০ টাকা

    # ২. প্রতি পেজে ২০ জন করে ডাটা নিয়ে আসা (Pagination)
    start = (page - 1) * limit
    end = start + limit - 1
    
    users_res = supabase.table("users")\
        .select("name, user_id, created_at")\
        .eq("referred_by", user_code)\
        .order("created_at", desc=True)\
        .range(start, end)\
        .execute()

    return {
        "total_count": total_count,
        "total_earnings": total_earnings,
        "page": page,
        "limit": limit,
        "users": users_res.data
    }


# ----------------- GLOBAL NOTICE APIs ----------------- #

class NoticeSchema(BaseModel):
    content: str
    is_active: bool = True

@app.get("/api/notice")
def get_global_notice():
    res = supabase.table("global_notices").select("*").eq("id", 1).execute()
    if res.data and res.data[0]["is_active"]:
        return {"content": res.data[0]["content"], "is_active": True}
    return {"content": "", "is_active": False}

@app.post("/api/admin/notice")
def update_global_notice(data: NoticeSchema):
    supabase.table("global_notices").upsert({
        "id": 1,
        "content": data.content,
        "is_active": data.is_active,
        "updated_at": "now()"
    }).execute()
    return {"message": "গ্লোবাল নোটিশ সফলভাবে আপডেট হয়েছে!"}
    

@app.delete("/api/admin/imgbb-keys/{key_id}")
def delete_imgbb_key(key_id: int):
    supabase.table("imgbb_keys").delete().eq("id", key_id).execute()
    return {"message": "কী মুছে ফেলা হয়েছে!"}

@app.get("/api")
def health_check():
    return {"status": "ok", "project": "TaskBee Unified API"}
