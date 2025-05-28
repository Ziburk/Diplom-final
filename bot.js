const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// Добавляем поддержку сессий
const { session } = require('telegraf');

// Инициализация бота с токеном (замените на свой токен)
const bot = new Telegraf('8149852561:AAGnlLUr0ba-1C2WYnM1gKmba_0n-vqtNNM');

// Подключаем middleware для работы с сессиями
bot.use(session());

// Изменяем глобальный объект для хранения задач
let users = {
    // Структура будет такой:
    // userId: {
    //     tasks: {
    //         active: [],
    //         completed: []
    //     },
    //     categories: {...}
    // }
};

// Создадим функцию для инициализации данных нового пользователя
function initializeUserData(userId) {
    if (!users[userId]) {
        users[userId] = {
            tasks: {
                active: [],
                completed: []
            },
            categories: {
                'other': {
                    id: 'other',
                    name: 'Общее',
                    color: '#607D8B'
                },
                'work': {
                    id: 'work',
                    name: 'Работа',
                    color: '#FF5252'
                },
                'personal': {
                    id: 'personal',
                    name: 'Личное',
                    color: '#69F0AE'
                },
                'shopping': {
                    id: 'shopping',
                    name: 'Покупки',
                    color: '#448AFF'
                }
            }
        };
    }
    return users[userId];
}

// Загрузка данных при запуске бота
function loadData() {
    try {
        if (fs.existsSync('users.json')) {
            users = JSON.parse(fs.readFileSync('users.json'));
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        users = {};
    }
}

// Сохранение данных
function saveData() {
    try {
        fs.writeFileSync('users.json', JSON.stringify(users));
    } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
    }
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return 'Без срока';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Функция создания календаря
function createCalendarKeyboard(selectedDate = null) {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const keyboard = [];
    
    // Добавляем заголовок с месяцем и годом
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    keyboard.push([
        Markup.button.callback('←', `calendar:${year}:${month-1}`),
        Markup.button.callback(`${monthNames[month]} ${year}`, 'ignore'),
        Markup.button.callback('→', `calendar:${year}:${month+1}`)
    ]);
    
    // Добавляем дни недели
    keyboard.push(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day =>
        Markup.button.callback(day, 'ignore')
    ));
    
    // Получаем первый день месяца
    const firstDay = new Date(year, month, 1);
    let firstDayIndex = firstDay.getDay() || 7; // Преобразуем воскресенье (0) в 7
    firstDayIndex--; // Корректируем для начала недели с понедельника
    
    // Получаем количество дней в месяце
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let currentRow = [];
    
    // Добавляем пустые ячейки в начале
    for (let i = 0; i < firstDayIndex; i++) {
        currentRow.push(Markup.button.callback(' ', 'ignore'));
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        currentRow.push(Markup.button.callback(
            day.toString().padStart(2, ' '),
            `select_date:${year}:${month}:${day}`
        ));
        
        if (currentRow.length === 7) {
            keyboard.push(currentRow);
            currentRow = [];
        }
    }
    
    // Добавляем оставшиеся пустые ячейки
    while (currentRow.length > 0 && currentRow.length < 7) {
        currentRow.push(Markup.button.callback(' ', 'ignore'));
        if (currentRow.length === 7) {
            keyboard.push(currentRow);
        }
    }
    
    // Добавляем кнопку "Без даты"
    keyboard.push([Markup.button.callback('Без даты', 'select_date:no_date')]);
    
    return keyboard;
}

// Команда /start
bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать в ToDo List бот!\n\n' +
        'Доступные команды:\n' +
        '/add - Добавить новую задачу\n' +
        '/list - Показать список задач\n' +
        '/categories - Управление категориями\n' +
        '/stats - Показать статистику\n' +
        '/help - Показать справку',
        Markup.keyboard([
            ['📝 Добавить задачу', '📋 Список задач'],
            ['🏷 Категории', '📊 Статистика'],
            ['❓ Помощь']
        ]).resize()
    );
});

// Команда /help
bot.command('help', (ctx) => {
    ctx.reply(
        'Список доступных команд:\n\n' +
        '/add - Добавить новую задачу\n' +
        '/list - Показать список задач\n' +
        '/categories - Управление категориями\n' +
        '/stats - Показать статистику\n' +
        '/help - Показать эту справку\n\n' +
        'Для управления задачами используйте кнопки под сообщениями.'
    );
});

// Обработка кнопок главного меню
bot.hears('📝 Добавить задачу', (ctx) => startAddingTask(ctx));
bot.hears('📋 Список задач', (ctx) => showTasksList(ctx));
bot.hears('🏷 Категории', (ctx) => showCategories(ctx));
bot.hears('📊 Статистика', (ctx) => showStats(ctx));
bot.hears('❓ Помощь', (ctx) => {
    ctx.reply(
        'Список доступных команд:\n\n' +
        '/add - Добавить новую задачу\n' +
        '/list - Показать список задач\n' +
        '/categories - Управление категориями\n' +
        '/stats - Показать статистику\n' +
        '/help - Показать эту справку\n\n' +
        'Для управления задачами используйте кнопки под сообщениями.'
    );
});

// Функция добавления новой задачи
function startAddingTask(ctx) {
    const userId = ctx.from.id;
    initializeUserData(userId);
    
    ctx.reply('Введите название задачи:');
    ctx.session = { 
        state: 'waiting_task_name',
        userId: userId
    };
}

// Функция отображения списка задач
function showTasksList(ctx) {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    const activeTasksList = userData.tasks.active.map((task, index) => {
        const category = userData.categories[task.category] || userData.categories.other;
        return `${index + 1}. ${task.title}\n` +
            `📅 ${formatDate(task.dueDate)}\n` +
            `🏷 ${category.name}\n`;
    }).join('\n');

    const completedTasksList = userData.tasks.completed.map((task, index) => {
        const category = userData.categories[task.category] || userData.categories.other;
        return `${index + 1}. ✅ ${task.title}\n` +
            `📅 ${formatDate(task.dueDate)}\n` +
            `🏷 ${category.name}\n`;
    }).join('\n');

    const message =
        '📋 Активные задачи:\n\n' +
        (activeTasksList || 'Нет активных задач') +
        '\n\n✅ Выполненные задачи:\n\n' +
        (completedTasksList || 'Нет выполненных задач');

    ctx.reply(message, Markup.inlineKeyboard([
        [Markup.button.callback('Отметить выполненной', 'complete_task'),
        Markup.button.callback('Изменить дату', 'change_date')],
        [Markup.button.callback('Изменить категорию', 'change_category'),
        Markup.button.callback('Удалить', 'delete_task')]
    ]));
}

// Функция отображения категорий
function showCategories(ctx) {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    const categoriesList = Object.values(userData.categories).map(cat =>
        `🏷 ${cat.name}`
    ).join('\n');

    ctx.reply(
        '🏷 Категории:\n\n' + categoriesList,
        Markup.inlineKeyboard([
            [Markup.button.callback('Добавить категорию', 'add_category')],
            [Markup.button.callback('Показать задачи по категории', 'show_by_category')]
        ])
    );
}

// Функция отображения статистики
function showStats(ctx) {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    const totalTasks = userData.tasks.active.length + userData.tasks.completed.length;
    const activeTasksCount = userData.tasks.active.length;
    const completedTasksCount = userData.tasks.completed.length;

    const completionRate = totalTasks > 0
        ? Math.round((completedTasksCount / totalTasks) * 100)
        : 0;

    ctx.reply(
        '📊 Статистика задач:\n\n' +
        `Всего задач: ${totalTasks}\n` +
        `Активных: ${activeTasksCount}\n` +
        `Выполненных: ${completedTasksCount}\n` +
        `Процент выполнения: ${completionRate}%`
    );
}

// Объединяем все обработчики текстовых сообщений в один
bot.on('text', async (ctx) => {
    if (!ctx.session) return;

    const userId = ctx.from.id;
    const userData = initializeUserData(userId);

    switch (ctx.session.state) {
        case 'waiting_task_name':
            ctx.session.newTask = { 
                title: ctx.message.text,
                userId: userId
            };
            const categoryButtons = Object.values(userData.categories).map(cat => [
                Markup.button.callback(cat.name, `select_category:${cat.id}`)
            ]);
            await ctx.reply('Выберите категорию:', Markup.inlineKeyboard(categoryButtons));
            ctx.session.state = 'waiting_category';
            break;

        case 'waiting_date':
            // Проверяем формат даты (ДД.ММ.ГГГГ)
            const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
            const match = ctx.message.text.match(dateRegex);

            if (match) {
                const [_, day, month, year] = match;
                const date = new Date(year, month - 1, day);
                ctx.session.newTask.dueDate = date.toISOString();

                // Добавляем задачу
                userData.tasks.active.unshift({
                    ...ctx.session.newTask,
                    originalPosition: userData.tasks.active.length
                });

                saveData();
                await ctx.reply('Задача успешно добавлена! 👍');
                delete ctx.session;
            } else {
                await ctx.reply('Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ');
            }
            break;

        case 'waiting_complete_number':
            const completeIndex = parseInt(ctx.message.text) - 1;
            if (completeIndex >= 0 && completeIndex < userData.tasks.active.length) {
                const task = userData.tasks.active[completeIndex];
                task.lastStatusChange = new Date().toISOString();
                userData.tasks.completed.unshift(task);
                userData.tasks.active.splice(completeIndex, 1);
                saveData();
                await ctx.reply('Задача отмечена как выполненная! ✅');
                showTasksList(ctx); // Показываем обновленный список
            } else {
                await ctx.reply('Неверный номер задачи.');
            }
            delete ctx.session;
            break;

        case 'waiting_change_date':
            const [taskNum, newDate] = ctx.message.text.split(' ');
            const dateRegexChange = /^(\d{2})\.(\d{2})\.(\d{4})$/;
            const matchChange = newDate?.match(dateRegexChange);

            if (matchChange) {
                const [_, day, month, year] = matchChange;
                const taskIndex = parseInt(taskNum) - 1;

                if (taskIndex >= 0 && taskIndex < userData.tasks.active.length) {
                    const date = new Date(year, month - 1, day);
                    userData.tasks.active[taskIndex].dueDate = date.toISOString();
                    saveData();
                    await ctx.reply('Дата задачи успешно изменена! 📅');
                    showTasksList(ctx); // Показываем обновленный список
                } else {
                    await ctx.reply('Неверный номер задачи.');
                }
            } else {
                await ctx.reply('Неверный формат даты. Используйте ДД.ММ.ГГГГ');
            }
            delete ctx.session;
            break;

        case 'waiting_delete_number':
            const deleteIndex = parseInt(ctx.message.text) - 1;
            if (deleteIndex >= 0 && deleteIndex < userData.tasks.active.length) {
                userData.tasks.active.splice(deleteIndex, 1);
                saveData();
                await ctx.reply('Задача удалена! 🗑');
                showTasksList(ctx); // Показываем обновленный список
            } else {
                await ctx.reply('Неверный номер задачи.');
            }
            delete ctx.session;
            break;

        case 'waiting_change_category_number':
            const changeCatIndex = parseInt(ctx.message.text) - 1;
            if (changeCatIndex >= 0 && changeCatIndex < userData.tasks.active.length) {
                ctx.session.taskToChange = changeCatIndex;
                const categoryButtons = Object.values(userData.categories).map(cat => [
                    Markup.button.callback(cat.name, `change_task_category:${cat.id}`)
                ]);
                await ctx.reply('Выберите новую категорию:',
                    Markup.inlineKeyboard(categoryButtons)
                );
                ctx.session.state = 'waiting_new_category';
            } else {
                await ctx.reply('Неверный номер задачи.');
                delete ctx.session;
            }
            break;

        case 'waiting_category_name':
            const categoryName = ctx.message.text.trim();

            if (categoryName === userData.categories.other.name) {
                await ctx.reply('Это название зарезервировано. Пожалуйста, выберите другое.');
                return;
            }

            // Проверяем, нет ли уже категории с таким именем
            const exists = Object.values(userData.categories).some(cat => cat.name === categoryName);
            if (exists) {
                await ctx.reply('Категория с таким названием уже существует. Пожалуйста, выберите другое название.');
                return;
            }

            // Список стандартных цветов для новых категорий
            const colorPalette = [
                '#FF5252', '#FFD740', '#69F0AE', '#448AFF', '#B388FF',
                '#FF80AB', '#7C4DFF', '#64FFDA', '#FF8A80', '#EA80FC',
                '#8C9EFF', '#80D8FF', '#A7FFEB', '#CCFF90', '#FFFF8D'
            ];

            const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            const newId = generateCategoryId();

            // Создаем новую категорию
            userData.categories[newId] = {
                id: newId,
                name: categoryName,
                color: randomColor
            };

            saveData();
            await ctx.reply(`Категория "${categoryName}" успешно создана! 🎨`);
            delete ctx.session;

            // Показываем обновленный список категорий
            showCategories(ctx);
            break;

        case 'waiting_change_date_number':
            const taskIndex = parseInt(ctx.message.text) - 1;
            if (taskIndex >= 0 && taskIndex < userData.tasks.active.length) {
                ctx.session.taskToChange = taskIndex;
                await ctx.reply(
                    'Выберите новую дату:',
                    Markup.inlineKeyboard(createCalendarKeyboard())
                );
                ctx.session.state = 'waiting_new_date';
            } else {
                await ctx.reply('Неверный номер задачи.');
                delete ctx.session;
            }
            break;
    }
});

// Обработчики inline кнопок
bot.action(/select_category:(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    if (ctx.session?.state === 'waiting_category') {
        ctx.session.newTask.category = ctx.match[1];
        await ctx.reply(
            'Выберите дату выполнения:',
            Markup.inlineKeyboard(createCalendarKeyboard())
        );
        ctx.session.state = 'waiting_date';
    }
    
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Отметить выполненной"
bot.action('complete_task', async (ctx) => {
    await ctx.reply('Введите номер задачи для отметки как выполненной:');
    ctx.session = { state: 'waiting_complete_number' };
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Изменить дату"
bot.action('change_date', async (ctx) => {
    await ctx.reply('Введите номер задачи:');
    ctx.session = { state: 'waiting_change_date_number' };
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Изменить категорию"
bot.action('change_category', async (ctx) => {
    await ctx.reply('Введите номер задачи:');
    ctx.session = { state: 'waiting_change_category_number' };
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Удалить"
bot.action('delete_task', async (ctx) => {
    await ctx.reply('Введите номер задачи для удаления:');
    ctx.session = { state: 'waiting_delete_number' };
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Показать задачи по категории"
bot.action('show_by_category', async (ctx) => {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    const categoryButtons = Object.values(userData.categories).map(cat => [
        Markup.button.callback(`Показать ${cat.name}`, `show_category:${cat.id}`)
    ]);
    await ctx.reply('Выберите категорию для просмотра задач:',
        Markup.inlineKeyboard(categoryButtons)
    );
    await ctx.answerCbQuery();
});

// Обработчик выбора категории для просмотра
bot.action(/show_category:(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    
    const categoryId = ctx.match[1];
    const category = userData.categories[categoryId];

    const activeTasks = userData.tasks.active
        .filter(task => task.category === categoryId)
        .map((task, index) =>
            `${index + 1}. ${task.title}\n📅 ${formatDate(task.dueDate)}`
        ).join('\n');

    const completedTasks = userData.tasks.completed
        .filter(task => task.category === categoryId)
        .map((task, index) =>
            `${index + 1}. ✅ ${task.title}\n📅 ${formatDate(task.dueDate)}`
        ).join('\n');

    const message =
        `🏷 Задачи в категории "${category.name}":\n\n` +
        '📋 Активные задачи:\n' +
        (activeTasks || 'Нет активных задач') +
        '\n\n✅ Выполненные задачи:\n' +
        (completedTasks || 'Нет выполненных задач');

    await ctx.reply(message);
    await ctx.answerCbQuery();
});

// Обработчик выбора новой категории для задачи
bot.action(/change_task_category:(.+)/, async (ctx) => {
    if (ctx.session?.state === 'waiting_new_category' &&
        typeof ctx.session.taskToChange === 'number') {

        const userId = ctx.from.id;
        const userData = initializeUserData(userId);
        
        const categoryId = ctx.match[1];
        const taskIndex = ctx.session.taskToChange;

        if (taskIndex >= 0 && taskIndex < userData.tasks.active.length) {
            userData.tasks.active[taskIndex].category = categoryId;
            saveData();
            await ctx.reply('Категория задачи успешно изменена! 🏷');
        } else {
            await ctx.reply('Произошла ошибка при изменении категории.');
        }
    }

    delete ctx.session;
    await ctx.answerCbQuery();
});

// Обработчик добавления новой категории
bot.action('add_category', async (ctx) => {
    await ctx.reply('Введите название новой категории:');
    ctx.session = { state: 'waiting_category_name' };
    await ctx.answerCbQuery();
});

// Обработчик навигации по календарю
bot.action(/calendar:(\d+):(-?\d+)/, async (ctx) => {
    const [_, yearStr, monthStr] = ctx.match;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    // Проверяем валидность даты
    const date = new Date(year, month);
    if (date.getFullYear() < new Date().getFullYear() - 1 || 
        date.getFullYear() > new Date().getFullYear() + 5) {
        await ctx.answerCbQuery('Выберите дату в пределах 5 лет');
        return;
    }
    
    await ctx.editMessageReplyMarkup({
        inline_keyboard: createCalendarKeyboard(date)
    });
    await ctx.answerCbQuery();
});

// Обработчик выбора даты
bot.action(/select_date:(no_date|(\d+):(\d+):(\d+))/, async (ctx) => {
    if (ctx.session?.state !== 'waiting_date') {
        await ctx.answerCbQuery();
        return;
    }
    
    const match = ctx.match[1];
    if (match === 'no_date') {
        ctx.session.newTask.dueDate = null;
    } else {
        const [year, month, day] = match.split(':').map(Number);
        const date = new Date(year, month, day);
        ctx.session.newTask.dueDate = date.toISOString();
    }
    
    // Добавляем задачу
    const userId = ctx.from.id;
    const userData = initializeUserData(userId);
    userData.tasks.active.unshift({
        ...ctx.session.newTask,
        originalPosition: userData.tasks.active.length
    });
    
    saveData();
    await ctx.editMessageText(
        'Задача успешно добавлена! 👍\n' +
        `Название: ${ctx.session.newTask.title}\n` +
        `Категория: ${userData.categories[ctx.session.newTask.category].name}\n` +
        `Дата: ${formatDate(ctx.session.newTask.dueDate)}`
    );
    
    delete ctx.session;
    await ctx.answerCbQuery();
});

// Обработчик игнорируемых кнопок календаря
bot.action('ignore', (ctx) => ctx.answerCbQuery());

// Обработчик выбора новой даты для существующей задачи
bot.action(/select_date:(no_date|(\d+):(\d+):(\d+))/, async (ctx) => {
    if (ctx.session?.state === 'waiting_new_date' && 
        typeof ctx.session.taskToChange === 'number') {
        
        const match = ctx.match[1];
        const userId = ctx.from.id;
        const userData = initializeUserData(userId);
        const taskIndex = ctx.session.taskToChange;
        
        if (taskIndex >= 0 && taskIndex < userData.tasks.active.length) {
            if (match === 'no_date') {
                userData.tasks.active[taskIndex].dueDate = null;
            } else {
                const [year, month, day] = match.split(':').map(Number);
                const date = new Date(year, month, day);
                userData.tasks.active[taskIndex].dueDate = date.toISOString();
            }
            
            saveData();
            await ctx.editMessageText(
                'Дата задачи успешно изменена! 📅\n' +
                `Новая дата: ${formatDate(userData.tasks.active[taskIndex].dueDate)}`
            );
            showTasksList(ctx);
        }
    }
    
    delete ctx.session;
    await ctx.answerCbQuery();
});

// Функция для генерации ID категории
function generateCategoryId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 4);
    return `cat_${timestamp}_${randomPart}`;
}

// Загружаем данные при запуске
loadData();

// Запускаем бота
bot.launch().then(() => {
    console.log('Бот запущен');
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Выключение бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 