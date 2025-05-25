// Глобальный объект для хранения задач
let tasks = {
    active: [],
    completed: []
};

// Категории задач
let categories = ['work', 'personal', 'shopping', 'other'];
let currentCategoryFilter = 'all';
let currentStatusFilter = 'all';
let pieChart = null;

// Инициализация приложения
var init = () => {
    initPieChart();
    loadTasks();

    // Обработчики для фильтров
    document.getElementById('category-filter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        renderTasks();
    });

    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderTasks();
        });
    });

    document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
    document.querySelector('.add-task-button').addEventListener('click', addTask);

    // Обработчики для задач
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('task-description-ico') || event.target.classList.contains('task-open-description')) {
            const taskItem = event.target.closest('.task');
            const description = taskItem.querySelector('.task-description');
            description.classList.toggle('display-block');
        }

        if (event.target.classList.contains('task-delete-ico') || event.target.classList.contains('task-delete')) {
            deleteTask(event);
        }

        if (event.target.classList.contains('task-change-logo') || event.target.classList.contains('task-change')) {
            changeTask(event);
        }
    });

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('check-label')) {
            completeTask(event);
        }
    });
};

window.onload = init;

// Функция загрузки задач из localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('todoTasks');
    const savedCategories = localStorage.getItem('todoCategories');

    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    } else {
        // Инициализация из HTML
        tasks = { active: [], completed: [] };

        const activeTasks = document.querySelectorAll('.all-tasks .task');
        activeTasks.forEach(task => {
            tasks.active.push({
                title: task.querySelector('.task-title').textContent,
                description: task.querySelector('.task-description').textContent,
                category: 'other'
            });
        });

        saveTasks();
    }

    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    }
    updateCategorySelectors();
    renderTasks();
    updateStats();
}

// Функция сохранения задач в localStorage
function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
    localStorage.setItem('todoCategories', JSON.stringify(categories));
}

// Функция отрисовки задач с учетом фильтров
function renderTasks() {
    const activeList = document.querySelector('.all-tasks');
    const completedList = document.querySelector('.completed-tasks-list');

    activeList.innerHTML = '';
    completedList.innerHTML = '';

    // Функция проверки соответствия задачи фильтрам
    const matchesFilters = (task, isCompleted) => {
        // Проверка статуса
        if (currentStatusFilter === 'active' && isCompleted) return false;
        if (currentStatusFilter === 'completed' && !isCompleted) return false;

        // Проверка категории
        if (currentCategoryFilter !== 'all') {
            // Для старых задач, у которых category может быть undefined
            const taskCategory = task.category || 'other';
            if (taskCategory !== currentCategoryFilter) return false;
        }

        return true;
    };

    // Рендерим активные задачи
    tasks.active.forEach((task, index) => {
        if (matchesFilters(task, false)) {
            const taskElement = createTaskElement(task, index, false);
            activeList.appendChild(taskElement);
        }
    });

    // Рендерим завершенные задачи
    tasks.completed.forEach((task, index) => {
        if (matchesFilters(task, true)) {
            const taskElement = createTaskElement(task, index, true);
            completedList.appendChild(taskElement);
        }
    });
}

// Создание элемента задачи
function createTaskElement(task, index, isCompleted) {
    // Создаем основной элемент задачи
    const taskElement = document.createElement('li');
    taskElement.className = `task task${index} ${isCompleted ? 'completed-task' : ''}`;
    taskElement.dataset.index = index;

    // Получаем категорию (по умолчанию 'other')
    const taskCategory = task.category || 'other';
    taskElement.dataset.category = taskCategory;

    // Получаем цвет для категории
    const categoryColor = getCategoryColor(taskCategory);

    // Создаем HTML структуру задачи
    taskElement.innerHTML = `
        <div class="task-wrapper">
            <div class="task-title-wrapper">
                <input class="task-comp" type="checkbox" name="task-comp" ${isCompleted ? 'checked' : ''}>
                <label class="check-label" for="task-comp"></label>
                <span class="task-category" style="background-color: ${category.color}">
                    ${category.name}
                </span>
                <h3 class="task-title">${task.title || 'Без названия'}</h3>
                <button class="task-change">
                    <img class="task-change-logo" src="img/edit-ico.svg" alt="Редактировать">
                </button>
            </div>
            <div class="button-wrapper">
                <button class="task-open-description">
                    <img class="task-description-ico" alt="Подробнее" src="img/arrow-desc.svg">
                </button>
                <button class="task-delete">
                    <img class="task-delete-ico" src="img/delete-ico.svg" alt="Удалить">
                </button>
            </div>
        </div>
        <p class="task-description">${task.description || ''}</p>
    `;

    taskElement.setAttribute('style', `border-color: ${categoryColor}`);

    // Возвращаем готовый элемент задачи
    return taskElement;
}

// Добавление новой задачи
var addTask = () => {
    const newTask = document.createElement('li');
    newTask.className = "task new-task";
    newTask.innerHTML = `
        <div class="task-title-wrapper">
            <img class="new-task-ico" src="img/task-ico.png" alt="check">
            <select class="new-task-category">
                ${categories.map(cat => `<option class="new-task-category-option" value="${cat}">${getCategoryName(cat)}</option>`).join('')}
            </select>
            <input class="new-task-title" type="text" name="new-task-title" maxlength="100">
        </div>
    `;

    const taskList = document.querySelector('.all-tasks');
    taskList.prepend(newTask);
    const newTitle = newTask.querySelector('.new-task-title');
    newTitle.focus();

    newTitle.addEventListener('keydown', (e) => {

        if (e.key === 'Enter') {
            newTitle.blur();
        }
    });

    newTitle.addEventListener('blur', (e) => {
        const selectCat = newTask.querySelector('.new-task-category');

        if (e.relatedTarget === selectCat) {
            newTitle.focus();
            return;
        }

        if (newTitle.value) {
            const taskTitleText = newTitle.value;
            const taskDesc = ' ';
            const taskCategory = newTask.querySelector('.new-task-category').value;

            tasks.active.unshift({
                title: taskTitleText,
                description: taskDesc,
                category: taskCategory // Сохраняем выбранную категорию
            });

            saveTasks();
            renderTasks();
            updateStats();
        } else {
            newTask.remove();

        }
    })
};

// Удаление задачи
var deleteTask = (event) => {
    const taskElement = event.target.closest('.task');
    const taskList = taskElement.parentNode;
    const isCompleted = taskElement.classList.contains('completed-task');

    const taskIndex = Array.from(taskList.children).indexOf(taskElement);
    if (isCompleted) {
        tasks.completed.splice(taskIndex, 1);
    } else {
        tasks.active.splice(taskIndex, 1);
    }

    saveTasks();
    renderTasks();
    updateStats();
};

// Редактирование задачи
var changeTask = (event) => {
    const currentTaskWr = event.target.closest('.task');
    const currentTask = currentTaskWr.querySelector('.task-title-wrapper');
    const currentTaskTitle = currentTask.querySelector('.task-title');
    const currentTaskCategory = currentTask.querySelector('.task-category');

    const redactButton = currentTask.querySelector('.task-change');
    redactButton.classList.toggle('hidden');

    const isInput = currentTask.querySelector('.task-title-input');
    if (!isInput) {
        const currentTitleText = currentTaskTitle.innerText;
        // Получаем текущую категорию из класса или dataset
        const currentCategory = currentTaskWr.dataset.category || 'other';

        currentTaskTitle.remove();
        currentTaskCategory.remove();

        const categorySelect = document.createElement('select');
        categorySelect.className = 'task-category-select';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = getCategoryName(cat);
            if (cat === currentCategory) option.selected = true;
            categorySelect.appendChild(option);
        });

        const taskTitleInput = document.createElement('input');
        taskTitleInput.setAttribute('type', 'text');
        taskTitleInput.setAttribute('value', currentTitleText);
        taskTitleInput.setAttribute('maxlength', 100);
        taskTitleInput.className = 'task-title-input';

        currentTask.insertBefore(categorySelect, redactButton);
        currentTask.insertBefore(taskTitleInput, categorySelect);

        taskTitleInput.focus();
        taskTitleInput.setSelectionRange(taskTitleInput.value.length, taskTitleInput.value.length);

        let isSaved = false;

        const saveChanges = () => {
            if (isSaved) return;
            isSaved = true;

            const changedText = taskTitleInput.value;
            const changedCategory = categorySelect.value;

            const taskElement = event.target.closest('.task');
            const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);

            if (taskElement.classList.contains('completed-task')) {
                tasks.completed[taskIndex].title = changedText;
                tasks.completed[taskIndex].category = changedCategory;
            } else {
                tasks.active[taskIndex].title = changedText;
                tasks.active[taskIndex].category = changedCategory;
            }

            saveTasks();
            renderTasks();
            updateStats();
        };

        const handleBlur = (e) => {
            console.log(e);
            if (e.relatedTarget === categorySelect) {
                taskTitleInput.focus();
                return;
            } else {
                saveChanges();
                return;
            }

        };
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
            }
        };

        taskTitleInput.addEventListener('blur', handleBlur);
        taskTitleInput.addEventListener('keydown', handleKeyDown);
        categorySelect.addEventListener('change', saveChanges);
    }
};

// Отметка задачи как выполненной/невыполненной
var completeTask = (event) => {
    const currentTask = event.target.closest('.task');
    if (!currentTask) return;

    const taskList = currentTask.parentNode;
    const taskIndex = Array.from(taskList.children).indexOf(currentTask);

    try {
        if (currentTask.classList.contains('completed-task')) {
            const task = tasks.completed.splice(taskIndex, 1)[0];
            if (task) tasks.active.unshift(task);
        } else {
            const task = tasks.active.splice(taskIndex, 1)[0];
            if (task) tasks.completed.unshift(task);
        }
        saveTasks();
        renderTasks();
        updateStats();
    } catch (e) {
        console.error('Ошибка при перемещении задачи:', e);
    }
};

// Инициализация диаграммы
function initPieChart() {
    const ctx = document.getElementById('pieChart').getContext('2d');

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Завершённые', 'Активные'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    '#4CAF50',
                    '#9E9E9E'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    updateStats();
}

// Обновление статистики
function updateStats() {
    if (!pieChart) return;

    const completedCount = tasks.completed.length;
    const activeCount = tasks.active.length;
    const totalCount = completedCount + activeCount;

    pieChart.data.datasets[0].data = [completedCount, activeCount];
    pieChart.update();

    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('total-count').textContent = totalCount;
}

function addNewCategory() {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'category-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Создать новую категорию</h3>
            <input type="text" id="new-category-name" placeholder="Название категории">
            
            <div class="color-picker">
                <h4>Выберите цвет:</h4>
                <div class="color-options">
                    <div class="color-option" data-color="#FF5252" style="background-color: #FF5252"></div>
                    <div class="color-option" data-color="#FFD740" style="background-color: #FFD740"></div>
                    <div class="color-option" data-color="#69F0AE" style="background-color: #69F0AE"></div>
                    <div class="color-option" data-color="#448AFF" style="background-color: #448AFF"></div>
                    <div class="color-option" data-color="#B388FF" style="background-color: #B388FF"></div>
                    <div class="color-option" data-color="#FF80AB" style="background-color: #FF80AB"></div>
                </div>
                <input type="color" id="custom-color" value="#448AFF">
            </div>
            
            <div class="modal-buttons">
                <button id="cancel-category">Отмена</button>
                <button id="save-category">Сохранить</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Выбранный цвет (по умолчанию первый из预设)
    let selectedColor = '#448AFF';

    // Обработчики событий
    modal.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            selectedColor = option.dataset.color;
            document.getElementById('custom-color').value = selectedColor;
        });
    });

    document.getElementById('custom-color').addEventListener('input', (e) => {
        selectedColor = e.target.value;
    });

    modal.querySelector('#cancel-category').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#save-category').addEventListener('click', () => {
        const categoryName = document.getElementById('new-category-name').value.trim();

        if (!categoryName) {
            alert('Введите название категории!');
            return;
        }

        // Генерируем ключ категории (латинскими буквами)
        const categoryKey = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        if (categories.includes(categoryKey)) {
            alert('Категория с таким названием уже существует!');
            return;
        }

        // Добавляем новую категорию
        categories.push(categoryKey);

        // Сохраняем цвет категории
        saveCategoryColor(categoryKey, selectedColor);

        // Обновляем интерфейс
        updateCategorySelectors();
        saveTasks();
        renderTasks();

        modal.remove();

    });

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Сохраняем цвет категории
function saveCategoryColor(categoryKey, color) {
    const categoryStyles = JSON.parse(localStorage.getItem('categoryStyles') || '{}');
    categoryStyles[categoryKey] = color;
    localStorage.setItem('categoryStyles', JSON.stringify(categoryStyles));
}

// Получение цвета категории
function getCategoryColor(categoryKey) {
    const categoryStyles = JSON.parse(localStorage.getItem('categoryStyles') || '{}');
    return categoryStyles[categoryKey] || '#607D8B'; // Цвет по умолчанию
}

// Получение отображаемого имени категории
function getCategoryName(categoryKey) {
    const categoryNames = JSON.parse(localStorage.getItem('categoryNames') || '{}');
    const defaultNames = {
        'work': 'Работа',
        'personal': 'Личное',
        'shopping': 'Покупки',
        'other': 'Другое'
    };
    return categoryNames[categoryKey] || defaultNames[categoryKey] || categoryKey;
}

function updateCategorySelectors() {
    const categoryFilter = document.getElementById('category-filter');
    const options = categories.map(cat =>
        `<option value="${cat}">${getCategoryName(cat)}</option>`
    ).join('');

    categoryFilter.innerHTML = `<option value="all">Все категории</option>${options}`;

    // Обновляем селекторы в форме добавления задачи
    const newTaskCategorySelects = document.querySelectorAll('.new-task-category, .task-category-select');
    newTaskCategorySelects.forEach(select => {
        if (select.parentNode) {
            select.innerHTML = categories.map(cat =>
                `<option value="${cat}">${getCategoryName(cat)}</option>`
            ).join('');
        }
    });
}