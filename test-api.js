const fetch = require('node-fetch');
const crypto = require('crypto');
const config = require('./src/config/config');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Функция для генерации тестового хэша Telegram
function generateTelegramHash(data) {
    const { hash, ...checkData } = data;
    
    // Создаем отсортированную строку данных
    const dataCheckString = Object.keys(checkData)
        .sort()
        .map(key => `${key}=${checkData[key]}`)
        .join('\n');

    // Создаем секретный ключ из токена бота
    const secretKey = crypto
        .createHash('sha256')
        .update(config.telegramBotToken)
        .digest();

    // Создаем хэш
    return crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
}

// Тестовые данные для Telegram авторизации
const telegramAuthData = {
    id: 12345,
    first_name: "Test",
    last_name: "User",
    username: "testuser",
    auth_date: Math.floor(Date.now() / 1000)
};

// Добавляем хэш к данным
telegramAuthData.hash = generateTelegramHash(telegramAuthData);

async function testAPI() {
    try {
        console.log('Начинаем тестирование API...\n');

        // 1. Тестируем авторизацию
        console.log('1. Тестирование авторизации:');
        const authResponse = await fetch(`${BASE_URL}/auth/telegram/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telegramAuthData)
        });
        const authData = await authResponse.json();
        console.log('Авторизация:', authData);

        if (authData.token) {
            authToken = authData.token;
            console.log('Токен получен успешно');
        } else {
            throw new Error('Не удалось получить токен авторизации');
        }

        // 2. Тестируем создание категорий
        console.log('\n2. Тестирование создания категорий:');
        const categoryResponse = await fetch(`${BASE_URL}/categories/default`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        const categoryData = await categoryResponse.json();
        console.log('Стандартные категории созданы:', categoryData);

        // 3. Тестируем получение категорий
        console.log('\n3. Тестирование получения категорий:');
        const getCategoriesResponse = await fetch(`${BASE_URL}/categories`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const categories = await getCategoriesResponse.json();
        console.log('Список категорий:', categories);

        if (!categories || !categories.length) {
            throw new Error('Не удалось получить категории');
        }

        // 4. Тестируем создание задачи
        console.log('\n4. Тестирование создания задачи:');
        const taskData = {
            title: 'Тестовая задача',
            description: 'Описание тестовой задачи',
            category_id: categories[0].category_id,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const createTaskResponse = await fetch(`${BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });
        const newTask = await createTaskResponse.json();
        console.log('Создана задача:', newTask);

        // 5. Тестируем получение всех задач
        console.log('\n5. Тестирование получения задач:');
        const getTasksResponse = await fetch(`${BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const tasks = await getTasksResponse.json();
        console.log('Список задач:', tasks);

        console.log('\nТестирование API завершено успешно!');

    } catch (error) {
        console.error('Ошибка при тестировании API:', error);
    }
}

// Запускаем тестирование
testAPI(); 