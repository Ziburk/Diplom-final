# Документация по контроллерам To-Do List

Контроллеры в вашем приложении являются ключевым звеном между маршрутами (routes) и моделями. Они обрабатывают запросы, управляют бизнес-логикой и возвращают ответы клиенту.

## 1. TaskController (Контроллер задач)

### Назначение:
Управляет всеми операциями, связанными с задачами пользователя: создание, чтение, обновление, удаление (CRUD), а также специальные операции вроде изменения статуса или порядка задач.

### Основные методы:

#### getAllTasks
```javascript
static async getAllTasks(req, res)
```
- **Назначение**: Получение списка задач пользователя
- **Параметры запроса**:
  - status: фильтр по статусу (active/completed)
  - category_id: фильтр по категории
  - date: фильтр по дате
  - sortType: тип сортировки
- **Особенности**: 
  - Поддерживает фильтрацию и сортировку
  - Возвращает только задачи текущего пользователя
  - Разделяет задачи на активные и выполненные

#### createTask
```javascript
static async createTask(req, res)
```
- **Назначение**: Создание новой задачи
- **Принимает**:
  - title: название задачи
  - description: описание
  - category_id: ID категории
  - due_date: срок выполнения
- **Особенности**:
  - Автоматически привязывает задачу к текущему пользователю
  - Проверяет обязательные поля
  - Создает уведомления, если указана дата

#### updateTask
```javascript
static async updateTask(req, res)
```
- **Назначение**: Обновление существующей задачи
- **Возможности обновления**:
  - Заголовок
  - Описание
  - Категория
  - Срок выполнения
  - Настройки уведомлений
- **Особенности**:
  - Проверяет принадлежность задачи пользователю
  - Обновляет только указанные поля
  - Перенастраивает уведомления при изменении даты

#### changeTaskStatus
```javascript
static async changeTaskStatus(req, res)
```
- **Назначение**: Изменение статуса задачи (выполнена/активна)
- **Особенности**:
  - Автоматически отключает уведомления при выполнении
  - Сохраняет время выполнения
  - Обновляет статистику

## 2. CategoryController (Контроллер категорий)

### Назначение:
Управляет категориями задач, позволяя пользователям организовывать свои задачи по группам.

### Основные методы:

#### getAllCategories
```javascript
static async getAllCategories(req, res)
```
- **Назначение**: Получение всех категорий пользователя
- **Особенности**:
  - Возвращает только категории текущего пользователя
  - Включает статистику по задачам в каждой категории

#### createCategory
```javascript
static async createCategory(req, res)
```
- **Назначение**: Создание новой категории
- **Принимает**:
  - name: название категории
  - color: цвет для отображения
- **Особенности**:
  - Проверяет уникальность имени
  - Автоматически привязывает к пользователю
  - Создает стандартные категории для новых пользователей

## 3. UserController (Контроллер пользователей)

### Назначение:
Управляет профилями пользователей и их настройками.

### Основные методы:

#### getUserProfile
```javascript
static async getUserProfile(req, res)
```
- **Назначение**: Получение профиля пользователя
- **Возвращает**:
  - Основную информацию о пользователе
  - Статистику задач
  - Настройки уведомлений

#### updateUserSettings
```javascript
static async updateUserSettings(req, res)
```
- **Назначение**: Обновление настроек пользователя
- **Настройки**:
  - Предпочтения уведомлений
  - Часовой пояс
  - Настройки интерфейса

## 4. TelegramController (Контроллер Telegram)

### Назначение:
Обрабатывает взаимодействие с Telegram API, включая авторизацию и уведомления.

### Основные методы:

#### handleTelegramAuth
```javascript
static async handleTelegramAuth(req, res)
```
- **Назначение**: Обработка авторизации через Telegram
- **Процесс**:
  1. Проверка данных от Telegram
  2. Валидация хэша
  3. Создание/обновление пользователя
  4. Генерация JWT токена
- **Особенности**:
  - Проверяет актуальность данных авторизации
  - Создает стандартные категории для новых пользователей
  - Настраивает уведомления

#### validateAndRefreshToken
```javascript
static async validateAndRefreshToken(req, res)
```
- **Назначение**: Проверка и обновление токена
- **Особенности**:
  - Проверяет существование пользователя
  - Обновляет срок действия токена
  - Возвращает обновленные данные пользователя

## Взаимодействие контроллеров

1. **Создание задачи**:
```
TaskController.createTask
  ↓
CategoryController (проверка категории)
  ↓
NotificationService (настройка уведомлений)
```

2. **Авторизация пользователя**:
```
TelegramController.handleTelegramAuth
  ↓
UserController (создание профиля)
  ↓
CategoryController (создание стандартных категорий)
```

## Особенности реализации

1. **Обработка ошибок**:
   - Каждый метод обёрнут в try-catch
   - Стандартизированные ответы об ошибках
   - Логирование ошибок

2. **Безопасность**:
   - Проверка принадлежности данных пользователю
   - Валидация входных данных
   - Защита от SQL-инъекций

3. **Оптимизация**:
   - Минимизация запросов к БД
   - Переиспользование соединений
   - Кэширование частых запросов 