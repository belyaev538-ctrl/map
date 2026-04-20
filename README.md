# Карта точек из Google Таблицы (локально)

Локальный сервис, который:
- читает координаты и статусы из Google Sheets,
- рисует точки на Яндекс.Карте,
- красит точки в цвет по статусу.

## 1) Подготовка Google Таблицы

Создай лист, например `Points`, и добавь заголовки в первой строке:

`name | lat | lon | status`

Пример:

`Москва офис | 55.751244 | 37.618423 | new`

`Склад | 59.9342802 | 30.3350986 | done`

## 2) Доступ к таблице через Service Account

1. Открой Google Cloud Console.
2. Создай проект (или используй существующий).
3. Включи API: **Google Sheets API**.
4. Создай Service Account.
5. Создай JSON-ключ для Service Account.
6. Из JSON возьми:
   - `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` -> `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
7. Открой таблицу и выдай доступ этому `client_email` как Viewer.

## 3) Настройка проекта

```bash
npm install
cp .env.example .env
```

Заполни `.env`:
- `GOOGLE_SHEET_ID` — ID таблицы из URL
- `GOOGLE_SHEET_RANGE` — например `Points!A:D`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- при необходимости `YANDEX_MAPS_API_KEY`

Цвета статусов на карте задаются в `lib/map-statuses.js` (`STATUS_COLORS`), не в `.env`.

## 4) Запуск

```bash
npm start
```

Открой:

[http://localhost:3000](http://localhost:3000)

## Поддерживаемые поля

По координатам сервис понимает:
- `lat` или `latitude`
- `lon`, `lng`, `longitude`, `long`

Обязательны координаты и статус.
