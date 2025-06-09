# Архитектура приложения To-Do List

## 1. Routes (Маршруты)

Маршруты определяют, какие URL доступны в вашем приложении и какие действия должны выполняться при обращении к ним.

### Пример из taskRoutes.js:
```javascript
router.get('/tasks', authMiddleware, TaskController.getAllTasks);
router.post('/tasks', authMiddleware, TaskController.createTask);
```

### Основные функции маршрутов:
1. **Определение конечных точек API**
   - Указывают доступные HTTP методы (GET, POST, PUT, DELETE)
   - Определяют пути URL
   - Связывают URL с конкретными контроллерами

2. **Группировка связанных маршрутов**
   - `/api/tasks/*` - операции с задачами
   - `/api/categories/*` - операции с категориями
   - `/api/auth/*` - аутентификация

3. **Предварительная обработка**
   - Подключение middleware
   - Валидация параметров запроса
   - Проверка прав доступа

## 2. Middleware (Промежуточные обработчики)

Middleware выполняется между получением запроса и его обработкой контроллером.

### Пример из auth.js:
```javascript
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    req.user = verifyToken(token);
    next();
};
```

### Основные функции middleware:
1. **Аутентификация и авторизация**
   - Проверка JWT токенов
   - Валидация пользователя
   - Добавление информации о пользователе в req.user

2. **Обработка запросов**
   - Парсинг тела запроса
   - Обработка файлов
   - Логирование

3. **Безопасность**
   - CORS
   - Rate limiting
   - Защита от атак

## 3. Controllers (Контроллеры)

Контроллеры содержат бизнес-логику приложения и обрабатывают запросы.

### Пример из TaskController.js:
```javascript
static async createTask(req, res) {
    try {
        const userId = req.user.user_id;
        const taskData = req.body;
        
        // Валидация данных
        if (!taskData.title) {
            return res.status(400).json({ error: 'Название обязательно' });
        }

        // Создание задачи через модель
        const task = await Task.create(userId, taskData);
        
        // Настройка уведомлений
        if (taskData.due_date) {
            await NotificationService.scheduleNotification(task);
        }

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при создании задачи' });
    }
}
```

### Основные функции контроллеров:
1. **Обработка бизнес-логики**
   - Валидация входных данных
   - Координация работы моделей
   - Обработка ошибок

2. **Управление данными**
   - Получение данных из запроса
   - Форматирование ответа
   - Взаимодействие с несколькими моделями

3. **Интеграция сервисов**
   - Работа с уведомлениями
   - Интеграция с Telegram
   - Управление статистикой

## 4. Models (Модели)

Модели отвечают за работу с данными и бизнес-логику, связанную с конкретной сущностью.

### Пример из Task.js:
```javascript
static async create(userId, taskData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Создание задачи
        const result = await client.query(
            `INSERT INTO tasks (user_id, title, description, category_id, due_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, taskData.title, taskData.description, taskData.category_id, taskData.due_date]
        );

        // Обновление порядка задач
        await client.query(
            `UPDATE tasks 
             SET "order" = "order" + 1 
             WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### Основные функции моделей:
1. **Работа с базой данных**
   - SQL запросы
   - Транзакции
   - Управление соединениями

2. **Бизнес-логика данных**
   - Валидация данных
   - Преобразование данных
   - Вычисления

3. **Связи между сущностями**
   - Отношения между таблицами
   - Каскадные операции
   - Поддержка целостности данных

## Взаимодействие компонентов

### Пример полного цикла создания задачи:

1. **Route** получает запрос:
```javascript
router.post('/tasks', authMiddleware, TaskController.createTask);
```

2. **Middleware** проверяет авторизацию:
```javascript
// Проверка токена и добавление информации о пользователе
req.user = verifyToken(token);
```

3. **Controller** обрабатывает запрос:
```javascript
// Валидация и подготовка данных
const task = await Task.create(userId, taskData);
```

4. **Model** работает с базой данных:
```javascript
// Выполнение SQL запросов и транзакций
const result = await client.query('INSERT INTO tasks ...');
```

### Преимущества такой архитектуры:

1. **Разделение ответственности**
   - Каждый компонент отвечает за свою часть
   - Легко поддерживать и тестировать
   - Можно изменять компоненты независимо

2. **Безопасность**
   - Централизованная проверка прав
   - Валидация на разных уровнях
   - Защита от типовых атак

3. **Масштабируемость**
   - Легко добавлять новые маршруты
   - Переиспользование middleware
   - Модульная структура 