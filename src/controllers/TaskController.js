const Task = require('../models/Task');

class TaskController {
    /**
     * Получает список всех задач пользователя с фильтрацией
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getAllTasks(req, res) {
        try {
            const userId = req.user.user_id; // Получаем ID пользователя из объекта req.user
            const { status, category_id, date, sortType } = req.query;

            const tasks = await Task.getAllByUserId(userId, {
                status,
                category_id,
                date,
                sortType
            });

            res.json(tasks);
        } catch (error) {
            console.error('Error in getAllTasks:', error);
            res.status(500).json({ error: 'Ошибка при получении списка задач' });
        }
    }

    /**
     * Создает новую задачу
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async createTask(req, res) {
        try {
            const userId = req.user.user_id;
            const { title, description, category_id, due_date } = req.body;

            if (!title) {
                return res.status(400).json({ error: 'Название задачи обязательно' });
            }

            const task = await Task.create(userId, {
                title,
                description,
                category_id,
                due_date
            });

            res.status(201).json(task);
        } catch (error) {
            console.error('Error in createTask:', error);
            res.status(500).json({ error: 'Ошибка при создании задачи' });
        }
    }

    /**
     * Обновляет существующую задачу
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async updateTask(req, res) {
        try {
            const userId = req.user.user_id;
            const taskId = parseInt(req.params.taskId);
            const updateData = req.body;

            const task = await Task.update(taskId, userId, updateData);

            if (!task) {
                return res.status(404).json({ error: 'Задача не найдена' });
            }

            res.json(task);
        } catch (error) {
            console.error('Error in updateTask:', error);
            res.status(500).json({ error: 'Ошибка при обновлении задачи' });
        }
    }

    /**
     * Изменяет статус задачи
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async changeTaskStatus(req, res) {
        try {
            const userId = req.user.user_id;
            const taskId = parseInt(req.params.taskId);
            const { status } = req.body;

            if (!status || !['active', 'completed'].includes(status)) {
                return res.status(400).json({ error: 'Некорректный статус' });
            }

            const task = await Task.changeStatus(taskId, userId, status);

            if (!task) {
                return res.status(404).json({ error: 'Задача не найдена' });
            }

            res.json(task);
        } catch (error) {
            console.error('Error in changeTaskStatus:', error);
            res.status(500).json({ error: 'Ошибка при изменении статуса задачи' });
        }
    }

    /**
     * Обновляет порядок задач
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async updateTaskOrder(req, res) {
        try {
            const userId = req.user.user_id;
            const { orderData } = req.body;

            if (!Array.isArray(orderData)) {
                return res.status(400).json({ error: 'Некорректные данные для обновления порядка' });
            }

            await Task.updateOrder(userId, orderData);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in updateTaskOrder:', error);
            res.status(500).json({ error: 'Ошибка при обновлении порядка задач' });
        }
    }

    /**
     * Удаляет задачу
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async deleteTask(req, res) {
        try {
            const userId = req.user.user_id;
            const taskId = parseInt(req.params.taskId);

            const success = await Task.delete(taskId, userId);

            if (!success) {
                return res.status(404).json({ error: 'Задача не найдена' });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteTask:', error);
            res.status(500).json({ error: 'Ошибка при удалении задачи' });
        }
    }

    /**
     * Получает статистику по задачам
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getTaskStatistics(req, res) {
        try {
            const userId = req.user.user_id;
            const statistics = await Task.getStatistics(userId);
            res.json(statistics);
        } catch (error) {
            console.error('Error in getTaskStatistics:', error);
            res.status(500).json({ error: 'Ошибка при получении статистики' });
        }
    }

    /**
     * Получает данные для графика продуктивности
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getProductivityData(req, res) {
        try {
            const userId = req.user.user_id;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Необходимо указать период' });
            }

            const data = await Task.getProductivityData(userId, { startDate, endDate });
            res.json(data);
        } catch (error) {
            console.error('Error in getProductivityData:', error);
            res.status(500).json({ error: 'Ошибка при получении данных продуктивности' });
        }
    }
}

module.exports = TaskController;
