require('dotenv').config();

const { Pool } = require('pg');

// Конфигурация пула подключений к БД
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'todo_list',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

// Обработчик ошибок подключения
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Функция для проверки подключения к БД
async function checkConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL');
        client.release();
        return true;
    } catch (err) {
        console.error('Error connecting to PostgreSQL:', err);
        return false;
    }
}

// Функция для получения категорий пользователя
async function getUserCategories(userId) {
    try {
        const result = await pool.query(
            'SELECT * FROM categories WHERE user_id = $1 ORDER BY created_at',
            [userId]
        );
        return result.rows;
    } catch (err) {
        console.error('Ошибка при получении категорий:', err);
        throw err;
    }
}

// Функция для получения задач пользователя
async function getUserTasks(userId) {
    try {
        const result = await pool.query(
            `SELECT t.*, c.name as category_name, c.color as category_color 
             FROM tasks t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.user_id = $1 
             ORDER BY t.original_position`,
            [userId]
        );
        return result.rows;
    } catch (err) {
        console.error('Ошибка при получении задач:', err);
        throw err;
    }
}

// Функция для добавления новой категории
async function addCategory(userId, name, color) {
    try {
        const result = await pool.query(
            'INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
            [userId, name, color]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при добавлении категории:', err);
        throw err;
    }
}

// Функция для обновления категории
async function updateCategory(categoryId, name, color) {
    try {
        const result = await pool.query(
            'UPDATE categories SET name = $1, color = $2 WHERE id = $3 RETURNING *',
            [name, color, categoryId]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при обновлении категории:', err);
        throw err;
    }
}

// Функция для удаления категории с обновлением связанных задач
async function deleteCategory(categoryId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Сначала обновляем все задачи этой категории
        await client.query(
            'UPDATE tasks SET category_id = NULL WHERE category_id = $1',
            [categoryId]
        );
        
        // Затем удаляем саму категорию
        await client.query(
            'DELETE FROM categories WHERE id = $1',
            [categoryId]
        );
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка при удалении категории:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Функция для добавления новой задачи
async function addTask(userId, title, categoryId, description = null, dueDate = null, originalPosition = 0) {
    try {
        const result = await pool.query(
            `INSERT INTO tasks 
            (user_id, title, category_id, description, due_date, original_position) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
            [userId, title, categoryId, description, dueDate, originalPosition]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при добавлении задачи:', err);
        throw err;
    }
}

// Функция для обновления задачи
async function updateTask(taskId, updates) {
    try {
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        const values = Object.values(updates);
        
        const result = await pool.query(
            `UPDATE tasks SET ${setClause} WHERE id = $1 RETURNING *`,
            [taskId, ...values]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Ошибка при обновлении задачи:', err);
        throw err;
    }
}

// Функция для удаления задачи
async function deleteTask(taskId) {
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    } catch (err) {
        console.error('Ошибка при удалении задачи:', err);
        throw err;
    }
}

// Функция для обновления позиций задач
async function updateTaskPositions(tasks) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const task of tasks) {
            await client.query(
                'UPDATE tasks SET original_position = $1 WHERE id = $2',
                [task.position, task.id]
            );
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка при обновлении позиций задач:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Функция для массового добавления задач
async function bulkAddTasks(userId, tasks) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const results = [];
        for (const task of tasks) {
            const result = await client.query(
                `INSERT INTO tasks 
                (user_id, title, category_id, description, due_date, original_position) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING *`,
                [userId, task.title, task.categoryId, task.description, task.dueDate, task.position]
            );
            results.push(result.rows[0]);
        }
        
        await client.query('COMMIT');
        return results;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка при массовом добавлении задач:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    checkConnection,
    getUserCategories,
    getUserTasks,
    addCategory,
    updateCategory,
    deleteCategory,
    addTask,
    updateTask,
    deleteTask,
    updateTaskPositions,
    bulkAddTasks
}; 