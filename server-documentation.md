# Документация серверной части To-Do List

## Общая структура сервера

Серверная часть приложения построена на Node.js с использованием Express.js и организована по архитектурному паттерну MVC (Model-View-Controller). База данных - PostgreSQL.

### Структура проекта:
```
src/
├── config/         # Конфигурационные файлы
├── controllers/    # Контроллеры для обработки бизнес-логики
├── models/         # Модели для работы с базой данных
├── routes/         # Маршруты API
├── middleware/     # Промежуточные обработчики
└── services/       # Дополнительные сервисы
```

## Компоненты системы

### 1. Конфигурация (config/)

#### 1.1 config.js
- Основной конфигурационный файл
- Содержит настройки порта, JWT-токенов
- Использует переменные окружения из .env

#### 1.2 db.js
- Конфигурация подключения к PostgreSQL
- Использует пул соединений для оптимизации производительности
- Параметры подключения берутся из переменных окружения

### 2. Модели (models/)

#### 2.1 User.js (179 строк)
- Управление пользователями
- Методы:
  - createOrUpdateFromTelegram: Создание/обновление пользователя через Telegram
  - validateTelegramHash: Проверка хэша данных Telegram
  - generateToken: Генерация JWT-токена
  - getById: Получение пользователя по ID

#### 2.2 Task.js (398 строк)
- Управление задачами
- Основные методы:
  - getAllByUserId: Получение всех задач пользователя
  - create: Создание новой задачи
  - update: Обновление задачи
  - delete: Удаление задачи
  - changeStatus: Изменение статуса задачи
  - updateOrder: Обновление порядка задач

#### 2.3 Category.js (242 строки)
- Управление категориями задач
- Методы:
  - getAllByUserId: Получение категорий пользователя
  - create: Создание категории
  - update: Обновление категории
  - delete: Удаление категории
  - createDefaultCategory: Создание стандартных категорий

### 3. Контроллеры (controllers/)

#### 3.1 TaskController.js (282 строки)
- Обработка операций с задачами
- Основные методы:
  - getAllTasks: Получение списка задач с фильтрацией
  - createTask: Создание новой задачи
  - updateTask: Обновление задачи
  - deleteTask: Удаление задачи
  - changeTaskStatus: Изменение статуса задачи
  - getTaskStatistics: Получение статистики
  - updateTaskOrder: Обновление порядка задач

#### 3.2 UserController.js (92 строки)
- Управление пользователями
- Методы:
  - getUserProfile: Получение профиля
  - updateUserSettings: Обновление настроек

#### 3.3 CategoryController.js (153 строки)
- Управление категориями
- Методы:
  - getAllCategories: Получение всех категорий
  - createCategory: Создание категории
  - updateCategory: Обновление категории
  - deleteCategory: Удаление категории

#### 3.4 TelegramController.js (109 строк)
- Обработка взаимодействия с Telegram
- Методы:
  - handleTelegramAuth: Обработка авторизации через Telegram
  - validateAndRefreshToken: Проверка и обновление токена
  - handleLogout: Обработка выхода из системы

### 4. Маршруты (routes/)

#### 4.1 taskRoutes.js (40 строк)
```javascript
POST /api/tasks          // Создание задачи
GET /api/tasks           // Получение списка задач
PUT /api/tasks/:id       // Обновление задачи
DELETE /api/tasks/:id    // Удаление задачи
```

#### 4.2 authRoutes.js (29 строк)
```javascript
POST /api/auth/telegram  // Авторизация через Telegram
POST /api/auth/verify    // Проверка токена
POST /api/auth/logout    // Выход из системы
```

#### 4.3 categoryRoutes.js (25 строк)
```javascript
GET /api/categories      // Получение категорий
POST /api/categories     // Создание категории
PUT /api/categories/:id  // Обновление категории
DELETE /api/categories/:id // Удаление категории
```

### 5. Middleware (middleware/)

#### 5.1 auth.js (42 строки)
- Проверка аутентификации
- Валидация JWT-токена
- Добавление информации о пользователе в req.user

### 6. Сервисы (services/)

#### 6.1 NotificationService.js (106 строк)
- Управление уведомлениями
- Методы:
  - scheduleNotification: Планирование уведомления
  - cancelNotification: Отмена уведомления
  - sendTelegramNotification: Отправка уведомления в Telegram

## Взаимодействие компонентов

1. **Запрос клиента** → **Маршрут** → **Middleware** → **Контроллер** → **Модель** → **База данных**

Пример для создания задачи:
```
POST /api/tasks →
  taskRoutes.js →
    auth.js (проверка токена) →
      TaskController.createTask →
        Task.create →
          PostgreSQL
```

2. **Уведомления**:
```
Планировщик →
  NotificationService →
    Telegram API →
      Пользователь
```

## Используемые технологии

1. **Основные**:
   - Node.js - среда выполнения
   - Express.js - веб-фреймворк
   - PostgreSQL - база данных
   - node-postgres (pg) - драйвер PostgreSQL

2. **Безопасность**:
   - jsonwebtoken - работа с JWT
   - bcrypt - хеширование паролей
   - helmet - защита HTTP-заголовков

3. **Дополнительные**:
   - node-telegram-bot-api - работа с Telegram Bot API
   - node-schedule - планировщик задач
   - dotenv - управление переменными окружения

## Оптимизация производительности

1. **База данных**:
   - Использование пула соединений
   - Индексы для часто используемых полей
   - Подготовленные запросы

2. **Кэширование**:
   - Кэширование результатов запросов
   - Оптимизация запросов к БД

3. **Безопасность**:
   - Валидация входных данных
   - Защита от SQL-инъекций
   - CORS настройки
   - Rate limiting 