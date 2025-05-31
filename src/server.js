const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors()); // Разрешаем CORS
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