# Users API

Монорепозиторий NestJS с `user-service` и `notification-service`. User service
работает с PostgreSQL, TypeORM и CQRS, публикует события переводов в Kafka.
Notification service принимает события Kafka, сохраняет уведомления в MongoDB и
отправляет их клиентам по Socket.io.

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

Если `package.json` менялся без установки пакетов, сначала обновить
`package-lock.json` этой же командой и только потом запускать проверки.

Создать локальный `.env` из примера:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

На Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```

## Запуск инфраструктуры

Запустить инфраструктуру:

```bash
docker compose up -d
```

Запустить тестовую БД:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml up -d
```

Остановить инфраструктуру:

```bash
docker compose down
docker compose -f docker-compose.test.yml down
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
- используется для кэша пользовательских запросов и BullMQ-очередей

MinIO:

- S3 endpoint: значение `MINIO_ENDPOINT` из `.env`
- console: `http://localhost:${MINIO_CONSOLE_PORT}`
- access key: значение `MINIO_ACCESS_KEY` из `.env`
- secret key: значение `MINIO_SECRET_KEY` из `.env`
- bucket: значение `MINIO_BUCKET` из `.env`

Bucket создаётся приложением лениво перед первой операцией загрузки. В базе
данных хранится только сгенерированное имя файла, без endpoint или домена MinIO.

Kafka UI:

- URL: `http://localhost:${KAFKA_UI_PORT}`
- bootstrap server внутри compose-сети: `kafka:29092`
- bootstrap server для локального Node.js: значение `KAFKA_BROKER`

MongoDB:

- URI для notification-service: значение `MONGO_URI`

Для подключения сервера в pgAdmin:

- host: `postgres`
- port: `5432`
- maintenance database: значение `DATABASE_NAME` из `.env`
- username: значение `DATABASE_USER` из `.env`
- password: значение `DATABASE_PASSWORD` из `.env`

## Запуск приложения

User service в development mode:

```bash
npm run start:user-service:dev
```

Notification service в development mode:

```bash
npm run start:notification-service:dev
```

Production-like start after build:

```bash
npm run build
npm run start:user-service
npm run start:notification-service
```

User service по умолчанию запускается на:

```text
http://localhost:3000
```

Notification service по умолчанию запускается на:

```text
http://localhost:3001
```

Health endpoint:

```text
GET http://localhost:3000/api/health
```

Swagger:

```text
http://localhost:3000/docs
```

WebSocket notification-service:

```text
ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

При подключении передать access JWT через заголовок
`Authorization: Bearer <token>` или через Socket.io auth `token`. После успешной
аутентификации сокет попадает в комнату с id пользователя и слушает событие
`notification`.

Тестовая ручная отправка уведомления:

```text
POST http://localhost:3001/api/notifications/send
```

## Балансы и фоновые задачи

Денежные значения хранятся как целые minor units (`amountCents`, `balance`), без
дробей.

Ручной асинхронный сброс балансов:

```text
POST http://localhost:3000/api/balances/reset
```

Endpoint требует авторизацию и возвращает `202 Accepted`:

```json
{
  "jobId": "12"
}
```

Сама работа выполняется в BullMQ worker: все ненулевые балансы сбрасываются одним
bulk SQL update, после чего инвалидируются связанные кэши. При старте приложения
также регистрируется repeatable job, который выполняет такой же сброс каждые 10
минут. Повторная регистрация при рестарте использует стабильный `jobId`, чтобы не
создавать дубли расписания.

## Миграции

Создать новую миграцию:

```bash
npm run migration:generate -- apps/user-service/src/database/migrations/MigrationName
```

Пример:

```bash
npm run migration:generate -- apps/user-service/src/database/migrations/CreateUsersTable
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
npm install
npm run build
npm run lint
npm test
```

Также проверить вручную:

- `GET http://localhost:3000/api/health`
- `http://localhost:3000/docs`
- `http://localhost:5050`
- `http://localhost:9001`
- `POST http://localhost:3000/api/balances/reset` возвращает `202 Accepted`
