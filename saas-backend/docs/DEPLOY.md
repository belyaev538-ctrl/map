# Деплой: Vercel + Neon

## 1. Neon

1. Создай проект на [https://neon.tech](https://neon.tech).
2. Скопируй connection string с `sslmode=require`.
3. В Vercel → Environment Variables → `DATABASE_URL`.

## 2. Переменные окружения

| Переменная       | Значение |
|------------------|----------|
| `DATABASE_URL`   | Neon |
| `NEXTAUTH_URL`   | `https://<твой-проект>.vercel.app` |
| `NEXTAUTH_SECRET`| `openssl rand -base64 32` |

## 3. Сборка

В проекте уже есть `npm run vercel-build` → `prisma migrate deploy && next build`.

В Vercel укажи **Build Command**: `npm run vercel-build` (или оставь `next build`, если миграции выполняешь отдельным шагом CI).

## 4. Локально

```bash
cp .env.example .env
npx prisma migrate dev
npm run dev
```
