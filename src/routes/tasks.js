const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const authMiddleware = require('../middleware/authMiddleware');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

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

// Обновление настроек уведомлений задачи
router.patch('/:taskId/notifications', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { notifications_enabled, notification_time } = req.body;
        const userId = req.user.id;

        // Проверяем существование задачи и права доступа
        const taskCheck = await db.query(
            'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2',
            [taskId, userId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        // Обновляем настройки уведомлений
        const result = await db.query(
            `UPDATE tasks 
             SET notifications_enabled = $1, 
                 notification_time = $2
             WHERE task_id = $3 AND user_id = $4
             RETURNING *`,
            [notifications_enabled, notification_time, taskId, userId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении настроек уведомлений:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router; 