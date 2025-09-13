# EHS Mentor — Deployment Guide

## Production Deployment

### 1. Environment Variables
```bash
DATABASE_DSN=postgresql://user:pass@host:5432/dbname
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
PORT=8000
```

### 2. Database Setup
```bash
# Apply migrations
alembic upgrade head

# Load initial data (optional)
psql $DATABASE_DSN -c "\copy courses FROM 'data/courses.csv' CSV HEADER"
psql $DATABASE_DSN -c "\copy users FROM 'data/users.csv' CSV HEADER"
```

### 3. Docker Production
```bash
# Build
docker build -t ehs-mentor .

# Run
docker run -p 8000:8000 \
  -e DATABASE_DSN="postgresql://..." \
  -e AWS_REGION="us-east-1" \
  -e AWS_ACCESS_KEY_ID="..." \
  -e AWS_SECRET_ACCESS_KEY="..." \
  -v /path/to/data:/data \
  ehs-mentor
```

### 4. Health Check
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","database":"connected"}
```

## API Endpoints

### Core Functionality
- `POST /api/recommend` - Get course recommendations for user
- `POST /api/assignments/create` - Create assignment
- `POST /api/assignments/list` - List user assignments
- `POST /api/assignments/reassign` - Update assignment status

### Document Processing
- `POST /api/documents/upload` - Upload PDF document
- `POST /api/documents/register` - Register existing PDF
- `POST /api/documents/extract` - AI extract courses from PDF
- `POST /api/documents/promote` - Promote extracted courses to rules
- `POST /api/documents/process` - Full pipeline (extract + promote + assign)

### AI Chat
- `POST /api/chat` - Chat with AI assistant

## Security Notes
- Change CORS origins in production
- Use proper AWS IAM roles instead of access keys
- Enable database SSL in production
- Add rate limiting for AI endpoints