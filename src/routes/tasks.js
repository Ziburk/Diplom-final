const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const authMiddleware = require('../middleware/authMiddleware');

// Применяем middleware авторизации ко всем маршрутам
router.use(authMiddleware);

// Получение всех задач
router.get('/', TaskController.getAllTasks);

// Получение данных о продуктивности
router.get('/productivity', TaskController.getProductivityData);

// Создание новой задачи
router.post('/', TaskController.createTask);

// Обновление задачи
router.put('/:taskId', TaskController.updateTask);

// Обновление статуса задачи
router.patch('/:taskId/status', TaskController.updateTaskStatus);

// Обновление порядка задач
router.patch('/order', TaskController.updateTaskOrder);

// Удаление задачи
router.delete('/:taskId', TaskController.deleteTask);

module.exports = router; 