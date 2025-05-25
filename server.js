require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./javascript/db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API для работы с категориями
app.get('/api/categories', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const categories = await db.getUserCategories(userId);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { userId, name, color } = req.body;
        const category = await db.addCategory(userId, name, color);
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, color } = req.body;
        const category = await db.updateCategory(req.params.id, name, color);
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await db.deleteCategory(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для работы с задачами
app.get('/api/tasks', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const tasks = await db.getUserTasks(userId);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { userId, title, categoryId, description, dueDate, originalPosition } = req.body;
        const task = await db.addTask(userId, title, categoryId, description, dueDate, originalPosition);
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/positions', async (req, res) => {
    try {
        await db.updateTaskPositions(req.body);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await db.updateTask(req.params.id, req.body);
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await db.deleteTask(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
}); 