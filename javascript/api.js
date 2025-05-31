const API_BASE_URL = 'http://localhost:3000/api';

// Класс для работы с API
class TodoAPI {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    // Метод для установки токена
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Базовый метод для выполнения запросов
    async fetchAPI(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Если токен недействителен, пытаемся получить новый
                    if (endpoint !== '/auth/test-token') {
                        await this.login();
                        return this.fetchAPI(endpoint, options);
                    }
                }
                const error = await response.json();
                throw new Error(error.error || 'API Error');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Авторизация (временное решение без Telegram)
    async login() {
        try {
            const response = await this.fetchAPI('/auth/test-token', {
                method: 'POST'
            });
            
            if (response.token) {
                this.token = response.token;
                localStorage.setItem('auth_token', response.token);
            }
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Методы для работы с категориями
    async getCategories() {
        return this.fetchAPI('/categories');
    }

    async createDefaultCategories() {
        return this.fetchAPI('/categories/default', {
            method: 'POST'
        });
    }

    async createCategory(name, color) {
        return this.fetchAPI('/categories', {
            method: 'POST',
            body: JSON.stringify({ name, color })
        });
    }

    async updateCategory(categoryId, data) {
        return this.fetchAPI(`/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCategory(categoryId) {
        return this.fetchAPI(`/categories/${categoryId}`, {
            method: 'DELETE'
        });
    }

    // Методы для работы с задачами
    async getTasks() {
        return this.fetchAPI('/tasks');
    }

    async createTask(taskData) {
        return this.fetchAPI('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTask(taskId, taskData) {
        return this.fetchAPI(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    }

    async deleteTask(taskId) {
        return this.fetchAPI(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }

    // Отметка задачи как выполненной
    async completeTask(taskId) {
        return this.fetchAPI(`/tasks/${taskId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' })
        });
    }

    // Отметка задачи как невыполненной
    async uncompleteTask(taskId) {
        return this.fetchAPI(`/tasks/${taskId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'active' })
        });
    }

    /**
     * Обновляет порядок задач
     * @param {Array<{taskId: string, order: number}>} orderData - Массив с новым порядком задач
     * @returns {Promise<void>}
     */
    async updateTaskOrder(orderData) {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/order`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ orderData })
            });

            if (!response.ok) {
                throw new Error('Ошибка при обновлении порядка задач');
            }
        } catch (error) {
            console.error('Ошибка при обновлении порядка задач:', error);
            throw error;
        }
    }
}

// Создаем и экспортируем экземпляр API
const todoAPI = new TodoAPI();
export default todoAPI; 