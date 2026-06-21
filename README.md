# Users API

REST API на NestJS, PostgreSQL, TypeORM и CQRS. Локальная инфраструктура также
включает Redis и совместимое с S3 объектное хранилище MinIO.

## Требования

- Node.js 20+
- npm
- Docker
- Docker Compose

## Подготовка

Установить зависимости:

```bash
npm install
```

Создать локальный `.env` из примера:

```bash
cp .env.example .env
```

На Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Запуск инфраструктуры

Запустить инфраструктуру:

```bash
docker compose up -d
```

Остановить инфраструктуру:

```bash
docker compose down
```

PostgreSQL:

- host: `localhost`
- port: значение `DATABASE_PORT` из `.env`
- database: значение `DATABASE_NAME` из `.env`
- user: значение `DATABASE_USER` из `.env`
- password: значение `DATABASE_PASSWORD` из `.env`

pgAdmin:

- URL: `http://localhost:${PGADMIN_PORT}`
- email: значение `PGADMIN_DEFAULT_EMAIL` из `.env`
- password: значение `PGADMIN_DEFAULT_PASSWORD` из `.env`

Redis:

- host: `localhost`
- port: значение `REDIS_PORT` из `.env`

MinIO:

- S3 endpoint: значение `MINIO_ENDPOINT` из `.env`
- console: `http://localhost:${MINIO_CONSOLE_PORT}`
- access key: значение `MINIO_ACCESS_KEY` из `.env`
- secret key: значение `MINIO_SECRET_KEY` из `.env`
- bucket: значение `MINIO_BUCKET` из `.env`

Bucket создаётся приложением лениво перед первой операцией загрузки. В базе
данных хранится только сгенерированное имя файла, без endpoint или домена MinIO.

Для подключения сервера в pgAdmin:

- host: `postgres`
- port: `5432`
- maintenance database: значение `DATABASE_NAME` из `.env`
- username: значение `DATABASE_USER` из `.env`
- password: значение `DATABASE_PASSWORD` из `.env`

## Запуск приложения

Development mode:

```bash
npm run start:dev
```

Production-like start after build:

```bash
npm run build
npm run start
```

Приложение по умолчанию запускается на:

```text
http://localhost:3000
```

Health endpoint:

```text
GET http://localhost:3000/api/health
```

Swagger:

```text
http://localhost:3000/docs
```

## Миграции

Создать новую миграцию:

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

Пример:

```bash
npm run migration:generate -- src/database/migrations/CreateUsersTable
```

Накатить миграции:

```bash
npm run migration:run
```

Перед запуском миграций PostgreSQL должен быть поднят:

```bash
docker compose up -d
```

## Проверка перед review

```bash
npm run build
npm run lint
npm test
```

Также проверить вручную:

- `GET http://localhost:3000/api/health`
- `http://localhost:3000/docs`
- `http://localhost:5050`
- `http://localhost:9001`
