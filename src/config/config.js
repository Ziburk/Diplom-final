require('dotenv').config();

module.exports = {
    // Секретный ключ для JWT
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    
    // Время жизни токена (по умолчанию 24 часа)
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    
    // Настройки для Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    
    // Настройки для уведомлений
    notificationTypes: {
        HOUR_BEFORE: 'hour_before',
        DAY_BEFORE: 'day_before',
        WEEK_BEFORE: 'week_before'
    }
}; 