const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const auth = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(auth);

// Получить все задачи пользователя
router.get('/', TaskController.getAllTasks);

// Создать новую задачу
router.post('/', TaskController.createTask);

// Получить задачу по ID
router.get('/:taskId', TaskController.getTaskById);

// Обновить задачу
router.put('/:taskId', TaskController.updateTask);

// Удалить задачу
router.delete('/:taskId', TaskController.deleteTask);

// Изменить статус задачи
router.patch('/:taskId/status', TaskController.changeTaskStatus);

// Получить статистику по задачам
router.get('/stats/summary', TaskController.getTaskStats);

// Получить статистику продуктивности
router.get('/stats/productivity', TaskController.getProductivityStats);

module.exports = router;
