# Lumière — Косметический интернет-магазин

## Структура репозитория

```
m4/
├── netlify.toml                    ← конфиг Netlify
├── netlify/
│   └── functions/
│       └── ozon-proxy.js           ← прокси для Ozon API
└── lumiere-cosmetics/              ← сайт (publish directory)
    ├── index.html
    ├── css/
    ├── js/
    │   ├── firebase-config.js      ← ключи Firebase
    │   ├── db.js                   ← база данных
    │   ├── admin.js                ← логика админки
    │   ├── ozon-import.js          ← импорт из Ozon
    │   ├── cart.js
    │   └── ...
    └── pages/
        ├── admin.html
        ├── catalog.html
        └── cart.html
```

## Ссылки

- Сайт: https://extraordinary-pixie-54ce55.netlify.app
- Админка: https://extraordinary-pixie-54ce55.netlify.app/pages/admin.html
