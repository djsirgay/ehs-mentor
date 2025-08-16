# 🚀 Быстрый деплой EHS Mentor

## Render (Рекомендуется)

1. **Зайти на Render**: https://render.com
2. **Подключить GitHub** и выбрать репозиторий `ehs-mentor`
3. **Создать Web Service** с настройками:
   ```
   Name: ehs-mentor
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app:app --host 0.0.0.0 --port $PORT
   ```
4. **Deploy** - процесс займет 2-3 минуты
5. **Получить URL** типа `https://ehs-mentor-xyz.onrender.com`

## Railway (Альтернатива)

1. **Зайти на Railway**: https://railway.app  
2. **Deploy from GitHub** → выбрать `ehs-mentor`
3. **Автоматический деплой** - Railway сам определит Python проект

## Vercel (Для статики)

```bash
npm i -g vercel
cd ehs_mentor_prototype_v2_plus
vercel --prod
```

## После деплоя

✅ Открыть `/app` для главного интерфейса  
✅ Протестировать логин (svetlana/student123)  
✅ Проверить импорт CSV  
✅ Настроить домен (опционально)

## Демо-данные включены
- Пользователь Svetlana с назначенными модулями
- Каталог ролей и оборудования  
- Политики безопасности
- Тестовые модули обучения