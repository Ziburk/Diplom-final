const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Task = require('./src/models/Task');
const Notification = require('./src/models/Notification');

async function testModels() {
    try {
        console.log('Начинаем тестирование моделей...\n');

        // 1. Тестируем создание пользователя
        console.log('1. Тестирование User модели:');
        const testUser = await User.createOrUpdateFromTelegram({
            id: 12345,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
        });
        console.log('Создан тестовый пользователь:', testUser);

        // 2. Тестируем работу с категориями
        console.log('\n2. Тестирование Category модели:');
        
        // Создаем стандартные категории
        const defaultCategories = await Category.createDefaultCategory(testUser.user_id);
        console.log('Созданы стандартные категории:');
        defaultCategories.forEach(category => {
            console.log(`- ${category.name} (${category.category_id}): ${category.color}`);
        });

        // Создаем пользовательскую категорию с уникальным именем
        const timestamp = Date.now();
        const customCategory = await Category.create(testUser.user_id, {
            name: `Тестовая категория ${timestamp}`,
            color: '#FF5252'
        });
        console.log('\nСоздана пользовательская категория:', customCategory);

        // Получаем все категории пользователя
        const categories = await Category.getAllByUserId(testUser.user_id);
        console.log('\nСписок всех категорий пользователя:');
        categories.forEach(category => {
            console.log(`- ${category.name} (${category.category_id}): ${category.color}`);
        });

        // 3. Тестируем работу с задачами
        console.log('\n3. Тестирование Task модели:');
        
        // Создаем тестовую задачу
        const task = await Task.create(testUser.user_id, {
            title: `Тестовая задача ${timestamp}`,
            description: 'Описание тестовой задачи',
            category_id: customCategory.category_id,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // завтра
        });
        console.log('Создана тестовая задача:', task);

        // Получаем список задач
        const tasks = await Task.getAllByUserId(testUser.user_id);
        console.log('\nСписок всех задач:');
        console.log('Активные задачи:', tasks.active.length);
        tasks.active.forEach(task => {
            console.log(`- ${task.title} (Категория: ${task.category_name})`);
        });
        console.log('Выполненные задачи:', tasks.completed.length);
        tasks.completed.forEach(task => {
            console.log(`- ${task.title} (Категория: ${task.category_name})`);
        });

        // Меняем статус задачи на выполнено
        const completedTask = await Task.changeStatus(task.task_id, testUser.user_id, 'completed');
        console.log('\nЗадача отмечена как выполненная:', completedTask);

        // Тестируем уведомления в задачах
        const taskWithNotification = await Task.updateNotifications(task.task_id, testUser.user_id, {
            notifications_enabled: true,
            notification_time: new Date()
        });
        console.log('Обновлены настройки уведомлений задачи:', taskWithNotification);

        console.log('\nТестирование завершено успешно!');

    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Запускаем тестирование
testModels(); 