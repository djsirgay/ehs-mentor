# EHS Mentor — Prototype v2+ (CSV import + matched tags)

New in v2+:
- Import Employee Roster via CSV at /app
- Role counts (/stats/roles) and role alias normalization
- Matched tags (role default + equipment + incidents) visible in UI
- Optional equipment_tag_map.csv to map equipment → risk_tags

## Run
pip install -r requirements.txt
uvicorn app:app --reload
Open http://127.0.0.1:8000/app

## CSV format (Employee Roster)
user_id,name,email,role,job_code,location,equipment_tags,incidents,manager,hired_date

## Optional
Edit training_catalog.json to add default_tags/aliases for more roles.
Edit equipment_tag_map.csv to tune mapping.
