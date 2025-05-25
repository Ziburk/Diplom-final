// Функции для работы с API сервера

// Функция для получения категорий пользователя
async function getUserCategories(userId) {
    try {
        const response = await fetch(`/api/categories?userId=${userId}`);
        if (!response.ok) throw new Error('Ошибка при получении категорий');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при получении категорий:', err);
        throw err;
    }
}

// Функция для получения задач пользователя
async function getUserTasks(userId) {
    try {
        const response = await fetch(`/api/tasks?userId=${userId}`);
        if (!response.ok) throw new Error('Ошибка при получении задач');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при получении задач:', err);
        throw err;
    }
}

// Функция для добавления новой категории
async function addCategory(userId, name, color) {
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, name, color })
        });
        if (!response.ok) throw new Error('Ошибка при добавлении категории');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при добавлении категории:', err);
        throw err;
    }
}

// Функция для обновления категории
async function updateCategory(categoryId, name, color) {
    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, color })
        });
        if (!response.ok) throw new Error('Ошибка при обновлении категории');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при обновлении категории:', err);
        throw err;
    }
}

// Функция для удаления категории
async function deleteCategory(categoryId) {
    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка при удалении категории');
    } catch (err) {
        console.error('Ошибка при удалении категории:', err);
        throw err;
    }
}

// Функция для добавления новой задачи
async function addTask(userId, title, categoryId, description = null, dueDate = null, originalPosition = 0) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                title,
                categoryId,
                description,
                dueDate,
                originalPosition
            })
        });
        if (!response.ok) throw new Error('Ошибка при добавлении задачи');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при добавлении задачи:', err);
        throw err;
    }
}

// Функция для обновления задачи
async function updateTask(taskId, updates) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Ошибка при обновлении задачи');
        return await response.json();
    } catch (err) {
        console.error('Ошибка при обновлении задачи:', err);
        throw err;
    }
}

// Функция для удаления задачи
async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка при удалении задачи');
    } catch (err) {
        console.error('Ошибка при удалении задачи:', err);
        throw err;
    }
}

// Функция для обновления позиций задач
async function updateTaskPositions(tasks) {
    try {
        const response = await fetch('/api/tasks/positions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tasks)
        });
        if (!response.ok) throw new Error('Ошибка при обновлении позиций задач');
    } catch (err) {
        console.error('Ошибка при обновлении позиций задач:', err);
        throw err;
    }
}

module.exports = {
    getUserCategories,
    getUserTasks,
    addCategory,
    updateCategory,
    deleteCategory,
    addTask,
    updateTask,
    deleteTask,
    updateTaskPositions
}; 