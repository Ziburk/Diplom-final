# Документация по маршрутам (Routes) To-Do List

## 1. Маршруты задач (taskRoutes.js)

### GET /api/tasks
- **Назначение**: Получение списка задач
- **Контроллер**: TaskController.getAllTasks
- **Параметры запроса**:
  - status: фильтр по статусу (active/completed)
  - category_id: фильтр по категории
  - date: фильтр по дате
  - sortType: тип сортировки
- **Требует авторизации**: Да
- **Пример ответа**:
```json
{
    "active": [
        {
            "task_id": 1,
            "title": "Задача 1",
            "description": "Описание",
            "category_id": "cat1",
            "due_date": "2024-03-20"
        }
    ],
    "completed": []
}
```

### POST /api/tasks
- **Назначение**: Создание новой задачи
- **Контроллер**: TaskController.createTask
- **Тело запроса**:
```json
{
    "title": "Новая задача",
    "description": "Описание задачи",
    "category_id": "cat1",
    "due_date": "2024-03-20",
    "notification_time": "2024-03-20T10:00:00"
}
```
- **Требует авторизации**: Да

### PUT /api/tasks/:taskId
- **Назначение**: Обновление существующей задачи
- **Контроллер**: TaskController.updateTask
- **Параметры пути**: taskId - ID задачи
- **Тело запроса**: Любые поля задачи для обновления
- **Требует авторизации**: Да

### DELETE /api/tasks/:taskId
- **Назначение**: Удаление задачи
- **Контроллер**: TaskController.deleteTask
- **Параметры пути**: taskId - ID задачи
- **Требует авторизации**: Да

### PATCH /api/tasks/:taskId/status
- **Назначение**: Изменение статуса задачи
- **Контроллер**: TaskController.changeTaskStatus
- **Тело запроса**:
```json
{
    "status": "completed" // или "active"
}
```
- **Требует авторизации**: Да

### PATCH /api/tasks/order
- **Назначение**: Обновление порядка задач
- **Контроллер**: TaskController.updateTaskOrder
- **Тело запроса**:
```json
{
    "orderData": [
        { "taskId": 1, "order": 1 },
        { "taskId": 2, "order": 2 }
    ]
}
```
- **Требует авторизации**: Да

## 2. Маршруты категорий (categoryRoutes.js)

### GET /api/categories
- **Назначение**: Получение всех категорий пользователя
- **Контроллер**: CategoryController.getAllCategories
- **Требует авторизации**: Да
- **Пример ответа**:
```json
[
    {
        "category_id": "cat1",
        "name": "Работа",
        "color": "#FF0000",
        "task_count": 5
    }
]
```

### POST /api/categories
- **Назначение**: Создание новой категории
- **Контроллер**: CategoryController.createCategory
- **Тело запроса**:
```json
{
    "name": "Новая категория",
    "color": "#FF0000"
}
```
- **Требует авторизации**: Да

### PUT /api/categories/:categoryId
- **Назначение**: Обновление категории
- **Контроллер**: CategoryController.updateCategory
- **Параметры пути**: categoryId - ID категории
- **Тело запроса**: Поля категории для обновления
- **Требует авторизации**: Да

### DELETE /api/categories/:categoryId
- **Назначение**: Удаление категории
- **Контроллер**: CategoryController.deleteCategory
- **Параметры пути**: categoryId - ID категории
- **Требует авторизации**: Да

## 3. Маршруты аутентификации (authRoutes.js)

### POST /api/auth/telegram/login
- **Назначение**: Авторизация через Telegram
- **Контроллер**: TelegramController.handleTelegramAuth
- **Тело запроса**: Данные от Telegram Widget
- **Требует авторизации**: Нет
- **Пример ответа**:
```json
{
    "user": {
        "user_id": 1,
        "telegram_id": "123456789",
        "username": "user123"
    },
    "token": "jwt_token_here"
}
```

### POST /api/auth/token/refresh
- **Назначение**: Обновление JWT токена
- **Контроллер**: TelegramController.validateAndRefreshToken
- **Требует авторизации**: Да
- **Пример ответа**:
```json
{
    "user": {
        "user_id": 1,
        "telegram_id": "123456789"
    },
    "token": "new_jwt_token_here"
}
```

### POST /api/auth/logout
- **Назначение**: Выход из системы
- **Контроллер**: TelegramController.handleLogout
- **Требует авторизации**: Да
- **Пример ответа**:
```json
{
    "success": true
}
```

## 4. Маршруты пользователей (userRoutes.js)

### GET /api/users/profile
- **Назначение**: Получение профиля пользователя
- **Контроллер**: UserController.getUserProfile
- **Требует авторизации**: Да
- **Пример ответа**:
```json
{
    "user_id": 1,
    "telegram_id": "123456789",
    "username": "user123",
    "settings": {
        "notifications_enabled": true,
        "timezone": "Europe/Moscow"
    }
}
```

### PUT /api/users/settings
- **Назначение**: Обновление настроек пользователя
- **Контроллер**: UserController.updateUserSettings
- **Тело запроса**:
```json
{
    "notifications_enabled": true,
    "timezone": "Europe/Moscow"
}
```
- **Требует авторизации**: Да

## Общие особенности маршрутов

1. **Middleware авторизации**:
   - Все маршруты (кроме авторизации) требуют JWT токен
   - Токен передается в заголовке: `Authorization: Bearer <token>`

2. **Обработка ошибок**:
   - 400: Неверный запрос
   - 401: Не авторизован
   - 403: Нет доступа
   - 404: Ресурс не найден
   - 500: Внутренняя ошибка сервера

3. **Формат ответа при ошибке**:
```json
{
    "error": "Описание ошибки"
}
```

4. **Безопасность**:
   - Все маршруты проверяют принадлежность данных текущему пользователю
   - Используется CORS
   - Валидация входных данных 