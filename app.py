from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import os, json, yaml, sqlite3, time, random, csv, io

BASE = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE, "ehs.db")
MOD_DIR = os.path.join(BASE, "modules")
POL_DIR = os.path.join(BASE, "policies")
CATALOG_PATH = os.path.join(BASE, "training_catalog.json")
FRONTEND_DIR = os.path.join(BASE, "frontend")
EQUIP_MAP_CSV = os.path.join(BASE, "equipment_tag_map.csv")

# --- DB ---
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        role TEXT,
        job_code TEXT,
        location TEXT,
        equipment TEXT,
        incidents TEXT,
        manager TEXT,
        hired_date TEXT,
        created_at INTEGER
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS completions(
        user_id TEXT,
        module_id TEXT,
        status TEXT,
        ts INTEGER,
        PRIMARY KEY (user_id, module_id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS rec_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        payload TEXT,
        response TEXT,
        ts INTEGER
    )""")
    conn.commit()
    conn.close()

init_db()

# Create demo user
def create_demo_user():
    conn = db()
    c = conn.cursor()
    c.execute("""INSERT OR REPLACE INTO users(id,name,email,role,job_code,location,equipment,incidents,manager,hired_date,created_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
              ('svetlana', 'Svetlana Alekseevna', 'svetlana@calpoly.edu', 'Research Assistant', 'RA001', 'San Luis Obispo', 
               json.dumps(['chemicals', 'biosafety_cabinet']), json.dumps(['spill']), 'Dr. Johnson', '2024-01-15', int(time.time())))
    
    # Add required training modules for Svetlana
    required_modules = ['lab_safety_basics', 'chemical_handling', 'fire_safety', 'ppe_training']
    for module_id in required_modules:
        c.execute("INSERT OR REPLACE INTO completions(user_id,module_id,status,ts) VALUES(?,?,?,?)",
                  ('svetlana', module_id, 'assigned', int(time.time())))
    
    conn.commit()
    conn.close()

create_demo_user()

# --- Load modules/policies/catalog ---
def load_modules():
    modules = {}
    if os.path.isdir(MOD_DIR):
        for fname in os.listdir(MOD_DIR):
            if fname.endswith(".yaml"):
                with open(os.path.join(MOD_DIR, fname), "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    modules[data["id"]] = data
    
    # Always add demo modules
    demo_modules = {
        'lab_safety_basics': {
            'id': 'lab_safety_basics',
            'title': 'Laboratory Safety Fundamentals',
            'description': 'Essential safety protocols for laboratory environments',
            'risk_tags': ['lab_safety', 'chemicals'],
            'source': 'policies/lab_safety.txt'
        },
        'chemical_handling': {
            'id': 'chemical_handling',
            'title': 'Chemical Handling Safety',
            'description': 'Safe handling, storage, and disposal of chemicals',
            'risk_tags': ['chemicals', 'sds'],
            'source': 'policies/chemical_safety.txt'
        },
        'fire_safety': {
            'id': 'fire_safety',
            'title': 'Fire Safety & Emergency Procedures',
            'description': 'Fire prevention and emergency response protocols',
            'risk_tags': ['fire_safety', 'emergency'],
            'source': 'policies/fire_safety.txt'
        },
        'ppe_training': {
            'id': 'ppe_training',
            'title': 'Personal Protective Equipment',
            'description': 'Selection and proper use of PPE',
            'risk_tags': ['ppe', 'protection'],
            'source': 'policies/ppe.txt'
        }
    }
    modules.update(demo_modules)
    return modules

def load_policies():
    texts = {}
    if os.path.isdir(POL_DIR):
        for fname in os.listdir(POL_DIR):
            if fname.endswith(".txt"):
                with open(os.path.join(POL_DIR, fname), "r", encoding="utf-8") as f:
                    texts[f"policies/{fname}"] = [ln.strip() for ln in f if ln.strip()]
    
    # Add demo policies if no policies loaded
    if not texts:
        texts = {
            'policies/lab_safety.txt': [
                '- Always wear appropriate PPE in laboratory settings',
                '- Maintain clean and organized work areas',
                '- Report all incidents immediately to supervisor',
                '- Follow proper chemical storage procedures'
            ],
            'policies/chemical_safety.txt': [
                '- Read and understand SDS before handling chemicals',
                '- Use proper ventilation when working with chemicals',
                '- Store chemicals according to compatibility guidelines',
                '- Dispose of chemical waste in designated containers'
            ],
            'policies/fire_safety.txt': [
                '- Know location of fire exits and assembly points',
                '- Understand proper use of fire extinguishers',
                '- Report fire hazards immediately',
                '- Participate in regular fire drills'
            ],
            'policies/ppe.txt': [
                '- Select appropriate PPE for specific tasks',
                '- Inspect PPE before each use',
                '- Replace damaged or worn PPE immediately',
                '- Follow proper donning and doffing procedures'
            ]
        }
    return texts

def load_catalog():
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def load_equip_map():
    mapping = {}
    if os.path.exists(EQUIP_MAP_CSV):
        with open(EQUIP_MAP_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mapping[row["equipment_tag"].strip().lower()] = [t.strip() for t in row["adds_risk_tags"].split(";") if t.strip()]
    else:
        mapping = {"forklift": ["heavy_equipment","refueling"],
                   "biosafety_cabinet": ["biosafety","airflow"],
                   "chemicals": ["chemicals","sds","spill_response"]}
    return mapping

# Load modules at startup but allow reloading
MODULES = load_modules()
POLICIES = load_policies()
CATALOG = load_catalog()
EQUIP_MAP = load_equip_map()

def build_checklist(selected_ids):
    lines = []
    for mid in selected_ids:
        src = MODULES[mid]["source"]
        for line in POLICIES.get(src, []):
            if line.startswith("- "):
                lines.append(line[2:].strip())
    out = []
    for x in lines:
        if x not in out:
            out.append(x)
    return out[:6]

def quiz_from_module(mid):
    src = MODULES[mid]["source"]
    bullets = [ln[2:].strip() for ln in POLICIES.get(src, []) if ln.startswith("- ")]
    if not bullets:
        return None
    correct = bullets[0]
    distractors = (bullets[1:3] + ["Not applicable"])[:2]
    opts = [correct] + distractors
    random.shuffle(opts)
    letter = "abc"[opts.index(correct)]
    return {
        "q": f"What must you remember about {MODULES[mid]['title']}?",
        "a": opts[0], "b": opts[1], "c": opts[2],
        "correct": letter,
        "why": f"Source: {os.path.basename(src)} (demo)",
        "source_id": f"{src}#1"
    }

def canonical_role(role_in:str):
    if not role_in: return role_in
    r = role_in.strip().lower()
    roles = CATALOG.get("roles", {})
    for name, data in roles.items():
        if name.lower() == r: return name
        if any(a.lower() == r for a in data.get("aliases", [])): return name
    # fuzzy contains
    for name in roles:
        if r in name.lower() or name.lower() in r: return name
    return role_in

def tags_from_equipment(equip_list):
    tags = set()
    for e in equip_list:
        e_key = e.strip().lower()
        tags.update(EQUIP_MAP.get(e_key, []))
    return tags

def tags_from_incidents(inc_list):
    tags = set()
    for inc in inc_list:
        low = inc.lower()
        if "spill" in low: tags.update(["spill_response","chemicals","sds"])
        if "ppe" in low: tags.add("ppe")
        if "forklift" in low: tags.add("heavy_equipment")
        if "near_miss" in low: tags.add("preoperation_check")
    return tags

# Create FastAPI app with CSP headers
app = FastAPI(title="EHS Mentor", description="Employee Health & Safety Training System")

# Add CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WWW redirect middleware
@app.middleware("http")
async def www_to_root(request, call_next):
    host = request.headers.get("host", "").lower()
    if host.startswith("www."):
        target = str(request.url).replace("//www.", "//")
        return RedirectResponse(target, status_code=308)
    return await call_next(request)

@app.middleware("http")
async def add_csp_header(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none';"
    return response

def compute_recommend(role, location, equipment, incidents, persist_user_id=None):
    role_key = canonical_role(role or "")
    role_def = CATALOG["roles"].get(role_key, {})
    required = [mid for mid in role_def.get("required_modules", []) if mid in MODULES]
    optional = [mid for mid in role_def.get("optional_modules", []) if mid in MODULES]
    # matched tags
    tags = set(role_def.get("default_tags", []))
    tags.update(tags_from_equipment(equipment or []))
    tags.update(tags_from_incidents(incidents or []))

    # add optional modules whose risk_tags intersect tags
    for mid, md in MODULES.items():
        if mid in required or mid in optional: continue
        if set(md.get("risk_tags", [])) & tags:
            optional.append(mid)

    checklist = build_checklist(required + optional[:1])
    quiz = []
    for mid in (required[:1] + optional[:1]):
        q = quiz_from_module(mid)
        if q: quiz.append(q)

    resp = {"role": role_key, "matched_tags": sorted(tags),
            "modules": required, "micro_modules": optional[:2],
            "checklist": checklist, "quiz": quiz}

    if persist_user_id:
        conn = db(); c = conn.cursor()
        c.execute("INSERT INTO rec_logs(user_id,payload,response,ts) VALUES(?,?,?,?)",
                  (persist_user_id, json.dumps({"role":role,"location":location,"equipment":equipment,"incidents":incidents}), json.dumps(resp), int(time.time())))
        for mid in required + optional[:2]:
            c.execute("INSERT OR IGNORE INTO completions(user_id,module_id,status,ts) VALUES(?,?,?,?)",
                      (persist_user_id, mid, "assigned", int(time.time())))
        conn.commit(); conn.close()
    return resp

# Mount static files
app.mount("/app", StaticFiles(directory="frontend", html=True), name="app")

class Profile(BaseModel):
    role: str
    location: str
    equipment: list[str] = []
    incidents: list[str] = []

class Register(BaseModel):
    user_id: str
    name: str | None = None
    email: str | None = None
    role: str
    job_code: str | None = None
    location: str
    equipment: list[str] = []
    incidents: list[str] = []
    manager: str | None = None
    hired_date: str | None = None

class Complete(BaseModel):
    user_id: str
    module_id: str
    status: str = "completed"

# Redirects
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/app/", status_code=307)

@app.get("/app", include_in_schema=False)
def app_no_slash():
    return RedirectResponse(url="/app/", status_code=308)

@app.get("/api")
def api_info():
    return {"ok": True, "endpoints": ["/app", "/recommend", "/user/register", "/import/roster", "/progress/{user_id}", "/catalog/roles", "/stats/roles", "/assign/all", "/export/progress", "/users/list", "/progress/{user_id}/reset"]}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/catalog/roles")
def catalog_roles():
    return {"roles": CATALOG["roles"]}

@app.get("/stats/roles")
def stats_roles():
    conn = db(); c = conn.cursor()
    rows = c.execute("SELECT role, COUNT(*) as cnt FROM users GROUP BY role").fetchall()
    conn.close()
    return {"counts": {r["role"]: r["cnt"] for r in rows}}

@app.get("/users/list")
def users_list():
    conn = db(); c = conn.cursor()
    rows = c.execute("SELECT id, role, location FROM users ORDER BY id").fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}

@app.post("/user/register")
def user_register(body: Register):
    conn = db()
    c = conn.cursor()
    c.execute("""INSERT OR REPLACE INTO users(id,name,email,role,job_code,location,equipment,incidents,manager,hired_date,created_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
              (body.user_id, body.name, body.email, canonical_role(body.role), body.job_code, body.location,
               json.dumps(body.equipment), json.dumps(body.incidents), body.manager, body.hired_date, int(time.time())))
    conn.commit()
    conn.close()
    return {"ok": True, "user_id": body.user_id}

@app.get("/user/{user_id}")
def user_get(user_id: str):
    conn = db(); c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found")
    return dict(row)

@app.post("/import/roster")
async def import_roster(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    required_cols = {"user_id","name","email","role","job_code","location","equipment_tags","incidents","manager","hired_date"}
    if not required_cols.issubset(set([h.strip() for h in reader.fieldnames or []])):
        raise HTTPException(400, f"CSV must include columns: {sorted(required_cols)}")
    conn = db(); c = conn.cursor()
    inserted = 0
    for row in reader:
        uid = row["user_id"].strip()
        role = canonical_role(row.get("role","").strip() or "")
        equipment = [x.strip() for x in (row.get("equipment_tags","") or "").split(";") if x.strip()]
        incidents = [x.strip() for x in (row.get("incidents","") or "").split(";") if x.strip()]
        c.execute("""INSERT OR REPLACE INTO users(id,name,email,role,job_code,location,equipment,incidents,manager,hired_date,created_at)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                  (uid, row.get("name"), row.get("email"), role, row.get("job_code"),
                   row.get("location"), json.dumps(equipment), json.dumps(incidents),
                   row.get("manager"), row.get("hired_date"), int(time.time())))
        inserted += 1
    conn.commit(); conn.close()
    return {"ok": True, "inserted": inserted}

@app.post("/recommend")
def recommend(profile: Profile, user_id: str | None = None):
    return compute_recommend(profile.role, profile.location, profile.equipment, profile.incidents, persist_user_id=user_id)

@app.post("/progress/complete")
def mark_complete(body: Complete):
    conn = db(); c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO completions(user_id,module_id,status,ts) VALUES(?,?,?,?)",
              (body.user_id, body.module_id, body.status, int(time.time())))
    conn.commit(); conn.close()
    return {"ok": True}

@app.get("/progress/{user_id}")
def progress(user_id: str):
    conn = db(); c = conn.cursor()
    rows = c.execute("SELECT module_id,status,ts FROM completions WHERE user_id=?", (user_id,)).fetchall()
    conn.close()
    
    # Reload modules to ensure demo modules are available
    current_modules = load_modules()
    
    # Enrich with module details
    items = []
    for r in rows:
        module_info = current_modules.get(r["module_id"], {})
        item = {
            "module_id": r["module_id"],
            "status": r["status"],
            "ts": r["ts"],
            "title": module_info.get("title", r["module_id"]),
            "description": module_info.get("description", ""),
            "priority": "High" if r["status"] == "assigned" else "Medium"
        }
        items.append(item)
    
    return {"user_id": user_id, "items": items}

@app.delete("/progress/{user_id}/reset")
def reset_progress(user_id: str):
    conn = db(); c = conn.cursor()
    c.execute("DELETE FROM completions WHERE user_id=?", (user_id,))
    conn.commit(); conn.close()
    return {"ok": True, "message": "Progress reset"}

# ---- Authentication endpoints
@app.post("/auth/login")
def login(credentials: dict):
    username = credentials.get("username", "").lower()
    password = credentials.get("password", "")
    
    # Demo credentials
    if username == "svetlana" and password == "student123":
        return {"ok": True, "user_id": "svetlana", "role": "student"}
    elif username == "faculty1" and password == "faculty123":
        return {"ok": True, "user_id": "faculty1", "role": "faculty"}
    elif username == "admin" and password == "admin123":
        return {"ok": True, "user_id": "admin", "role": "admin"}
    else:
        raise HTTPException(401, "Invalid credentials")

# ---- New: batch assign for all users
@app.post("/assign/all")
def assign_all():
    conn = db(); c = conn.cursor()
    users = c.execute("SELECT id, role, location, equipment, incidents FROM users").fetchall()
    total = 0
    by_role = {}
    for u in users:
        equip = json.loads(u["equipment"] or "[]")
        inc = json.loads(u["incidents"] or "[]")
        resp = compute_recommend(u["role"], u["location"], equip, inc, persist_user_id=u["id"])
        total += 1
        by_role[resp["role"]] = by_role.get(resp["role"], 0) + 1
    conn.close()
    return {"ok": True, "processed": total, "by_role": by_role}

# ---- New: export progress as CSV
@app.get("/export/progress")
def export_progress():
    conn = db(); c = conn.cursor()
    rows = c.execute("""
        SELECT u.id as user_id, u.role, u.location, c.module_id, c.status, c.ts
        FROM completions c JOIN users u ON u.id = c.user_id
        ORDER BY u.id, c.module_id
    """).fetchall()
    conn.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["user_id","role","location","module_id","status","ts"])
    for r in rows:
        writer.writerow([r["user_id"], r["role"], r["location"], r["module_id"], r["status"], r["ts"]])
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(content=csv_bytes, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=progress_export.csv"
    })
