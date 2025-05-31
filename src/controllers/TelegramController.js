const User = require('../models/User');
const Category = require('../models/Category');

class TelegramController {
    /**
     * Обрабатывает вход пользователя через Telegram
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async handleTelegramAuth(req, res) {
        try {
            const telegramData = req.body;

            // Проверяем наличие необходимых данных
            if (!telegramData || !telegramData.id) {
                return res.status(400).json({ 
                    error: 'Отсутствуют необходимые данные авторизации' 
                });
            }

            // Создаем или обновляем пользователя
            const user = await User.createOrUpdateFromTelegram(telegramData);

            // Проверяем, есть ли у пользователя стандартные категории
            const categories = await Category.getAllByUserId(user.user_id);
            if (!categories || categories.length === 0) {
                // Если категорий нет, создаем стандартные
                await Category.createDefaultCategory(user.user_id);
            }

            // Генерируем JWT токен для пользователя
            const token = User.generateToken(user);

            res.json({
                user,
                token
            });
        } catch (error) {
            console.error('Error in handleTelegramAuth:', error);
            res.status(500).json({ 
                error: 'Ошибка при авторизации через Telegram' 
            });
        }
    }

    /**
     * Проверяет валидность токена и обновляет данные пользователя
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async validateAndRefreshToken(req, res) {
        try {
            const userId = req.user.user_id;
            const user = await User.getById(userId);

            if (!user) {
                return res.status(401).json({ error: 'Пользователь не найден' });
            }

            if (!user.is_active) {
                return res.status(403).json({ error: 'Аккаунт деактивирован' });
            }

            // Генерируем новый токен
            const token = User.generateToken(user);

            res.json({
                user,
                token
            });
        } catch (error) {
            console.error('Error in validateAndRefreshToken:', error);
            res.status(500).json({ 
                error: 'Ошибка при обновлении токена' 
            });
        }
    }

    /**
     * Обрабатывает выход пользователя
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async handleLogout(req, res) {
        try {
            // В будущем здесь может быть логика для инвалидации токена
            // или обновления статуса пользователя
            res.json({ success: true });
        } catch (error) {
            console.error('Error in handleLogout:', error);
            res.status(500).json({ error: 'Ошибка при выходе из системы' });
        }
    }
}

module.exports = TelegramController;
