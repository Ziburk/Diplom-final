const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const routes = require('./routes');
const pool = require('./config/db');

const app = express();

// Настройка CORS
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(morgan('dev')); // Логирование запросов
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded bodies

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../javascript')));
app.use('/img', express.static(path.join(__dirname, '../img')));

// Проверка подключения к базе данных
pool.query('SELECT NOW()', (err, res) => {
    if(err) {
        console.error('Error connecting to the database', err.stack);
    } else {
        console.log('Connected to the database:', res.rows[0]);
    }
});

// Временное решение для тестирования без Telegram авторизации
app.use((req, res, next) => {
    if (req.path === '/api/auth/test-token') {
        return next();
    }
    
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
});

// Маршрут для получения тестового токена
app.post('/api/auth/test-token', (req, res) => {
    const testUser = {
        user_id: 1,
        telegram_id: '12345',
        username: 'test_user'
    };

    const token = jwt.sign(testUser, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.json({ token, user: testUser });
});

// Базовый маршрут для фронтенда
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Маршруты API
app.use('/api', routes);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Что-то пошло не так! Попробуйте позже.' 
    });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});