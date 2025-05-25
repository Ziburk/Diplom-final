
// Сохраняем цвет категории
function saveCategoryColor(categoryKey, color) {
    const categoryStyles = JSON.parse(localStorage.getItem('categoryStyles') || '{}');
    categoryStyles[categoryKey] = color;
    localStorage.setItem('categoryStyles', JSON.stringify(categoryStyles));
}

// Получение цвета категории
function getCategoryColor(categoryId) {
    return categories[categoryId]?.color || categories[defaultCategoryId].color;
}

// Получение отображаемого имени категории
function getCategoryName(categoryId) {
    return categories[categoryId]?.name || categories[defaultCategoryId].name;
}

// Функция рендеринга задача при экспорте
function renderTasksForExportSelection() {
    const container = document.getElementById('selected-tasks-list');
    if (!container) return;

    container.innerHTML = '';

    // Добавляем активные задачи
    tasks.active.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'export-task-item';
        taskElement.innerHTML = `
            <input type="checkbox" id="task-${index}-active" class="export-task-checkbox" data-index="${index}" data-type="active">
            <label for="task-${index}-active">${task.title || 'Без названия'} (Активная)</label>
        `;
        container.appendChild(taskElement);
    });

    // Добавляем выполненные задачи
    tasks.completed.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'export-task-item';
        taskElement.innerHTML = `
            <input type="checkbox" id="task-${index}-completed" class="export-task-checkbox" data-index="${index}" data-type="completed">
            <label for="task-${index}-completed">${task.title || 'Без названия'} (Выполненная)</label>
        `;
        container.appendChild(taskElement);
    });

    // Если нет задач, показываем сообщение
    if (tasks.active.length === 0 && tasks.completed.length === 0) {
        container.innerHTML = '<div class="no-tasks-message">Нет задач для выбора</div>';
    }
}