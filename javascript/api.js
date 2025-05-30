const API_BASE_URL = 'http://localhost:3000/api';

const api = {
    // Функции для работы с пользователями
    async authenticateWithTelegram(telegramData) {
        const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telegramData)
        });
        return await response.json();
    },

    // Функции для работы с категориями
    async getCategories(userId) {
        const response = await fetch(`${API_BASE_URL}/categories/${userId}`);
        return await response.json();
    },

    async createCategory(userId, categoryData) {
        const response = await fetch(`${API_BASE_URL}/categories/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        return await response.json();
    },

    async updateCategory(userId, categoryId, categoryData) {
        const response = await fetch(`${API_BASE_URL}/categories/${userId}/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        return await response.json();
    },

    async deleteCategory(userId, categoryId) {
        const response = await fetch(`${API_BASE_URL}/categories/${userId}/${categoryId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    // Функции для работы с задачами
    async getTasks(userId) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}`);
        return await response.json();
    },

    async createTask(userId, taskData) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        return await response.json();
    },

    async updateTask(userId, taskId, taskData) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        return await response.json();
    },

    async completeTask(userId, taskId) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}/${taskId}/complete`, {
            method: 'POST'
        });
        return await response.json();
    },

    async uncompleteTask(userId, taskId) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}/${taskId}/uncomplete`, {
            method: 'POST'
        });
        return await response.json();
    },

    async deleteTask(userId, taskId) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}/${taskId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    async updateTaskPositions(userId, positions) {
        const response = await fetch(`${API_BASE_URL}/tasks/${userId}/positions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(positions)
        });
        return await response.json();
    }
};

module.exports = api; 