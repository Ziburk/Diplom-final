const express = require('express');
const router = express.Router();
const TelegramController = require('../controllers/TelegramController');
const auth = require('../middleware/auth');

// Маршруты аутентификации через Telegram
router.post('/telegram/login', TelegramController.handleTelegramAuth);

// Проверка и обновление токена (требует аутентификации)
router.post('/token/refresh', auth, TelegramController.validateAndRefreshToken);

// Выход из системы (требует аутентификации)
router.post('/logout', auth, TelegramController.handleLogout);

module.exports = router; 