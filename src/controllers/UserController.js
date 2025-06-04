const User = require('../models/User');

class UserController {
    /**
     * Получает информацию о текущем пользователе
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getCurrentUser(req, res) {
        try {
            const userId = req.user.user_id;
            const user = await User.getById(userId);

            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Не отправляем чувствительные данные
            delete user.telegram_chat_id;
            res.json(user);
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
        }
    }

    /**
     * Обновляет статус активности пользователя
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async updateActiveStatus(req, res) {
        try {
            const userId = req.user.user_id;
            const { is_active } = req.body;

            if (typeof is_active !== 'boolean') {
                return res.status(400).json({ 
                    error: 'Статус активности должен быть булевым значением' 
                });
            }

            const user = await User.update(userId, { is_active });

            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error in updateActiveStatus:', error);
            res.status(500).json({ 
                error: 'Ошибка при обновлении статуса активности' 
            });
        }
    }

    /**
     * Удаляет пользователя и все его данные
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async deleteAccount(req, res) {
        try {
            const userId = req.user.user_id;
            const success = await User.delete(userId);

            if (!success) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteAccount:', error);
            res.status(500).json({ error: 'Ошибка при удалении аккаунта' });
        }
    }
}

module.exports = UserController;
