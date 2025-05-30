const db = require('../database/db');

const telegramAuth = {
    async authenticateUser(telegramData) {
        try {
            // Проверяем, существует ли пользователь
            let user = await db.getUserByTelegramId(telegramData.id);
            
            // Если пользователя нет, создаем нового
            if (!user) {
                user = await db.createUser(telegramData.id, telegramData.username);
                
                // Создаем стандартные категории для нового пользователя
                await this.createDefaultCategories(user.id);
            }
            
            return user;
        } catch (error) {
            console.error('Ошибка при аутентификации:', error);
            throw error;
        }
    },

    async createDefaultCategories(userId) {
        const defaultCategories = [
            {
                id: 'other',
                name: 'Общее',
                color: '#607D8B',
                is_default: true
            },
            {
                id: 'work',
                name: 'Работа',
                color: '#FF5252'
            },
            {
                id: 'personal',
                name: 'Личное',
                color: '#69F0AE'
            },
            {
                id: 'shopping',
                name: 'Покупки',
                color: '#448AFF'
            }
        ];

        for (const category of defaultCategories) {
            await db.createCategory(userId, category);
        }
    }
};

module.exports = telegramAuth; 