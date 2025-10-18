# 🎓 Competency Graph API

API для работы с графом компетенций на основе RDF онтологии с JWT авторизацией.

## 🚀 Быстрый старт

```bash
# Запустить все сервисы
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

**Что происходит при запуске:**
1. 🚀 Запускается GraphDB, PostgreSQL, Redis
2. ✅ Проверяются healthcheck'и всех сервисов
3. 🔧 Автоматически создается репозиторий `competencies` в GraphDB (контейнер `graphdb-init`)
4. 🎯 Запускается FastAPI приложение

Откройте в браузере:
- **Swagger UI**: http://localhost/docs
- **GraphDB Workbench**: http://localhost:7200

## 📚 Документация

- **[QUICKSTART.md](QUICKSTART.md)** - Подробная инструкция по запуску и использованию
- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - Руководство по авторизации (если файл доступен)

## 🏗️ Архитектура

```
┌─────────────────────────┐
│   FastAPI App :80       │
│   + JWT Auth            │
│   + SPARQL Queries      │
└───────┬─────────────────┘
        │
    ┌───┴────┬──────────┬──────────┐
    ▼        ▼          ▼          ▼
┌─────────┐ ┌───────┐ ┌──────┐ ┌────────┐
│ GraphDB │ │Postgres│ │Redis│ │Volumes│
│  :7200  │ │ :5432  │ │:6379│ │       │
└─────────┘ └────────┘ └─────┘ └────────┘
     │          │         │
  Ontology   Metadata  Sessions
   (RDF)     Comments   Tokens
```

## ✨ Основные возможности

### 🔐 Авторизация
- JWT access/refresh токены
- Регистрация и вход пользователей
- Автоматическое определение автора действий
- Хранение refresh токенов в Redis

### 📊 Работа с графом компетенций
- Получение всего графа или его части
- Поиск предков и потомков компетенции
- Навигация по онтологии с указанием глубины
- SPARQL запросы к GraphDB

### 💬 Комментирование
- Комментарии к RDF триплетам
- Привязка к конкретным файлам и строкам
- Автоматическая атрибуция автора

## 🎯 Регистрация пользователей

При регистрации необходимо указать:
- Email (уникальный)
- Пароль
- Имя (first_name)
- Фамилию (last_name)

Пример регистрации через API:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "Иван",
  "last_name": "Иванов"
}
```

## 🔧 Технологический стек

- **FastAPI** - веб-фреймворк
- **GraphDB** - RDF база данных (OntoText)
- **PostgreSQL** - реляционная БД для метаданных
- **Redis** - кэш для токенов
- **SPARQLWrapper** - работа с SPARQL
- **JWT** - авторизация
- **Docker Compose** - оркестрация

## 📡 API Endpoints

### Авторизация
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/refresh` - Обновление токенов
- `POST /api/v1/auth/logout` - Выход

### Граф компетенций
- `GET /api/v1/competencies/graph` - Получить весь граф
- `POST /api/v1/competencies/graph` - Сохранить граф
- `GET /api/v1/competencies/graph/{node_id}` - Получить часть графа
- `GET /api/v1/competencies/{node_id}/ancestors` - Предки узла
- `GET /api/v1/competencies/{node_id}/descendants` - Потомки узла
- `GET /api/v1/competencies/path` - Путь между узлами

### Комментарии
- `POST /api/v1/comments` - Создать комментарии
- `GET /api/v1/comments/{filename}` - Получить комментарии

## 🔒 Безопасность

✅ Пароли хешируются через bcrypt
✅ JWT токены с коротким временем жизни
✅ Refresh токены в Redis с TTL
✅ Автоматическая проверка токенов через middleware
✅ CORS настроен для всех origins (измените в продакшене!)

## 🛠️ Разработка

### Структура проекта

```
app/
├── api/v1/           # API endpoints
├── dao/              # Data Access Objects
├── db/migrations/    # SQL миграции
├── dependencies/     # DI контейнеры
├── middlewares/      # Middleware (auth)
├── models/           # Pydantic модели
├── services/         # Бизнес-логика
└── main.py           # Точка входа
```

### Добавление зависимостей

Отредактируйте `app/pyproject.toml` и пересоберите контейнер:

```bash
docker-compose build --no-cache
```

### Создание миграций БД

Добавьте новые `.sql` файлы в `app/db/migrations/`

## 📝 Переменные окружения

Настраиваются в `docker-compose.yaml`:

```yaml
GRAPHDB_URL=http://graphdb:7200
GRAPHDB_REPOSITORY=competencies
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/competency_graph
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=<ваш-секретный-ключ>
ACCESS_TOKEN_EXPIRE=900      # 15 минут
REFRESH_TOKEN_EXPIRE=604800  # 7 дней
```

## 🐛 Troubleshooting

### БД не обновляется
```bash
docker-compose down -v  # Удалить volumes
docker-compose up
```

### Порт 80 занят
Измените в `docker-compose.yaml`:
```yaml
ports:
  - "8080:80"  # Используйте порт 8080
```

### Redis не подключается
```bash
docker ps | grep redis  # Проверить статус
docker logs competency_graph-redis-1  # Логи
```

## 📄 Лицензия

MIT

## 👥 Контакты

Для вопросов и предложений создавайте issues в репозитории.
