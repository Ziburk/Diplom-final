const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

/**
 * Middleware для проверки JWT токена
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
    try {
        // Получаем токен из заголовка
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Требуется аутентификация' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Проверяем токен
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Проверяем существование пользователя
        const user = await User.getById(decoded.userId);
        
        if (!user) {
            throw new Error();
        }

        // Проверяем активность пользователя
        if (!user.is_active) {
            return res.status(403).json({ error: 'Аккаунт деактивирован' });
        }

        // Добавляем информацию о пользователе в объект запроса
        req.token = token;
        req.user = user;
        
        next();
    } catch (error) {
        res.status(401).json({ error: 'Пожалуйста, авторизуйтесь' });
    }
};

module.exports = auth; 