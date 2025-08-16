# Деплой EHS Mentor на Render

## Шаги деплоя:

### 1. Подготовка репозитория
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Деплой на Render
1. Зайти на https://render.com
2. Подключить GitHub аккаунт
3. Создать новый Web Service
4. Выбрать репозиторий `ehs-mentor`
5. Настройки:
   - **Name**: ehs-mentor
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

### 3. Альтернативные платформы

#### Railway
1. Зайти на https://railway.app
2. Подключить GitHub
3. Deploy from repo
4. Выбрать `ehs-mentor`

#### Vercel (для статики + Serverless Functions)
```bash
npm i -g vercel
vercel --prod
```

### 4. После деплоя
- Проверить работу на URL от Render
- Протестировать все функции
- Настроить домен (опционально)

## Локальный запуск
```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

Открыть: http://127.0.0.1:8000/app