require('dotenv').config();

const config = {
    // Конфигурация базы данных
    databaseUrl: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    
    // Конфигурация Telegram бота
    telegramToken: process.env.BOT_TOKEN,
    telegramBotUsername: process.env.BOT_USERNAME,
    
    // Конфигурация веб-сервера
    port: process.env.PORT || 3000,
    
    // JWT конфигурация
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    
    // Настройки для уведомлений
    notificationTypes: {
        HOUR_BEFORE: 'hour_before',
        DAY_BEFORE: 'day_before',
        WEEK_BEFORE: 'week_before'
    }
};

module.exports = config; 