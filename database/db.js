const db = require('../config/database');

const dbOperations = {
    // Функции для работы с пользователями
    async createUser(telegramId, username) {
        const query = 'INSERT INTO users (telegram_id, username) VALUES ($1, $2) RETURNING *';
        const result = await db.query(query, [telegramId, username]);
        return result.rows[0];
    },

    async getUserByTelegramId(telegramId) {
        const query = 'SELECT * FROM users WHERE telegram_id = $1';
        const result = await db.query(query, [telegramId]);
        return result.rows[0];
    },

    // Функции для работы с категориями
    async getCategories(userId) {
        const query = 'SELECT * FROM categories WHERE user_id = $1 ORDER BY created_at';
        const result = await db.query(query, [userId]);
        return result.rows;
    },

    async createCategory(userId, categoryData) {
        const query = `
            INSERT INTO categories (user_id, category_id, name, color, is_default)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            userId,
            categoryData.id,
            categoryData.name,
            categoryData.color,
            categoryData.is_default || false
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async updateCategory(userId, categoryId, categoryData) {
        const query = `
            UPDATE categories
            SET name = $1, color = $2
            WHERE user_id = $3 AND category_id = $4
            RETURNING *
        `;
        const values = [categoryData.name, categoryData.color, userId, categoryId];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async deleteCategory(userId, categoryId) {
        const query = 'DELETE FROM categories WHERE user_id = $1 AND category_id = $2';
        await db.query(query, [userId, categoryId]);
    },

    // Функции для работы с задачами
    async getTasks(userId) {
        const query = `
            SELECT t.*, c.category_id as category_external_id, c.name as category_name, c.color as category_color
            FROM tasks t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.original_position
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    },

    async createTask(userId, taskData) {
        const query = `
            INSERT INTO tasks (
                user_id, title, description, category_id, due_date,
                status, original_position
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            userId,
            taskData.title,
            taskData.description,
            taskData.category_id,
            taskData.due_date,
            'active',
            taskData.original_position
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async updateTask(userId, taskId, taskData) {
        const query = `
            UPDATE tasks
            SET title = $1, description = $2, category_id = $3,
                due_date = $4, original_position = $5,
                last_modified_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND user_id = $7
            RETURNING *
        `;
        const values = [
            taskData.title,
            taskData.description,
            taskData.category_id,
            taskData.due_date,
            taskData.original_position,
            taskId,
            userId
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async completeTask(userId, taskId) {
        const query = `
            UPDATE tasks
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await db.query(query, [taskId, userId]);
        return result.rows[0];
    },

    async uncompleteTask(userId, taskId) {
        const query = `
            UPDATE tasks
            SET status = 'active', completed_at = NULL
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await db.query(query, [taskId, userId]);
        return result.rows[0];
    },

    async deleteTask(userId, taskId) {
        const query = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2';
        await db.query(query, [taskId, userId]);
    },

    async updateTaskPositions(userId, taskPositions) {
        const query = `
            UPDATE tasks
            SET original_position = $1
            WHERE id = $2 AND user_id = $3
        `;
        
        for (const [taskId, position] of Object.entries(taskPositions)) {
            await db.query(query, [position, taskId, userId]);
        }
    }
};

module.exports = dbOperations; 