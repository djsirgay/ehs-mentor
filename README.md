# EHS Mentor — Prototype v2+ (CSV import + matched tags)

🚀 **Live Demo**: [https://ehs-mentor.onrender.com/app](https://ehs-mentor.onrender.com/app)

New in v2+:
- Import Employee Roster via CSV at /app
- Role counts (/stats/roles) and role alias normalization
- Matched tags (role default + equipment + incidents) visible in UI
- Optional equipment_tag_map.csv to map equipment → risk_tags
- Production deployment ready

## Quick Start

### Local Development
```bash
pip install -r requirements.txt
uvicorn app:app --reload
```
Open http://127.0.0.1:8000/app

### Production Deployment
See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Demo Credentials
- **Student**: svetlana / student123
- **Faculty**: faculty1 / faculty123  
- **Admin**: admin / admin123

## CSV format (Employee Roster)
```
user_id,name,email,role,job_code,location,equipment_tags,incidents,manager,hired_date
```

## Configuration
- Edit `training_catalog.json` to add default_tags/aliases for more roles
- Edit `equipment_tag_map.csv` to tune equipment → risk_tags mapping

## API Endpoints
- `GET /` - API overview
- `GET /app` - Main application interface
- `POST /recommend` - Get training recommendations
- `POST /import/roster` - Import employee CSV
- `GET /stats/roles` - Role statistics
- `GET /export/progress` - Export progress as CSV
