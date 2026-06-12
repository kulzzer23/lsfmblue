# LSFM PRO Exam

Полноценный MVP экзаменатора для ЛСФМ: раздел обучения, раздел практики, публичный экзамен и экран администратора.

## Что внутри

- Раздел обучения с правилами, уставом и базой по ПРО.
- Раздел практики с тестами и мгновенной проверкой без сохранения данных.
- Публичная форма экзамена с подсчетом баллов и сохранением попыток в Supabase.
- Админ-экран с логином, списком попыток, поиском, фильтром по статусу и экспортом в CSV/JSON.
- Единый файл контента для вопросов и обучения: [src/content.js](src/content.js).
- Яркий адаптивный интерфейс, готовый для доработки под реальный банк вопросов.

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

## Админ-доступ

По умолчанию код администратора для демо-режима: `pro-2026`.

Можно переопределить его через переменную окружения `VITE_ADMIN_CODE`.

## Хостинг

Этот MVP можно выложить как статический сайт на GitHub Pages, Netlify или Vercel.
Текущая версия уже пишет экзамены в Supabase напрямую через REST API.

## GitHub Pages

В репозитории уже добавлен workflow для GitHub Pages: [.github/workflows/pages.yml](.github/workflows/pages.yml).

Что нужно от тебя для публикации:

1. Залить этот проект в GitHub-репозиторий.
2. Включить Pages в настройках репозитория, если GitHub попросит выбрать источник.
3. При необходимости заменить `supabaseUrl` и `supabaseAnonKey` в [src/config.js](src/config.js) на свои значения.

Если хочешь, я могу следующим сообщением еще подготовить вариант под обычный GitHub Pages без Actions, чтобы ты просто открыл `index.html` из ветки `main`.

## База данных

Что нужно сделать в Supabase:

1. Создать новый проект.
2. Создать таблицу `submissions` с колонками:

```sql
create table if not exists public.submissions (
	id text primary key,
	name text not null,
	squad text not null,
	contact text,
	submitted_at timestamptz not null,
	score integer not null,
	max_score integer not null,
	answers jsonb not null,
	breakdown jsonb not null,
	review_status text not null default 'unchecked',
	reviewed_at timestamptz,
	reviewed_by text
);
```

3. Разрешить `select`, `insert` и `update` для anon-ключа через RLS policy или временно отключить RLS на этапе теста.
4. Подставить URL и anon key в [src/config.js](src/config.js).

Если хочешь, я могу ещё добавить отдельную кнопку для ручной синхронизации или выгрузки из Supabase в CSV.
