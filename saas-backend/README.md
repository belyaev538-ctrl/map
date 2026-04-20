# Карта клиентов (SaaS)

Next.js 14 (App Router), Prisma, PostgreSQL (Neon), NextAuth (credentials + JWT), Tailwind.

## Быстрый старт

1. Скопируй `.env.example` → `.env`, задай `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
2. Миграции: `npx prisma migrate deploy` (или `npx prisma db push` для прототипа).
3. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Маршруты

| Маршрут | Описание |
|--------|----------|
| `/register` | Регистрация |
| `/login` | Вход |
| `/dashboard` | Проекты |
| `/dashboard/projects/[id]` | Карта точек проекта |

## API (только с сессией, кроме `POST /api/register` и `POST/GET` NextAuth)

- `POST /api/register` — `{ email, password }`
- `GET/POST /api/projects` — список / создать проект `{ name }`
- `GET /api/projects/:id/locations` — точки проекта
- `POST /api/locations` — `{ projectId, name, address?, lat, lng, status }`
- `PATCH /api/locations/:id` — частичное обновление, в т.ч. `{ status }`

## Карта

Страница проекта использует Leaflet + OSM. Цвет маркера — из `../lib/map-statuses.js` (`colorForStatusName` по имени статуса).
