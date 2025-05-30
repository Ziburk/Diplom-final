const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database/db');
const telegramAuth = require('./auth/telegram');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Маршруты для работы с пользователями
app.post('/api/auth/telegram', async (req, res) => {
    try {
        const user = await telegramAuth.authenticateUser(req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Маршруты для работы с категориями
app.get('/api/categories/:userId', async (req, res) => {
    try {
        const categories = await db.getCategories(req.params.userId);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories/:userId', async (req, res) => {
    try {
        const category = await db.createCategory(req.params.userId, req.body);
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:userId/:categoryId', async (req, res) => {
    try {
        const category = await db.updateCategory(req.params.userId, req.params.categoryId, req.body);
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:userId/:categoryId', async (req, res) => {
    try {
        await db.deleteCategory(req.params.userId, req.params.categoryId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Маршруты для работы с задачами
app.get('/api/tasks/:userId', async (req, res) => {
    try {
        const tasks = await db.getTasks(req.params.userId);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/:userId', async (req, res) => {
    try {
        const task = await db.createTask(req.params.userId, req.body);
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tasks/:userId/:taskId', async (req, res) => {
    try {
        const task = await db.updateTask(req.params.userId, req.params.taskId, req.body);
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/:userId/:taskId/complete', async (req, res) => {
    try {
        const task = await db.completeTask(req.params.userId, req.params.taskId);
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/:userId/:taskId/uncomplete', async (req, res) => {
    try {
        const task = await db.uncompleteTask(req.params.userId, req.params.taskId);
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:userId/:taskId', async (req, res) => {
    try {
        await db.deleteTask(req.params.userId, req.params.taskId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tasks/:userId/positions', async (req, res) => {
    try {
        await db.updateTaskPositions(req.params.userId, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
}); 