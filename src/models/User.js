const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

class User {
    /**
     * Создает или обновляет пользователя при входе через Telegram
     * @param {Object} telegramData - Данные пользователя из Telegram
     * @returns {Promise<Object>} Объект пользователя
     */
    static async createOrUpdateFromTelegram(telegramData) {
        const { id: telegram_chat_id, first_name, last_name, username } = telegramData;

        try {
            // Проверяем, существует ли пользователь
            const checkQuery = 'SELECT user_id FROM telegram_users WHERE telegram_chat_id = $1';
            const existingUser = await pool.query(checkQuery, [telegram_chat_id]);

            if (existingUser.rows.length > 0) {
                // Обновляем существующего пользователя
                const updateQuery = `
                    UPDATE telegram_users 
                    SET username = $1, first_name = $2, last_name = $3
                    WHERE telegram_chat_id = $4
                    RETURNING *
                `;
                const result = await pool.query(updateQuery, [
                    username,
                    first_name,
                    last_name,
                    telegram_chat_id
                ]);
                return result.rows[0];
            } else {
                // Создаем нового пользователя
                const insertQuery = `
                    INSERT INTO telegram_users (telegram_chat_id, username, first_name, last_name)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `;
                const result = await pool.query(insertQuery, [
                    telegram_chat_id,
                    username,
                    first_name,
                    last_name
                ]);
                return result.rows[0];
            }
        } catch (error) {
            console.error('Error in createOrUpdateFromTelegram:', error);
            throw error;
        }
    }

    /**
     * Получает пользователя по его Telegram chat ID
     * @param {number} telegramChatId - ID чата пользователя в Telegram
     * @returns {Promise<Object|null>} Объект пользователя или null
     */
    static async getByTelegramChatId(telegramChatId) {
        try {
            const query = 'SELECT * FROM telegram_users WHERE telegram_chat_id = $1';
            const result = await pool.query(query, [telegramChatId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error in getByTelegramChatId:', error);
            throw error;
        }
    }

    /**
     * Получает пользователя по его ID в базе данных
     * @param {number} userId - ID пользователя в базе данных
     * @returns {Promise<Object|null>} Объект пользователя или null
     */
    static async getById(userId) {
        try {
            const query = 'SELECT * FROM telegram_users WHERE user_id = $1';
            const result = await pool.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error in getById:', error);
            throw error;
        }
    }

    /**
     * Обновляет статус активности пользователя
     * @param {number} userId - ID пользователя
     * @param {boolean} isActive - Новый статус активности
     * @returns {Promise<Object>} Обновленный объект пользователя
     */
    static async updateActiveStatus(userId, isActive) {
        try {
            const query = `
                UPDATE telegram_users
                SET is_active = $1
                WHERE user_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [isActive, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error in updateActiveStatus:', error);
            throw error;
        }
    }

    /**
     * Удаляет пользователя и все его данные
     * @param {number} userId - ID пользователя
     * @returns {Promise<boolean>} Успешность удаления
     */
    static async deleteUser(userId) {
        try {
            // Благодаря каскадному удалению в БД, все связанные данные будут удалены автоматически
            const query = 'DELETE FROM telegram_users WHERE user_id = $1';
            const result = await pool.query(query, [userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error in deleteUser:', error);
            throw error;
        }
    }

    /**
     * Генерирует JWT токен для пользователя
     * @param {Object} user - Объект пользователя
     * @returns {string} JWT токен
     */
    static generateToken(user) {
        return jwt.sign(
            { 
                user_id: user.user_id,
                telegram_chat_id: user.telegram_chat_id 
            },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );
    }

    /**
     * Проверяет валидность данных от Telegram
     * @param {Object} telegramData - Данные от Telegram
     * @returns {boolean} Результат проверки
     */
    static validateTelegramHash(telegramData) {
        const { hash, ...data } = telegramData;
        
        // Если нет хэша или данных авторизации, считаем невалидным
        if (!hash || !data.auth_date) {
            return false;
        }

        // Создаем отсортированную строку данных
        const dataCheckString = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('\n');

        // Создаем секретный ключ из токена бота
        const secretKey = crypto
            .createHash('sha256')
            .update(config.telegramBotToken)
            .digest();

        // Создаем хэш для проверки
        const hmac = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return hmac === hash;
    }
}

module.exports = User;
