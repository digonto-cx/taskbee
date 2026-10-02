import os
import random
import base64
import requests
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import bcrypt
import jwt
from dotenv import load_dotenv

# ================= 1. কনফিগারেশন ও ডাটাবেস ================= #
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "taskbee-super-secret-key-2024")
JWT_ALGORITHM = "HS256"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials missing in Environment Variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPI ইনিশিয়ালাইজেশন
app = FastAPI(title="TaskBee Master API", version="2.0.0")

# CORS পারমিশন
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= 2. হেল্পার ও ইউটিলিটি ফাংশন ================= #

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

def upload_to_imgbb(image_bytes: bytes, api_keys: List[str]) -> str:
    """ImgBB মাল্টিপল কী সাপোর্ট (একটি নষ্ট হলে পরবর্তী কী দিয়ে ট্রাই করবে)"""
    if not api_keys:
        raise Exception("কোনো সক্রিয় ImgBB API Key পাওয়া যায়নি! এডমিন প্যানেলে কী যোগ করুন।")

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
            continue

    raise Exception("সবগুলো ImgBB API Key লিমিট শেষ অথবা কাজ করছে না!")

# ================= 3. Pydantic ডাটা স্কিমাস ================= #

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    device_id: str
    referred_by: Optional[str] = None

class LoginSchema(BaseModel):
    email: str
    password: str

class ChangePasswordSchema(BaseModel):
    user_id: int
    old_password: str
    new_password: str

class WithdrawSchema(BaseModel):
    user_id: int
    amount: float
    method: str
    account_number: str

class ActionWithdrawalSchema(BaseModel):
    withdrawal_id: int
    action: str  # 'approve' অথবা 'reject'
    admin_note: Optional[str] = ""

class CreateTaskSchema(BaseModel):
    title: str
    keyword: str
    reward_amount: float

class ActionSubmissionSchema(BaseModel):
    submission_id: int
    action: str  # 'approve' অথবা 'reject'
    admin_note: Optional[str] = ""

class NoticeSchema(BaseModel):
    content: str
    is_active: bool = True

class ImgbbKeySchema(BaseModel):
    api_key: str


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
            "email": user["email"],
            "balance": user["balance"],
            "role": user.get("role", "user")
        }
    }

# ================= 5. USER PROFILE & TASKS APIs ================= #

@app.post("/api/user/change-password")
def change_password(data: ChangePasswordSchema):
    user_res = supabase.table("users").select("password_hash").eq("id", data.user_id).single().execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")

    if not verify_password(data.old_password, user_res.data["password_hash"]):
        raise HTTPException(status_code=400, detail="বর্তমান পাসওয়ার্ডটি সঠিক নয়!")

    supabase.table("users").update({
        "password_hash": hash_password(data.new_password)
    }).eq("id", data.user_id).execute()

    return {"message": "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!"}

# ================= ১. সরাসরি ডাটাবেস থেকে হোল্ড রিড করার ফিক্সড API ================= #

# ================= ১. কমপ্লিট টাস্ক ফিল্টার সহ গুগল সার্চ API ================= #


@app.get("/api/user/referrals")
def get_user_referrals(user_code: str, page: int = 1, limit: int = 20):
    clean_code = str(user_code).strip()

    # ১. রেফারারের মূল একাউন্ট খোঁজা
    ref_user_res = supabase.table("users").select("id, balance, hold_balance").eq("user_id", clean_code).execute()
    if not ref_user_res.data:
        return {"total_count": 0, "hold_balance": 0.0, "main_earned": 0.0, "users": []}

    ref_user = ref_user_res.data[0]
    referrer_id = ref_user["id"]

    # ২. মোট রেফার সংখ্যা
    count_res = supabase.table("users").select("id", count="exact").eq("referred_by", clean_code).execute()
    total_count = count_res.count if count_res.count is not None else 0

    # ৩. ডাটাবেসের held_referrals টেবিল থেকে এই ইউজারের সব হোল্ড ডাটা আনা
    held_records_res = supabase.table("held_referrals")\
        .select("friend_user_id, status, release_at, amount")\
        .eq("user_id", referrer_id)\
        .execute()
    
    held_records = held_records_res.data or []
    
    # { friend_user_id : record } ম্যাপ তৈরি
    held_map = {r["friend_user_id"]: r for r in held_records}

    # মোট কত টাকা বর্তমানে held অবস্থায় আছে তার আসল যোগফল
    actual_hold_balance = sum(float(r["amount"]) for r in held_records if r.get("status") == "held")

    # ডাটাবেসে hold_balance আপডেট রাখা
    supabase.table("users").update({"hold_balance": actual_hold_balance}).eq("id", referrer_id).execute()

    # ৪. পেজিনেশন সহ রেফার করা বন্ধুদের লিস্ট
    start = (page - 1) * limit
    end = start + limit - 1
    users_res = supabase.table("users")\
        .select("id, name, user_id, created_at")\
        .eq("referred_by", clean_code)\
        .order("created_at", desc=True)\
        .range(start, end)\
        .execute()

    now = datetime.utcnow()
    user_list = []

    for u in (users_res.data or []):
        friend_id = u["id"]
        held_info = held_map.get(friend_id)

        # যদি held_referrals টেবিলে স্ট্যাটাস 'held' থাকে, তবে এটি নিশ্চিত হোল্ড
        if held_info and held_info.get("status") == "held":
            is_held = True
            remaining_hours = 72
            if held_info.get("release_at"):
                try:
                    rel_dt = datetime.fromisoformat(held_info["release_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                    rem_sec = (rel_dt - now).total_seconds()
                    remaining_hours = max(0, int(rem_sec / 3600))
                except:
                    remaining_hours = 72
        else:
            # যদি স্ট্যাটাস released হয় বা কোনো রেকর্ড না থাকে
            is_held = False
            remaining_hours = 0

        user_list.append({
            "id": u["id"],
            "name": u["name"],
            "user_id": u["user_id"],
            "created_at": u["created_at"],
            "is_held": is_held,
            "remaining_hours": remaining_hours
        })

    return {
        "total_count": total_count,
        "hold_balance": actual_hold_balance,
        "main_earned": max(0.0, (total_count * 20.0) - actual_hold_balance),
        "total_earnings": total_count * 20.0,
        "page": page,
        "limit": limit,
        "users": user_list
    }
    # ================= ১. কমপ্লিট টাস্ক ফিল্টার সহ গুগল সার্চ API ================= #

@app.get("/api/tasks/google-search")
def get_google_search_tasks(user_id: Optional[int] = None):
    # ১. সকল সক্রিয় গুগল টাস্ক আনা
    res = supabase.table("tasks").select("*").eq("task_type", "google_search").eq("status", "active").execute()
    tasks = res.data or []

    # ২. ইউজার আইডি পাঠানো হলে তার কমপ্লিট (approved) ও পেন্ডিং কাজগুলো বাদ দেওয়া
    if user_id:
        subs_res = supabase.table("task_submissions")\
            .select("task_id, status")\
            .eq("user_id", user_id)\
            .in_("status", ["approved", "pending"])\
            .execute()
        
        # যে কাজগুলো ইতিমধ্যে অনুমোদিত বা পেন্ডিং আছে
        completed_task_ids = {s["task_id"] for s in (subs_res.data or [])}

        # শুধুমাত্র অবশিষ্ট এবং রিজেক্ট হওয়া কাজগুলো রাখা হবে
        tasks = [t for t in tasks if t["id"] not in completed_task_ids]

    return tasks
    

@app.post("/api/tasks/submit-google-search")
async def submit_google_search(
    task_id: int = Form(...),
    user_id: int = Form(...),
    screenshot: UploadFile = File(...)
):
    # স্ট্যাটাস চেক (Approve বা Pending থাকলে নতুন সাবমিশন ব্লক, Rejected হলে পুনরায় দেওয়ার সুযোগ)
    sub = supabase.table("task_submissions").select("*").eq("task_id", task_id).eq("user_id", user_id).order("id", desc=True).limit(1).execute()
    if sub.data:
        last_status = sub.data[0]["status"]
        if last_status == "approved":
            raise HTTPException(status_code=400, detail="আপনি ইতিমধ্যে কাজটি সম্পন্ন করে টাকা পেয়ে গেছেন!")
        elif last_status == "pending":
            raise HTTPException(status_code=400, detail="আপনার আগের স্ক্রিনশটটি পেন্ডিং রয়েছে। এডমিন চেক করা পর্যন্ত অপেক্ষা করুন।")

    # ImgBB Key নিয়ে ছবি আপলোড
    keys_res = supabase.table("imgbb_keys").select("api_key").eq("is_active", True).execute()
    api_keys = [k["api_key"] for k in keys_res.data]

    image_bytes = await screenshot.read()
    image_url = upload_to_imgbb(image_bytes, api_keys)

    supabase.table("task_submissions").insert({
        "task_id": task_id,
        "user_id": user_id,
        "screenshot_url": image_url,
        "status": "pending"
    }).execute()

    return {"message": "স্ক্রিনশট সফলভাবে জমা হয়েছে! এডমিন শীঘ্রই ভেরিফাই করবে।"}

# ================= 6. WITHDRAWAL APIs ================= #

@app.post("/api/user/withdraw")
def request_withdraw(data: WithdrawSchema):
    user_res = supabase.table("users").select("*").eq("id", data.user_id).single().execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
    
    user = user_res.data
    user_balance = float(user["balance"])

    # শর্ত ১: নূন্যতম ব্যালেন্স ৩৫০ টাকা
    if data.amount < 350.00:
        raise HTTPException(status_code=400, detail="নূন্যতম উত্তোলনের পরিমাণ ৩৫০ টাকা!")

    if user_balance < data.amount:
        raise HTTPException(status_code=400, detail="আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই!")

    # শর্ত ২: কমপক্ষে ৫টি সফল রেফার
    ref_res = supabase.table("users").select("id", count="exact").eq("referred_by", user["user_id"]).execute()
    ref_count = ref_res.count if ref_res.count is not None else 0

    if ref_count < 5:
        raise HTTPException(status_code=400, detail=f"উত্তোলনের জন্য কমপক্ষে ৫টি সফল রেফার প্রয়োজন! আপনার বর্তমান রেফার: {ref_count}টি।")

    # ব্যালেন্স থেকে কাটা
    new_balance = user_balance - data.amount
    supabase.table("users").update({"balance": new_balance}).eq("id", user["id"]).execute()

    # রিকোয়েস্ট তৈরি
    supabase.table("withdrawals").insert({
        "user_id": user["id"],
        "amount": data.amount,
        "method": data.method,
        "account_number": data.account_number,
        "status": "pending"
    }).execute()

    return {"message": "উইথড্র রিকোয়েস্ট জমা হয়েছে! এডমিন দ্রুত পেমেন্ট পরিশোধ করবে।"}

@app.get("/api/user/withdrawals")
def get_user_withdrawals(user_id: int):
    res = supabase.table("withdrawals")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return res.data

# ================= 7. GLOBAL NOTICE APIs ================= #

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

# ================= 8. ADMIN CONTROL APIs ================= #

@app.get("/api/admin/stats")
def get_admin_stats():
    # ড্যাশবোর্ডে মোট ইউজার, পেন্ডিং কাজ ও পেন্ডিং উইথড্র কাউন্ট
    u_count = supabase.table("users").select("id", count="exact").execute().count or 0
    t_count = supabase.table("task_submissions").select("id", count="exact").eq("status", "pending").execute().count or 0
    w_count = supabase.table("withdrawals").select("id", count="exact").eq("status", "pending").execute().count or 0
    
    return {
        "total_users": u_count,
        "pending_tasks": t_count,
        "pending_withdrawals": w_count
    }

@app.post("/api/admin/tasks/google-search")
def create_google_search_task(data: CreateTaskSchema):
    res = supabase.table("tasks").insert({
        "task_type": "google_search",
        "title": data.title,
        "keyword": data.keyword,
        "reward_amount": data.reward_amount,
        "status": "active"
    }).execute()
    return {"message": "গুগল সার্চ টাস্ক সফলভাবে তৈরি হয়েছে!", "data": res.data}


# ----------------- FULL TASK HISTORY API ----------------- #

@app.get("/api/user/submissions")
def get_user_submissions(user_id: int):
    # ইউজারের জমা দেওয়া সব কাজের বিবরণী
    res = supabase.table("task_submissions")\
        .select("id, status, admin_note, screenshot_url, created_at, tasks(title, reward_amount)")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return res.data
    
# ----------------- SINGLE TASK & STATUS CHECK APIs ----------------- #

@app.get("/api/tasks/single/{task_id}")
def get_single_task(task_id: int):
    res = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="টাস্ক পাওয়া যায়নি!")
    return res.data

@app.get("/api/tasks/submission-status")
def get_submission_status(task_id: int, user_id: int):
    # এই টাস্কে ইউজারের বর্তমান স্ট্যাটাস চেক
    sub = supabase.table("task_submissions").select("*").eq("task_id", task_id).eq("user_id", user_id).order("id", desc=True).limit(1).execute()
    return sub.data[0] if sub.data else None
    

@app.get("/api/admin/submissions/pending")
def get_pending_submissions():
    res = supabase.table("task_submissions")\
        .select("id, task_id, user_id, screenshot_url, status, created_at, tasks(title, reward_amount, task_type), users(name, user_id)")\
        .eq("status", "pending")\
        .order("created_at", desc=True)\
        .execute()
    
    all_pending = res.data or []

    # শুধুমাত্র গুগল সার্চ এবং ইউটিউব টাস্ক ফিল্টার করা
    filtered_submissions = [
        s for s in all_pending 
        if s.get("tasks") and s["tasks"].get("task_type") in ["google_search", "youtube"]
    ]

    return filtered_submissions


# ----------------- ১. রিয়েল-টাইম লাইভ ব্যালেন্স সিঙ্ক API ----------------- #

@app.get("/api/user/profile/{user_db_id}")
def get_user_live_profile(user_db_id: int):
    # সরাসরি ডাটাবেস থেকে ইউজারের লেটেস্ট ব্যালেন্স আনা
    u_res = supabase.table("users").select("id, user_id, name, email, balance, role, is_banned").eq("id", user_db_id).execute()
    if not u_res.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
    return u_res.data[0]


# ----------------- ২. ফিক্সড সিঙ্গেল টাস্ক অ্যাপ্রুভ অ্যাকশন ----------------- #

@app.post("/api/admin/submissions/action")
def take_task_action(data: ActionSubmissionSchema):
    # ১. সাবমিশন বের করা
    sub_res = supabase.table("task_submissions").select("*").eq("id", data.submission_id).execute()
    if not sub_res.data:
        raise HTTPException(status_code=404, detail="সাবমিশন পাওয়া যায়নি!")
    
    sub = sub_res.data[0]

    # ডাবল ব্যালেন্স যোগ রোধ (আগে থেকেই এপ্রুভ থাকলে আর টাকা যোগ হবে না)
    if sub["status"] == "approved" and data.action == "approve":
        return {"message": "এই টাস্কটি আগেই অ্যাপ্রুভ করা হয়েছে!"}

    # ২. টাস্কের রিওয়ার্ড টাকা নিশ্চিত করা
    task_res = supabase.table("tasks").select("reward_amount").eq("id", sub["task_id"]).execute()
    reward = float(task_res.data[0]["reward_amount"]) if task_res.data else 0.0

    if data.action == "approve":
        # ৩. নিশ্চিতভাবে ইউজারকে খুঁজে ব্যালেন্স যোগ করা
        target_uid = sub["user_id"]
        
        # প্রথমে id দিয়ে খুঁজবে, না পেলে ৫ ডিজিট user_id দিয়ে খুঁজবে
        u_find = supabase.table("users").select("id, balance").eq("id", target_uid).execute()
        if not u_find.data:
            u_find = supabase.table("users").select("id, balance").eq("user_id", str(target_uid)).execute()
            
        if u_find.data:
            user_real_id = u_find.data[0]["id"]
            current_bal = float(u_find.data[0].get("balance") or 0.0)
            new_bal = current_bal + reward
            
            # ডাটাবেসে ইউজারের ব্যালেন্স আপডেট
            supabase.table("users").update({"balance": new_bal}).eq("id", user_real_id).execute()

        # সাবমিশন স্ট্যাটাস আপডেট
        supabase.table("task_submissions").update({
            "status": "approved",
            "admin_note": data.admin_note or "সঠিক কাজের জন্য অনুমোদিত"
        }).eq("id", sub["id"]).execute()

        return {"message": f"টাস্ক অনুমোদিত এবং সফলভাবে ৳{reward} ব্যালেন্সে যুক্ত হয়েছে!"}

    elif data.action == "reject":
        supabase.table("task_submissions").update({
            "status": "rejected",
            "admin_note": data.admin_note or "ভুল বা অস্পষ্ট স্ক্রিনশট"
        }).eq("id", sub["id"]).execute()
        return {"message": "টাস্ক রিজেক্ট করা হয়েছে।"}

# ================= USER AUDIT & FRAUD DETECTION API (/admin/ck) ================= #
# ================= সম্পূর্ণ গাণিতিক অডিট ও হ্যাক ডিটেকশন API ================= #

@app.get("/api/admin/user-audit")
def audit_user_account(query: str):
    q = str(query).strip()

    # ১. ইউজারকে Email বা 5-digit user_id দিয়ে খোঁজা
    u_res = supabase.table("users").select("*").or_(f"email.eq.{q},user_id.eq.{q}").execute()
    if not u_res.data:
        raise HTTPException(status_code=404, detail="ব্যবহারকারী পাওয়া যায়নি! সঠিক Email বা 5-Digit UID দিন।")

    user = u_res.data[0]
    user_id = user["id"]
    user_uid = user["user_id"]

    # ২. সব ধরনের টাস্ক সাবমিশন
    subs_res = supabase.table("task_submissions")\
        .select("id, task_id, status, screenshot_url, submitted_text, admin_note, created_at, tasks(title, task_type, reward_amount)")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    submissions = subs_res.data or []

    # ৩. সব উইথড্রয়াল রেকর্ডস
    withs_res = supabase.table("withdrawals")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    withdrawals = withs_res.data or []

    # ৪. রেফার করা বন্ধুদের তালিকা (তাদের ব্যালেন্স সহ আনা হচ্ছে)
    refs_res = supabase.table("users")\
        .select("id, user_id, name, email, balance, hold_balance, created_at")\
        .eq("referred_by", user_uid)\
        .order("created_at", desc=True)\
        .execute()
    referred_users = refs_res.data or []

    # ৫. হোল্ড ডাটা আনা
    held_res = supabase.table("held_referrals").select("*").eq("user_id", user_id).execute()
    held_records = held_res.data or []
    held_map = {r["friend_user_id"]: r for r in held_records}

    # ================= ৬. নিখুঁত গাণিতিক ফর্মুলা ক্যালকুলেশন ================= #

    # (ক) এপ্রুভ হওয়া টাস্ক থেকে মোট আয় (+)
    approved_task_earnings = sum(
        float(s["tasks"].get("reward_amount") or 0.0) 
        for s in submissions 
        if s.get("status") == "approved" and s.get("tasks")
    )

    # (খ) সফল রেফারেল বোনাস (Unhold / Released) (+)
    # রেফার করা বন্ধুদের মধ্য থেকে যাদের ৭২ ঘণ্টা শেষ হয়ে রিলিজ হয়েছে
    released_ref_earnings = 0.0
    for friend in referred_users:
        f_id = friend["id"]
        h_info = held_map.get(f_id)
        if h_info:
            if h_info.get("status") == "released":
                released_ref_earnings += float(h_info.get("amount") or 20.0)
        else:
            # পুরনো ইউজার হলে
            released_ref_earnings += 20.0

    # (গ) ইউজারের নিজের জয়েনিং বোনাস (Unhold / Released) (+)
    # ইউজার যদি কারো রেফারে জয়েন করে থাকে এবং ৭২ ঘণ্টা পার হয়ে থাকে
    released_joining_bonus = 0.0
    if user.get("referred_by"):
        # জয়েনিং বোনাস রিলিজ রেকর্ড চেক
        join_held = supabase.table("held_referrals")\
            .select("status, amount")\
            .eq("user_id", user_id)\
            .eq("status", "released")\
            .execute()
        
        if join_held.data:
            released_joining_bonus = 20.00
        else:
            # যদি একাউন্টের বয়স ৩ দিন পার হয়ে যায় তবে ২০ টাকা যোগ
            now = datetime.utcnow()
            join_dt = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            if (now - join_dt).total_seconds() >= 259200: # ৭২ ঘণ্টা = ২৫৯২০০ সেকেন্ড
                released_joining_bonus = 20.00

    # (ঘ) উইথড্রয়াল মাইনাস (-)
    approved_withdrawals = sum(float(w.get("amount") or 0.0) for w in withdrawals if w.get("status") == "approved")
    pending_withdrawals = sum(float(w.get("amount") or 0.0) for w in withdrawals if w.get("status") == "pending")

    # (ঙ) ফাইনাল গাণিতিক ফর্মুলা:
    # যা টাকা ব্যালেন্সে থাকা উচিত = (টাস্ক আয় + আনহোল্ড রেফার আয় + আনহোল্ড জয়েনিং বোনাস) - (পেইড উইথড্র + পেন্ডিং উইথড্র)
    expected_balance = (approved_task_earnings + released_ref_earnings + released_joining_bonus) - (approved_withdrawals + pending_withdrawals)
    if expected_balance < 0:
        expected_balance = 0.0

    actual_balance = float(user.get("balance") or 0.0)
    discrepancy = actual_balance - expected_balance

    # হ্যাক / গরমিল বিবেচনা (২ টাকার বেশি ব্যালেন্স অমিল হলে হ্যাক অ্যালার্ট)
    is_compromised = discrepancy > 2.00

    # রেফারেল লিস্টের বন্ধুদের সাথে তাদের বোনাস স্ট্যাটাস যুক্ত করা
    ref_list_with_details = []
    for f in referred_users:
        h_info = held_map.get(f["id"])
        is_held = (h_info.get("status") == "held") if h_info else False
        ref_list_with_details.append({
            "id": f["id"],
            "name": f["name"],
            "user_id": f["user_id"],
            "email": f["email"],
            "balance": float(f.get("balance") or 0.0),
            "hold_balance": float(f.get("hold_balance") or 0.0),
            "created_at": f["created_at"],
            "bonus_status": "held" if is_held else "released"
        })

    return {
        "user": user,
        "submissions": submissions,
        "withdrawals": withdrawals,
        "referred_users": ref_list_with_details,
        "audit": {
            "actual_balance": actual_balance,
            "expected_balance": expected_balance,
            "discrepancy": discrepancy,
            "is_compromised": is_compromised,
            "task_earnings": approved_task_earnings,
            "released_ref_earnings": released_ref_earnings,
            "released_joining_bonus": released_joining_bonus,
            "approved_withdrawals": approved_withdrawals,
            "pending_withdrawals": pending_withdrawals,
            "hold_balance": float(user.get("hold_balance") or 0.0)
        }
    }
    
# ২. বাল্ক অ্যাপ্রুভ (শুধুমাত্র গুগল ও ইউটিউব টাস্কের সর্বোচ্চ ৩০টি, র‍্যান্ডম ২ রিজেক্ট)
@app.post("/api/admin/submissions/bulk-action")
def bulk_approve_tasks():
    res = supabase.table("task_submissions")\
        .select("id, user_id, task_id, tasks(task_type, reward_amount)")\
        .eq("status", "pending")\
        .order("id", desc=False)\
        .execute()
    
    all_pending = res.data or []

    # শুধুমাত্র গুগল সার্চ ও ইউটিউব টাস্কের সর্বোচ্চ ৩০টি নেওয়া
    eligible_subs = [
        s for s in all_pending 
        if s.get("tasks") and s["tasks"].get("task_type") in ["google_search", "youtube"]
    ][:30]

    if not eligible_subs:
        return {"message": "কোনো গুগল সার্চ বা ইউটিউব পেন্ডিং কাজ পাওয়া যায়নি!", "approved": 0, "rejected": 0}

    total_count = len(eligible_subs)
    
    # র‍্যান্ডম ২ রিজেক্ট লজিক
    reject_count = 2 if total_count >= 2 else 0
    rejected_items = random.sample(eligible_subs, reject_count) if reject_count > 0 else []
    rejected_ids = [item["id"] for item in rejected_items]

    approved_count = 0

    for sub in eligible_subs:
        if sub["id"] in rejected_ids:
            # রিজেক্ট করা
            supabase.table("task_submissions").update({
                "status": "rejected",
                "admin_note": "অস্পষ্ট বা ভুল স্ক্রিনশট (অটো-যাচাইকৃত)"
            }).eq("id", sub["id"]).execute()
        else:
            # অ্যাপ্রুভ করা ও ইউজারের ব্যালেন্সে টাকা যোগ করা
            reward = float(sub["tasks"].get("reward_amount") or 0.0) if sub.get("tasks") else 0.0
            
            # ইউজারের ব্যালেন্স সরাসরি ডাটাবেস থেকে এনে যোগ করা
            user_res = supabase.table("users").select("balance").eq("id", sub["user_id"]).execute()
            if user_res.data:
                current_bal = float(user_res.data[0].get("balance") or 0.0)
                new_bal = current_bal + reward
                supabase.table("users").update({"balance": new_bal}).eq("id", sub["user_id"]).execute()

            supabase.table("task_submissions").update({
                "status": "approved",
                "admin_note": "সঠিক কাজের জন্য অনুমোদিত"
            }).eq("id", sub["id"]).execute()

            approved_count += 1

    return {
        "message": f"গুগল ও ইউটিউবের {approved_count}টি কাজ অনুমোদিত (ব্যালেন্স যুক্ত হয়েছে) এবং {len(rejected_items)}টি রিজেক্ট হয়েছে!",
        "approved": approved_count,
        "rejected": len(rejected_items)
    }
    
    
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
        return {"message": "পেমেন্ট সফলভাবে পেইড করা হয়েছে!"}

    elif data.action == "reject":
        # রিজেক্ট হলে টাকা ইউজারের অ্যাকাউন্টে রিফান্ড হবে
        user = supabase.table("users").select("balance").eq("id", withdrawal["user_id"]).single().execute()
        refund_balance = float(user.data["balance"]) + float(withdrawal["amount"])
        supabase.table("users").update({"balance": refund_balance}).eq("id", withdrawal["user_id"]).execute()

        supabase.table("withdrawals").update({
            "status": "rejected",
            "admin_note": data.admin_note
        }).eq("id", data.withdrawal_id).execute()
        return {"message": "উইথড্র বাতিল এবং ব্যালেন্স রিফান্ড করা হয়েছে!"}

    raise HTTPException(status_code=400, detail="ভুল কমান্ড!")

@app.get("/api/admin/imgbb-keys")
def get_imgbb_keys():
    return supabase.table("imgbb_keys").select("*").execute().data

@app.post("/api/admin/imgbb-keys")
def add_imgbb_key(data: ImgbbKeySchema):
    supabase.table("imgbb_keys").insert({"api_key": data.api_key, "is_active": True}).execute()
    return {"message": "ImgBB API Key সফলভাবে সেভ হয়েছে!"}

@app.delete("/api/admin/imgbb-keys/{key_id}")
def delete_imgbb_key(key_id: int):
    supabase.table("imgbb_keys").delete().eq("id", key_id).execute()
    return {"message": "কী মুছে ফেলা হয়েছে!"}
        

# ----------------- ADMIN USER MANAGEMENT APIs ----------------- #

class AdjustBalanceSchema(BaseModel):
    user_id: int
    amount: float
    action: str  # 'add' অথবা 'deduct'

class ToggleBanSchema(BaseModel):
    user_id: int

@app.get("/api/admin/users")
def get_all_users():
    res = supabase.table("users")\
        .select("id, user_id, name, email, balance, is_banned, role, created_at")\
        .order("created_at", desc=True)\
        .execute()
    return res.data

@app.post("/api/admin/users/balance")
def adjust_user_balance(data: AdjustBalanceSchema):
    u = supabase.table("users").select("balance").eq("id", data.user_id).single().execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")

    current_bal = float(u.data["balance"])
    new_bal = (current_bal + data.amount) if data.action == "add" else (current_bal - data.amount)
    if new_bal < 0:
        new_bal = 0.00

    supabase.table("users").update({"balance": new_bal}).eq("id", data.user_id).execute()
    return {"message": "ব্যালেন্স সফলভাবে আপডেট করা হয়েছে!", "new_balance": new_bal}

@app.post("/api/admin/users/toggle-ban")
def toggle_user_ban(data: ToggleBanSchema):
    u = supabase.table("users").select("is_banned, role").eq("id", data.user_id).single().execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="ইউজার পাওয়া যায়নি!")
    
    if u.data["role"] == "admin":
        raise HTTPException(status_code=400, detail="এডমিন অ্যাকাউন্ট ব্যান করা সম্ভব নয়!")

    new_status = not u.data.get("is_banned", False)
    supabase.table("users").update({"is_banned": new_status}).eq("id", data.user_id).execute()
    
    return {"message": f"ইউজারকে সফলভাবে {'ব্যান' if new_status else 'আনব্যান'} করা হয়েছে!", "is_banned": new_status}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int):
    u = supabase.table("users").select("role").eq("id", user_id).single().execute()
    if u.data and u.data["role"] == "admin":
        raise HTTPException(status_code=400, detail="এডমিন একাউন্ট ডিলিট করা যাবে না!")

    supabase.table("users").delete().eq("id", user_id).execute()
    return {"message": "ইউজার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!"}


class CreateYoutubeTaskSchema(BaseModel):
    title: str
    description: str
    link: str
    reward_amount: float

@app.post("/api/admin/tasks/youtube")
def create_youtube_task(data: CreateYoutubeTaskSchema):
    res = supabase.table("tasks").insert({
        "task_type": "youtube",
        "title": data.title,
        "description": data.description,
        "link": data.link,
        "keyword": data.link,  # সেফটি ব্যাকআপ
        "reward_amount": data.reward_amount,
        "status": "active"
    }).execute()
    return {"message": "ইউটিউব টাস্ক সফলভাবে তৈরি হয়েছে!", "data": res.data}

# ================= ইউটিউব টাস্কে কমপ্লিট টাস্ক ফিল্টার ================= #

@app.get("/api/tasks/youtube")
def get_youtube_tasks(user_id: Optional[int] = None):
    # ১. সকল সক্রিয় ইউটিউব কাজ আনা
    res = supabase.table("tasks").select("*").eq("task_type", "youtube").eq("status", "active").execute()
    tasks = res.data or []

    # ২. ইউজারের কমপ্লিট (approved) ও পেন্ডিং কাজগুলো বাদ দেওয়া
    if user_id:
        subs_res = supabase.table("task_submissions")\
            .select("task_id, status")\
            .eq("user_id", user_id)\
            .in_("status", ["approved", "pending"])\
            .execute()

        completed_task_ids = {s["task_id"] for s in (subs_res.data or [])}

        # শুধুমাত্র অবশিষ্ট এবং রিজেক্ট হওয়া কাজগুলো রাখা হবে
        tasks = [t for t in tasks if t["id"] not in completed_task_ids]

    return tasks
    
# ----------------- IMGBB ADVANCED MANAGEMENT APIs ----------------- #

@app.post("/api/admin/imgbb-keys/test-all")
def test_all_imgbb_keys():
    """সবগুলো কী লাইভ টেস্ট করে ফেইল্ড কীগুলোকে স্বয়ংক্রিয়ভাবে ইন-এক্টিভ (Failed) করে দেয়"""
    keys_res = supabase.table("imgbb_keys").select("*").execute()
    keys = keys_res.data or []
    
    # ১ পিক্সেলের টেস্ট ইমেজ
    dummy_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    active_count = 0
    failed_count = 0

    for k in keys:
        try:
            r = requests.post("https://api.imgbb.com/1/upload", data={"key": k["api_key"], "image": dummy_b64}, timeout=7)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                supabase.table("imgbb_keys").update({"is_active": True}).eq("id", k["id"]).execute()
                active_count += 1
            else:
                supabase.table("imgbb_keys").update({"is_active": False}).eq("id", k["id"]).execute()
                failed_count += 1
        except Exception:
            supabase.table("imgbb_keys").update({"is_active": False}).eq("id", k["id"]).execute()
            failed_count += 1

    return {
        "message": f"ভেরিফিকেশন সম্পন্ন! সক্রিয়: {active_count}টি, ব্যর্থ (Failed): {failed_count}টি",
        "active": active_count,
        "failed": failed_count
    }


# ----------------- TYPING TASK APIs ----------------- #

# ১. এডমিন কর্তৃক ছবি আপলোড করে টাইপিং টাস্ক তৈরি
@app.post("/api/admin/tasks/typing")
async def create_typing_task(
    title: str = Form(...),
    reward_amount: float = Form(...),
    image: UploadFile = File(...)
):
    # ImgBB Key নিয়ে ছবি আপলোড
    keys_res = supabase.table("imgbb_keys").select("api_key").eq("is_active", True).execute()
    api_keys = [k["api_key"] for k in keys_res.data]

    image_bytes = await image.read()
    image_url = upload_to_imgbb(image_bytes, api_keys)

    res = supabase.table("tasks").insert({
        "task_type": "typing",
        "title": title,
        "image_url": image_url,
        "keyword": "",
        "reward_amount": reward_amount,
        "status": "active"
    }).execute()

    return {"message": "টাইপিং টাস্ক সফলভাবে তৈরি হয়েছে!", "data": res.data}

# ================= টাইপিং টাস্কে কমপ্লিট টাস্ক ফিল্টার ================= #

@app.get("/api/tasks/typing")
def get_typing_tasks(user_id: Optional[int] = None):
    # ১. সকল সক্রিয় টাইপিং কাজ আনা
    res = supabase.table("tasks").select("*").eq("task_type", "typing").eq("status", "active").execute()
    tasks = res.data or []

    # ২. ইউজারের কমপ্লিট (approved) ও পেন্ডিং কাজগুলো বাদ দেওয়া
    if user_id:
        subs_res = supabase.table("task_submissions")\
            .select("task_id, status")\
            .eq("user_id", user_id)\
            .in_("status", ["approved", "pending"])\
            .execute()

        completed_task_ids = {s["task_id"] for s in (subs_res.data or [])}

        # শুধুমাত্র অবশিষ্ট এবং রিজেক্ট হওয়া কাজগুলো রাখা হবে
        tasks = [t for t in tasks if t["id"] not in completed_task_ids]

    return tasks
    
# ৩. ইউজারের টাইপ করা টেক্সট সাবমিশন
@app.post("/api/tasks/submit-typing")
def submit_typing_task(
    task_id: int = Form(...),
    user_id: int = Form(...),
    submitted_text: str = Form(...)
):
    # স্ট্যাটাস চেক
    sub = supabase.table("task_submissions").select("*").eq("task_id", task_id).eq("user_id", user_id).order("id", desc=True).limit(1).execute()
    if sub.data:
        last_status = sub.data[0]["status"]
        if last_status == "approved":
            raise HTTPException(status_code=400, detail="আপনি ইতিমধ্যে এই কাজটি সম্পন্ন করে টাকা পেয়ে গেছেন!")
        elif last_status == "pending":
            raise HTTPException(status_code=400, detail="আপনার আগের টাইপিংটি পেন্ডিং আছে। এডমিন চেক করা পর্যন্ত অপেক্ষা করুন।")

    supabase.table("task_submissions").insert({
        "task_id": task_id,
        "user_id": user_id,
        "submitted_text": submitted_text,
        "status": "pending"
    }).execute()

    return {"message": "আপনার টাইপিং সফলভাবে জমা হয়েছে! এডমিন চেক করে ব্যালেন্স যোগ করবে।"}



# ----------------- TOTAL TASKS & REWARD SUMMARY API ----------------- #

@app.get("/api/tasks/summary")
def get_tasks_summary():
    # সব সক্রিয় টাস্কের রিওয়ার্ড ও মোট সংখ্যা হিসাব
    res = supabase.table("tasks").select("reward_amount").eq("status", "active").execute()
    tasks = res.data or []
    
    total_count = len(tasks)
    total_reward = sum(float(t.get("reward_amount") or 0.0) for t in tasks)

    return {
        "total_tasks": total_count,
        "total_reward": total_reward
    }

# ================= বুলেটপ্রুফ রেজিস্ট্রেশন ও হোল্ড ব্যালেন্স রাউট ================= #

@app.post("/api/auth/register")
def register(data: RegisterSchema):
    # ১. এক ডিভাইসে ১ একাউন্ট চেক
    device_check = supabase.table("users").select("id").eq("device_id", data.device_id.strip()).execute()
    if device_check.data:
        raise HTTPException(status_code=400, detail="এই ডিভাইস থেকে ইতিমধ্যে একটি একাউন্ট খোলা হয়েছে! একটি ডিভাইসে কেবল একটি একাউন্টই অনুমোদিত।")

    # ২. ইমেইল ডুপ্লিকেট চেক
    email_check = supabase.table("users").select("id").eq("email", data.email.strip()).execute()
    if email_check.data:
        raise HTTPException(status_code=400, detail="এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে!")

    # ৩. ৫ ডিজিট ইউনিক রেফার আইডি তৈরি
    user_5digit_id = generate_unique_5digit_id()

    # ৪. রেফারার ভ্যালিডেশন (স্পেস রিমুভ করে চেক)
    clean_ref = data.referred_by.strip() if data.referred_by else None
    referrer_user = None

    if clean_ref:
        ref_check = supabase.table("users").select("id, user_id, hold_balance").eq("user_id", clean_ref).execute()
        if ref_check.data:
            referrer_user = ref_check.data[0]

    # নতুন ইউজার যদি সঠিক রেফার কোড দেয়, তবে শুরুতেই ২০ টাকা হোল্ডে ঢুকবে
    new_user_hold_bal = 20.00 if referrer_user else 0.00

    # ৫. নতুন ইউজার ডাটাবেসে একবারে সেভ (সরাসরি ২০ টাকা হোল্ড সহ)
    user_payload = {
        "user_id": user_5digit_id,
        "name": data.name.strip(),
        "email": data.email.strip(),
        "password_hash": hash_password(data.password),
        "device_id": data.device_id.strip(),
        "referred_by": referrer_user["user_id"] if referrer_user else None,
        "balance": 0.00,
        "hold_balance": new_user_hold_bal,  # <-- এক ক্লিকেই ২০ টাকা হোল্ডে ঢুকবে
        "role": "user"
    }
    insert_res = supabase.table("users").insert(user_payload).execute()
    new_user = insert_res.data[0]

    # ৬. যিনি রেফার করেছিলেন তার একাউন্টেও ২০ টাকা হোল্ড ব্যালেন্স বাড়ানো
    if referrer_user:
        ref_id = referrer_user["id"]
        cur_ref_hold = float(referrer_user.get("hold_balance") or 0.0)
        new_ref_hold = cur_ref_hold + 20.00

        # রেফারারের hold_balance আপডেট
        supabase.table("users").update({"hold_balance": new_ref_hold}).eq("id", ref_id).execute()

        # ৭২ ঘণ্টার ক্রন-জব রিলিজের জন্য রেকর্ড সংরক্ষণ
        try:
            now_dt = datetime.utcnow()
            release_dt = (now_dt + timedelta(days=3)).isoformat()
            supabase.table("held_referrals").insert([
                {"user_id": ref_id, "friend_user_id": new_user["id"], "amount": 20.00, "status": "held", "release_at": release_dt},
                {"user_id": new_user["id"], "friend_user_id": ref_id, "amount": 20.00, "status": "held", "release_at": release_dt}
            ]).execute()
        except Exception as e:
            print("Held table log error (ignored):", e)

    # ৭. লগইন টোকেন প্রদান
    token = create_access_token({"sub": str(new_user["id"]), "user_id": user_5digit_id, "role": "user"})

    return {
        "message": "নিবন্ধন সফল হয়েছে!",
        "token": token,
        "user_id": user_5digit_id,
        "hold_balance": new_user_hold_bal
    }
    
# ৪. এডমিনের পেন্ডিং টাইপিং সাবমিশন লিস্ট
@app.get("/api/admin/typing/pending")
def get_pending_typing_submissions():
    res = supabase.table("task_submissions")\
        .select("id, task_id, user_id, submitted_text, status, created_at, tasks(title, reward_amount, image_url), users(name, user_id)")\
        .eq("status", "pending")\
        .not_.is_("submitted_text", "null")\
        .order("created_at", desc=True)\
        .execute()
    return res.data
    
@app.post("/api/admin/imgbb-keys/toggle/{key_id}")
def toggle_imgbb_key_status(key_id: int):
    k = supabase.table("imgbb_keys").select("is_active").eq("id", key_id).single().execute()
    if not k.data:
        raise HTTPException(status_code=404, detail="কী পাওয়া যায়নি!")
    new_status = not k.data.get("is_active", True)
    supabase.table("imgbb_keys").update({"is_active": new_status}).eq("id", key_id).execute()
    return {"message": "স্ট্যাটাস পরিবর্তিত হয়েছে!", "is_active": new_status}
    
# ================= CRON JOB: ৭২ ঘণ্টা পর অটো রিলিজ ================= #

@app.get("/api/cron/release-referrals")
def cron_release_referrals():
    now_iso = datetime.utcnow().isoformat()

    # যে রেফারেলগুলোর ৭২ ঘণ্টা পার হয়ে গেছে এবং এখনো held আছে
    held_res = supabase.table("held_referrals")\
        .select("id, user_id, amount")\
        .eq("status", "held")\
        .lte("release_at", now_iso)\
        .execute()

    records = held_res.data
    if not records:
        return {"message": "রিলিজ করার মতো কোনো রেফারেল পাওয়া যায়নি।", "released_count": 0}

    released_count = 0

    for rec in records:
        u_id = rec["user_id"]
        amt = float(rec["amount"])

        # ইউজারের ব্যালেন্স আপডেট (hold থেকে কেটে মূল ব্যালেন্সে যোগ)
        u_res = supabase.table("users").select("balance, hold_balance").eq("id", u_id).single().execute()
        if u_res.data:
            cur_bal = float(u_res.data.get("balance") or 0.0)
            cur_hold = float(u_res.data.get("hold_balance") or 0.0)

            new_bal = cur_bal + amt
            new_hold = max(0.0, cur_hold - amt)

            # ব্যালেন্স ট্রান্সফার
            supabase.table("users").update({
                "balance": new_bal,
                "hold_balance": new_hold
            }).eq("id", u_id).execute()

            # স্ট্যাটাস রিলিজড করা
            supabase.table("held_referrals").update({"status": "released"}).eq("id", rec["id"]).execute()
            released_count += 1

    return {
        "message": f"সফলভাবে {released_count}টি রেফারেল বোনাস মূল ব্যালেন্সে যুক্ত হয়েছে!",
        "released_count": released_count
            }



# ----------------- JOB POST TASK APIs ----------------- #

@app.post("/api/admin/tasks/job")
async def create_job_post_task(
    title: str = Form(...),
    description: str = Form(...),
    caption: str = Form(...),
    reward_amount: float = Form(...),
    image: UploadFile = File(...)
):
    # ImgBB Key নিয়ে পোস্টের ছবি আপলোড
    keys_res = supabase.table("imgbb_keys").select("api_key").eq("is_active", True).execute()
    api_keys = [k["api_key"] for k in keys_res.data]

    image_bytes = await image.read()
    image_url = upload_to_imgbb(image_bytes, api_keys)

    res = supabase.table("tasks").insert({
        "task_type": "job_post",
        "title": title,
        "description": description,
        "caption": caption,
        "image_url": image_url,
        "keyword": "",
        "reward_amount": reward_amount,
        "status": "active"
    }).execute()

    return {"message": "জব পোস্ট টাস্ক সফলভাবে তৈরি হয়েছে!", "data": res.data}


# ================= শুধুমাত্র ফেসবুক জব পোস্ট পেন্ডিং API ================= #

@app.get("/api/admin/job/pending")
def get_pending_job_submissions():
    res = supabase.table("task_submissions")\
        .select("id, task_id, user_id, screenshot_url, status, created_at, tasks(title, reward_amount, task_type, image_url, caption), users(name, user_id)")\
        .eq("status", "pending")\
        .order("created_at", desc=True)\
        .execute()

    all_pending = res.data or []
    # শুধুমাত্র job_post টাস্কের সাবমিশন ফিল্টার করা
    job_pending = [
        s for s in all_pending 
        if s.get("tasks") and s["tasks"].get("task_type") == "job_post"
    ]
    return job_pending
    

@app.get("/api/tasks/job")
def get_job_post_tasks():
    res = supabase.table("tasks").select("*").eq("task_type", "job_post").eq("status", "active").execute()
    return res.data
# হেল্থ চেক
@app.get("/api")
def health_check():
    return {"status": "ok", "project": "TaskBee Master API"}
