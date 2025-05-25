// Инициализация Telegram виджета
function initTelegramAuth(botName) {
    const container = document.getElementById('telegram-login-container');

    window.TelegramLoginWidget = {
        dataOnauth: function (user) {
            onTelegramAuth(user);
        }
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://telegram.org/js/telegram-widget.js?22`;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '4');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.setAttribute('data-request-access', 'write');

    container.appendChild(script);
}

// Обработка авторизации
function onTelegramAuth(user) {
    // Сохраняем данные пользователя
    localStorage.setItem('telegramUser', JSON.stringify(user));
    updateUIForLoggedInUser(user);
}

// Обновление UI для авторизованного пользователя
function updateUIForLoggedInUser(user) {
    const loginContainer = document.getElementById('telegram-login-container');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    loginContainer.classList.add('hidden');
    userProfile.classList.remove('hidden');

    // Устанавливаем аватар пользователя
    if (user.photo_url) {
        userAvatar.src = user.photo_url;
    } else {
        // Если аватар отсутствует, используем заглушку
        userAvatar.src = 'img/profile.svg';
    }
}

// Выход из аккаунта
function logout() {
    localStorage.removeItem('telegramUser');
    const loginContainer = document.getElementById('telegram-login-container');
    const userProfile = document.getElementById('user-profile');

    loginContainer.classList.remove('hidden');
    userProfile.classList.add('hidden');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, авторизован ли пользователь
    const savedUser = localStorage.getItem('telegramUser');
    if (savedUser) {
        updateUIForLoggedInUser(JSON.parse(savedUser));
    } else {
        // Инициализируем виджет входа
        initTelegramAuth('ZiburkToDoListBot');
    }

    // Добавляем обработчик для кнопки выхода
    document.getElementById('logout-button').addEventListener('click', logout);
}); 