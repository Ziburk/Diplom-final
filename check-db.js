require('dotenv').config();
const db = require('./javascript/db');

async function checkDatabase() {
    try {
        const isConnected = await db.checkConnection();
        if (isConnected) {
            console.log('Подключение к базе данных успешно');
            
            // Проверяем наличие тестовых данных
            const categories = await db.getUserCategories(1);
            console.log('Категории пользователя 1:', categories);
            
            const tasks = await db.getUserTasks(1);
            console.log('Задачи пользователя 1:', tasks);
        } else {
            console.error('Не удалось подключиться к базе данных');
        }
    } catch (err) {
        console.error('Ошибка при проверке базы данных:', err);
    } finally {
        process.exit();
    }
}

checkDatabase(); 