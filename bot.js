const { Telegraf, Markup } = require('telegraf');
const config = require('./src/config/config');
const db = require('./src/bot/db');

// Добавляем поддержку сессий
const { session } = require('telegraf');

// Инициализация бота с токеном
const bot = new Telegraf(config.telegramToken);

// Подключаем middleware для работы с сессиями
bot.use(session());

// Глобальный объект для хранения задач
let users = {};

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
        Markup.button.callback('←', `calendar:${year}:${month - 1}`),
        Markup.button.callback(`${monthNames[month]} ${year}`, 'ignore'),
        Markup.button.callback('→', `calendar:${year}:${month + 1}`)
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
bot.command('start', async (ctx) => {
    try {
        // Получаем или создаем пользователя
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        // Создаем стандартные категории для нового пользователя
        await db.createDefaultCategories(user.user_id);

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
    } catch (error) {
        console.error('Ошибка при выполнении команды /start:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
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
async function startAddingTask(ctx) {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const categories = await db.getUserCategories(user.user_id);
        
        ctx.reply('Введите название задачи:');
        ctx.session = {
            state: 'waiting_task_name',
            userId: user.user_id
        };
    } catch (error) {
        console.error('Ошибка при начале добавления задачи:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
}

// Функция отображения списка задач
async function showTasksList(ctx) {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const tasks = await db.getUserTasks(user.user_id);

        const activeTasksList = tasks.active.map((task, index) => {
            return `${index + 1}. ${task.title}\n` +
                `📅 ${formatDate(task.due_date)}\n` +
                `🏷 ${task.category_name || 'Без категории'}\n`;
        }).join('\n');

        const completedTasksList = tasks.completed.map((task, index) => {
            return `${index + 1}. ✅ ${task.title}\n` +
                `📅 ${formatDate(task.due_date)}\n` +
                `🏷 ${task.category_name || 'Без категории'}\n`;
        }).join('\n');

        const message =
            '📋 Активные задачи:\n\n' +
            (activeTasksList || 'Нет активных задач') +
            '\n\n✅ Выполненные задачи:\n\n' +
            (completedTasksList || 'Нет выполненных задач');

        ctx.reply(message, Markup.inlineKeyboard([
            [Markup.button.callback('Изменить статус', 'change_status')],
            [Markup.button.callback('Изменить дату', 'change_date'),
            Markup.button.callback('Изменить категорию', 'change_category')],
            [Markup.button.callback('Удалить', 'delete_task')]
        ]));
    } catch (error) {
        console.error('Ошибка при отображении списка задач:', error);
        ctx.reply('Произошла ошибка при загрузке задач. Пожалуйста, попробуйте позже.');
    }
}

// Функция отображения категорий
async function showCategories(ctx) {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const categories = await db.getUserCategories(user.user_id);
        const categoriesList = categories.map(cat =>
            `🏷 ${cat.name}`
        ).join('\n');

        ctx.reply(
            '🏷 Категории:\n\n' + categoriesList,
            Markup.inlineKeyboard([
                [Markup.button.callback('Добавить категорию', 'add_category')],
                [Markup.button.callback('Показать задачи по категории', 'show_by_category')]
            ])
        );
    } catch (error) {
        console.error('Ошибка при отображении категорий:', error);
        ctx.reply('Произошла ошибка при загрузке категорий. Пожалуйста, попробуйте позже.');
    }
}

// Функция отображения статистики
async function showStats(ctx) {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const tasks = await db.getUserTasks(user.user_id);
        const totalTasks = tasks.active.length + tasks.completed.length;
        const activeTasksCount = tasks.active.length;
        const completedTasksCount = tasks.completed.length;

        const completionRate = totalTasks > 0
            ? Math.round((completedTasksCount / totalTasks) * 100)
            : 0;

        const message = 
            '📊 Статистика:\n\n' +
            `Всего задач: ${totalTasks}\n` +
            `Активных: ${activeTasksCount}\n` +
            `Выполненных: ${completedTasksCount}\n` +
            `Процент выполнения: ${completionRate}%`;

        ctx.reply(message);
    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
        ctx.reply('Произошла ошибка при загрузке статистики. Пожалуйста, попробуйте позже.');
    }
}

// Обработчики текстовых сообщений
bot.on('text', async (ctx) => {
    if (!ctx.session) return;

    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        switch (ctx.session.state) {
            case 'waiting_task_name':
                ctx.session.newTask = {
                    title: ctx.message.text,
                    userId: user.user_id
                };
                const categories = await db.getUserCategories(user.user_id);
                const categoryButtons = categories.map(cat => [
                    Markup.button.callback(cat.name, `select_category:${cat.category_id}`)
                ]);
                await ctx.reply('Выберите категорию:', Markup.inlineKeyboard(categoryButtons));
                ctx.session.state = 'waiting_category';
                break;

            case 'waiting_category_name':
                const categoryName = ctx.message.text.trim();

                // Проверяем, нет ли уже категории с таким именем
                const existingCategories = await db.getUserCategories(user.user_id);
                const exists = existingCategories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
                
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
                
                try {
                    // Создаем новую категорию в базе данных
                    await db.createCategory(user.user_id, categoryName, randomColor);
                    await ctx.reply(`Категория "${categoryName}" успешно создана! 🎨`);
                    
                    // Показываем обновленный список категорий
                    showCategories(ctx);
                } catch (error) {
                    console.error('Ошибка при создании категории:', error);
                    await ctx.reply('Произошла ошибка при создании категории. Пожалуйста, попробуйте позже.');
                }
                
                delete ctx.session;
                break;

            case 'waiting_date':
                const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
                const match = ctx.message.text.match(dateRegex);

                if (match) {
                    const [_, day, month, year] = match;
                    const date = new Date(year, month - 1, day);
                    
                    const task = await db.createTask(
                        ctx.session.newTask.userId,
                        ctx.session.newTask.title,
                        ctx.session.newTask.category,
                        date.toISOString()
                    );

                    await ctx.reply('Задача успешно добавлена! 👍');
                    delete ctx.session;
                } else {
                    await ctx.reply('Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ');
                }
                break;

            case 'waiting_change_status_number':
                try {
                    const taskIndex = parseInt(ctx.message.text) - 1;
                    if (taskIndex >= 0 && taskIndex < ctx.session.tasks.length) {
                        const task = ctx.session.tasks[taskIndex];
                        if (ctx.session.taskType === 'active') {
                            await db.completeTask(task.task_id, user.user_id);
                            await ctx.reply('Задача отмечена как выполненная! ✅');
                        } else {
                            await db.uncompleteTask(task.task_id, user.user_id);
                            await ctx.reply('Задача отмечена как активная! ↩️');
                        }
                        await showTasksList(ctx);
                    } else {
                        await ctx.reply('Неверный номер задачи.');
                    }
                    delete ctx.session;
                } catch (error) {
                    console.error('Ошибка при изменении статуса задачи:', error);
                    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
                }
                break;
        }
    } catch (error) {
        console.error('Ошибка при обработке текстового сообщения:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
});

// Обработчики inline кнопок
bot.action(/select_category:(.+)/, async (ctx) => {
    try {
        if (ctx.session?.state === 'waiting_category') {
            ctx.session.newTask.category = ctx.match[1];
            await ctx.reply(
                'Выберите дату выполнения:',
                Markup.inlineKeyboard(createCalendarKeyboard())
            );
            ctx.session.state = 'waiting_date';
        }
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Ошибка при выборе категории:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
});

// Функция для выбора типа задач
async function askTaskType(ctx, action) {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Активные задачи', `select_type:active:${action}`)],
        [Markup.button.callback('Выполненные задачи', `select_type:completed:${action}`)]
    ]);
    
    const messages = {
        'delete': 'Выберите тип задач для удаления:',
        'change_date': 'Выберите тип задач для изменения даты:',
        'change_category': 'Выберите тип задач для изменения категории:',
        'change_status': 'Выберите задачи для изменения статуса:'
    };
    
    await ctx.reply(messages[action], keyboard);
}

// Обработчик выбора типа задач
bot.action(/select_type:(\w+):(\w+)/, async (ctx) => {
    try {
        const [_, type, action] = ctx.match;
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const tasks = await db.getUserTasks(user.user_id);
        const tasksList = tasks[type].map((task, index) =>
            `${index + 1}. ${task.title}`
        ).join('\n');

        const actionMessages = {
            'delete': 'удаления',
            'change_date': 'изменения даты',
            'change_category': 'изменения категории',
            'change_status': type === 'active' ? 'отметки как выполненной' : 'отметки как активной'
        };

        await ctx.reply(
            `Выберите задачу для ${actionMessages[action]}:\n\n` +
            (tasksList || 'Нет задач') + '\n\n' +
            'Введите номер задачи:'
        );
        
        ctx.session = { 
            state: `waiting_${action}_number`,
            tasks: tasks[type],
            taskType: type
        };
    } catch (error) {
        console.error('Ошибка при выборе типа задач:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Изменить статус"
bot.action('change_status', async (ctx) => {
    await askTaskType(ctx, 'change_status');
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Изменить дату"
bot.action('change_date', async (ctx) => {
    await askTaskType(ctx, 'change_date');
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Изменить категорию"
bot.action('change_category', async (ctx) => {
    await askTaskType(ctx, 'change_category');
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Удалить"
bot.action('delete_task', async (ctx) => {
    await askTaskType(ctx, 'delete');
    await ctx.answerCbQuery();
});

// Обработчик кнопки "Показать задачи по категории"
bot.action('show_by_category', async (ctx) => {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const categories = await db.getUserCategories(user.user_id);
        const categoryButtons = categories.map(cat => [
            Markup.button.callback(`${cat.name}`, `show_category:${cat.category_id}`)
        ]);

        await ctx.reply('Выберите категорию для просмотра задач:',
            Markup.inlineKeyboard(categoryButtons)
        );
    } catch (error) {
        console.error('Ошибка при подготовке списка категорий:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
    await ctx.answerCbQuery();
});

// Обработчик выбора категории для просмотра
bot.action(/show_category:(.+)/, async (ctx) => {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const categoryId = ctx.match[1];
        const categories = await db.getUserCategories(user.user_id);
        const category = categories.find(c => c.category_id === categoryId);
        
        if (!category) {
            await ctx.reply('Категория не найдена');
            await ctx.answerCbQuery();
            return;
        }

        const tasks = await db.getUserTasks(user.user_id);
        
        const activeTasks = tasks.active
            .filter(task => task.category_id === categoryId)
            .map((task, index) =>
                `${index + 1}. ${task.title}\n📅 ${formatDate(task.due_date)}`
            ).join('\n');

        const completedTasks = tasks.completed
            .filter(task => task.category_id === categoryId)
            .map((task, index) =>
                `${index + 1}. ✅ ${task.title}\n📅 ${formatDate(task.due_date)}`
            ).join('\n');

        const message =
            `🏷 Задачи в категории "${category.name}":\n\n` +
            '📋 Активные задачи:\n' +
            (activeTasks || 'Нет активных задач') +
            '\n\n✅ Выполненные задачи:\n' +
            (completedTasks || 'Нет выполненных задач');

        await ctx.reply(message);
    } catch (error) {
        console.error('Ошибка при отображении задач категории:', error);
        ctx.reply('Произошла ошибка при загрузке задач. Пожалуйста, попробуйте позже.');
    }
    await ctx.answerCbQuery();
});

// Обработчик выбора даты
bot.action(/select_date:(no_date|(\d+):(\d+):(\d+))/, async (ctx) => {
    try {
        if (!ctx.session) return;

        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        if (ctx.session.state === 'waiting_date') {
            // Логика создания новой задачи
            const match = ctx.match[1];
            let dueDate = null;

            if (match !== 'no_date') {
                const [year, month, day] = match.split(':').map(Number);
                const date = new Date(year, month, day);
                date.setHours(12, 0, 0, 0); // Устанавливаем время на полдень
                dueDate = date.toISOString();
            }

            const task = await db.createTask(
                ctx.session.newTask.userId,
                ctx.session.newTask.title,
                ctx.session.newTask.category,
                dueDate
            );

            const categories = await db.getUserCategories(ctx.session.newTask.userId);
            const category = categories.find(c => c.category_id === ctx.session.newTask.category);

            await ctx.editMessageText(
                'Задача успешно добавлена! 👍\n' +
                `Название: ${task.title}\n` +
                `Категория: ${category ? category.name : 'Без категории'}\n` +
                `Дата: ${formatDate(task.due_date)}`
            );
        } else if (ctx.session.state === 'waiting_new_date' && ctx.session.taskToChange) {
            // Логика изменения даты существующей задачи
            const match = ctx.match[1];
            let dueDate = null;

            if (match !== 'no_date') {
                const [year, month, day] = match.split(':').map(Number);
                const date = new Date(year, month, day);
                date.setHours(12, 0, 0, 0); // Устанавливаем время на полдень
                dueDate = date.toISOString();
            }

            await db.updateTaskDate(ctx.session.taskToChange, user.user_id, dueDate);
            await ctx.editMessageText('Дата задачи успешно изменена! 📅');
            await showTasksList(ctx);
        }

        delete ctx.session;
    } catch (error) {
        console.error('Ошибка при обработке даты:', error);
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
    await ctx.answerCbQuery();
});

// Обработчик изменения категории задачи
bot.action(/change_task_category:(\d+):(.+)/, async (ctx) => {
    try {
        const user = await db.getOrCreateUser(
            ctx.from.id,
            ctx.from.username,
            ctx.from.first_name,
            ctx.from.last_name
        );

        const [_, taskId, categoryId] = ctx.match;
        
        // Обновляем категорию задачи в базе данных
        await db.updateTaskCategory(parseInt(taskId), categoryId, user.user_id);
        
        await ctx.reply('Категория задачи успешно изменена! 🏷');
        
        // Показываем обновленный список задач
        await showTasksList(ctx);
    } catch (error) {
        console.error('Ошибка при изменении категории задачи:', error);
        ctx.reply('Произошла ошибка при изменении категории. Пожалуйста, попробуйте позже.');
    }
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

// Запускаем бота
bot.launch().then(() => {
    console.log('Бот запущен');
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Выключение бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 