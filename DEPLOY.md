# Публикация на GitHub Pages + общий топ (Supabase)

GitHub Pages отдаёт только сайт. База — бесплатный Supabase (без InfinityFree).

## 1. Supabase (5 мин)

1. https://supabase.com → Sign up → New project
2. **SQL Editor** → New query → вставь файл `supabase/schema.sql` → **Run**
3. Ещё один запрос → вставь `supabase/online_rooms.sql` → **Run**
4. **Database → Replication** → включи таблицу `online_rooms` для Realtime
5. **Project Settings → API** — скопируй:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public → `VITE_SUPABASE_ANON_KEY`

## 2. Локально (проверка)

Создай `.env` (из `.env.example`):

```
VITE_SUPABASE_URL=https://твой-проект.supabase.co
VITE_SUPABASE_ANON_KEY=твой_anon_key
VITE_BASE_PATH=/
```

```bash
npm install
npm run dev
```

В меню должно быть: **«Онлайн: общий топ и аккаунты»**.

## 3. GitHub

1. Создай репозиторий, залей код
2. **Settings → Secrets and variables → Actions** → New repository secret:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. Push в ветку `main` — деплой сам

Сайт: `https://ТВОЙ_ЛОГИН.github.io/ИМЯ_РЕПО/`

## 4. Если репозиторий `username.github.io`

В workflow замени `VITE_BASE_PATH` на `/` или добавь secret `VITE_BASE_PATH` = `/`.

## Без Supabase

Игра работает, но данные только в браузере. Для общего топа Supabase обязателен.
