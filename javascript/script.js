import ToastUIEditor from '@toast-ui/editor';
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';

//-----------------------------------------------------------------------------------
// Переменные и константы

// Глобальный объект для хранения задач
let tasks = {
    active: [],     //массив текущих задач
    completed: []   //массив выполненных задач
};

// Объект со стандартными категориями задач, которые будут при первом открытии
let categories = {
    // Категорию 'other' нельзя редактировать
    'other': {
        id: 'other',        // поле с уникальным id категории
        name: 'Общее',      // поле с именем, которое будет отображаться
        color: '#607D8B'    // поле с цветом категории
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
};

// Переменная для списка активных редакторов текста
let activeEditors = {};

// Переменная, в которую записывается круговая диаграмма при ее инициализации
let pieChart = null;

// Список констант для определения типа диаграммы 
const CHART_TYPES = {
    COMPLETION: 'completion',   // диаграмма выполненные/невыполненные                       
    COMPLETED_BY_CATEGORY: 'completed-by-category',  // диаграмма выполненных с разбитием на категории      
    ACTIVE_BY_CATEGORY: 'active-by-category'    // диаграмма невыполненных с разбитием на категории
};

// Переменная, хранящая текущий тип диаграммы (по стандарту "выполненные/невыполненные")
let currentChartType = CHART_TYPES.COMPLETION;

// Переменная, в которую записывается график продуктивности при его инициализации
let productivityChart = null;

// Список констант для определения периода графика продуктивности
const PRODUCTIVITY_PERIODS = {
    LAST_7_DAYS: '7',
    LAST_14_DAYS: '14',
    LAST_30_DAYS: '30',
    CUSTOM: 'custom'
};

// Категория, которая будет даваться задачам по умолчанию
const defaultCategoryId = 'other';

// Переменные, связанные с фильтрацией категорий
let currentCategoryFilter = 'all';  // Фильтр по конкретной категории
let currentStatusFilter = 'all';    // Фильтр по статусу задачи (активная/завершенная)

// Константы для выбора задач для экспорта
const EXPORT_TYPES = {
    SELECTED: 'selected',
    ALL_TASKS: 'all-tasks',
    ALL_COMPLETED: 'all-completed',
    ALL_ACTIVE: 'all-active',
    BY_DATE_RANGE: 'by-date-range'
};

// Константы для типов диаграммы в экспорте
const EXPORT_CHART_TYPES = {
    NONE: 'none',
    COMPLETION: 'completion',
    BY_CATEGORY: 'by-category'
};

// Константы для графика продуктивности в экспорте
const EXPORT_PRODUCTIVITY_TYPES = {
    NONE: 'none',
    LAST_7_DAYS: '7',
    LAST_14_DAYS: '14',
    LAST_30_DAYS: '30',
    CUSTOM: 'custom'
};


//-----------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------
// Функции

// Главная функция всей программы. Инициализация компонентов и присваивание событий
const init = () => {
    loadCategories(); // Загружаем категории
    loadTasks(); // Загружаем задачи
    initTabs(); // Инициализация вкладок
    setupDragAndDrop(); // Инициализация логики перетаскивания задач

    // Добавляем обработчик кнопке управления категория
    document.querySelector('.category-manager-btn').addEventListener('click', showCategoryManager);

    // Добавляем обработчик для фильтра списка категорий
    document.getElementById('category-filter').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        renderTasks(); // Отбор подходящих задач
    });

    // Добавляем обработчик состояния задач (Активные/Завершенные)
    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderTasks();
        });
    });

    // Добавляем обработчик для сортировки по дате (select)
    document.getElementById('date-sort').addEventListener('change', (e) => {
        renderTasks();
    });

    // Добавляем обработчик для сортировки по конкретной дате
    document.getElementById('date-filter').addEventListener('change', (e) => {
        renderTasks();
    });

    // Добавляем обработчик для очистки поля с датой
    document.getElementById('clear-date-filter').addEventListener('click', () => {
        document.getElementById('date-filter').value = '';
        renderTasks();
    });

    // Добавляем обработчик кнопки добавления задачи
    document.querySelector('.add-task-button').addEventListener('click', addTask);

    // Обработчики для задач
    document.addEventListener('click', (event) => {

        // Если нажали на кнопку изменения названия задачи
        if (event.target.classList.contains('task-change-logo') ||
            event.target.classList.contains('task-change')) {
            changeTask(event);
        }

        // Если нажато кнопка раскрытия описания, то раскрываем его
        if (event.target.classList.contains('task-description-ico') ||
            event.target.classList.contains('task-open-description')) {
            const taskItem = event.target.closest('.task');
            const description = taskItem.querySelector('.task-description');
            description.classList.toggle('hidden');
        }

        // Если нажали на само описание, то открываем редактирование описания
        if (event.target.classList.contains('task-description-text')) {
            const taskItem = event.target.closest('.task');
            initEditorForTask(taskItem);
        }

        // Если нажали на сохранение описания
        if (event.target.classList.contains('save-description-btn')) {
            saveTaskDescription(event);
        }

        // Если нажали на отмету сохранения описания
        if (event.target.classList.contains('cancel-description-btn')) {
            cancelTaskDescriptionEditing(event);
        }

        // Если нажали на кнопку изменения даты
        if (event.target.classList.contains('task-change-date') ||
            event.target.classList.contains('task-change-date-logo')) {
            changeTaskDate(event);
        }

        // Если нажали на кнопку удаления задачи
        if (event.target.classList.contains('task-delete-ico') || event.target.classList.contains('task-delete')) {
            deleteTask(event);
        }

    });

    // Добавляем обработчики для "выполнения задачи"
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('check-label')) {
            completeTask(event);
        }
    });

    // Добавляем обработчик изменения типа диаграммы
    document.getElementById('chart-type').addEventListener('change', (e) => {
        currentChartType = e.target.value;
        initPieChart();
    });

    // Добавляем обработчик изменения периода графика продуктивности
    document.getElementById('productivity-period').addEventListener('change', (e) => {
        const period = e.target.value;
        // Если выбран "кастомный" период, то показываем настройки даты
        document.getElementById('custom-period-selector').classList.toggle('hidden', period !== PRODUCTIVITY_PERIODS.CUSTOM);
        updateProductivityChart();
    });

    // Добавляем обработчик для кнопки "применить" при выборе кастомного периода
    document.getElementById('apply-custom-period').addEventListener('click', updateProductivityChart);

    // Добавляем обработчик для кнопки "Экспорт в PDF"
    document.querySelector('.export-button').addEventListener('click', initExportModal);
};

// Инициализация произойдет только после загрузки всего HTML
window.onload = init;

// Функция обновления информации
function updateUI() {
    updateCategorySelectors();  //Обновление всех выпадающих списков категорий
    renderTasks();  // Отрисовка всех задач
    updateStats();  // Обновление статистики на вкладке "Статистика"
    saveTasks();
};

// Функция загрузки категорий из localStorage
function loadCategories() {
    // Загрузка категорий в константу
    const saved = localStorage.getItem('todoCategories');

    // Если загрузили хоть какие-то категории, то записываем их
    if (saved) {
        categories = JSON.parse(saved);
    }

    // Гарантируем, что категория по умолчанию всегда существует
    if (!categories[defaultCategoryId]) {
        categories[defaultCategoryId] = {
            id: defaultCategoryId,
            name: 'Общее',
            color: '#607D8B'
        };
    }

    // Обновляем списки категорий
    updateCategorySelectors();
}

// Функция загрузки задач из localStorage
function loadTasks() {

    // Получение сохраненных в localStorage задач
    const savedTasks = localStorage.getItem('todoTasks');

    // Если в localStorage есть хоть одна задача
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);

        // Добавляем originalPosition(положение задачи в списке) для задач, у которых его нет
        tasks.active.forEach((task, index) => {
            if (task.originalPosition === undefined) {
                task.originalPosition = index;
            }
        });
    }

    updateUI();
}

// Функция инициализации вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.main-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'statistics') {
                initPieChart();
                initProductivityChart();
            }
        });
    });

}

// Функция перетаскивания задачи
function setupDragAndDrop() {

    // Получаем списки активных и завершенных задач
    const taskLists = document.querySelectorAll('.task-list');

    let draggedItem = null; // "Взятая" задача
    let placeholder = null; // Пустой блок, вставаемый на прошлое место задачи
    let dragOverList = null; // Список, над которым происходит перемещение

    // Проходимся по каждому списку
    taskLists.forEach(list => {

        // Начало перетаскивания
        list.addEventListener('dragstart', (e) => {

            // Если взята задача, то добавляем ей класс
            if (e.target.classList.contains('task')) {
                draggedItem = e.target;
                draggedItem.classList.add('dragging');

                // Создаем плейсхолдер
                placeholder = document.createElement('div');
                placeholder.className = 'task-placeholder';
                placeholder.style.height = `${draggedItem.offsetHeight}px`;

                // Задержка для плавного эффекта
                setTimeout(() => {
                    draggedItem.style.display = 'none';
                    draggedItem.parentNode.insertBefore(placeholder, draggedItem);
                }, 0);

                // Разрешено только перетаскивание
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // Элемент над зоной сброса
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // Проверка, что перетаскивание корректно
            if (!draggedItem || !placeholder) return;

            // Проверяем, что перетаскивание происходит в том же списке
            const isSameList = draggedItem.closest('.task-list') === list;
            if (!isSameList) return;

            // Добавляем класс для визуального выделения
            list.classList.add('drag-over');
            dragOverList = list;

            // Исключаем плейсхолдер из расчетов
            const siblings = [...list.children].filter(child => child !== placeholder);

            if (siblings.length === 0) {
                list.appendChild(placeholder);
                return;
            }

            // Находим элемент, перед которым нужно вставить
            const closestSibling = siblings.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = e.clientY - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;

            if (closestSibling) {
                list.insertBefore(placeholder, closestSibling);
            } else {
                list.appendChild(placeholder);
            }
        });

        // Покинули зону сброса
        list.addEventListener('dragleave', (e) => {
            list.classList.remove('drag-over');
        });

        // Сброс элемента
        list.addEventListener('drop', (e) => {
            e.preventDefault();

            if (!draggedItem || !placeholder) return;

            // Вставляем перетаскиваемый элемент вместо плейсхолдера
            if (placeholder.parentNode) {
                placeholder.parentNode.replaceChild(draggedItem, placeholder);
            }

            draggedItem.style.display = '';
            list.classList.remove('drag-over');

            // Обновляем порядок задач
            updateTaskOrder(list);
        });

        // Завершение перетаскивания
        list.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem.style.display = '';

                // Удаляем плейсхолдер, если он остался
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }

                if (dragOverList) {
                    dragOverList.classList.remove('drag-over');
                }

                draggedItem = null;
                placeholder = null;
                dragOverList = null;
            }
        });
    });
}

// Функция обновления порядка задач после перетаскивания
function updateTaskOrder(list) {
    const isCompleted = list.id === 'completed-tasks-list';
    const taskArray = isCompleted ? tasks.completed : tasks.active;
    const newTaskArray = [];

    // Получаем новый порядок задач из DOM
    const taskElements = list.querySelectorAll('.task');

    // Создаем карту для быстрого поиска задач по их текущему индексу
    const taskMap = {};
    taskArray.forEach(task => {
        taskMap[task.originalPosition] = task;
    });

    // Собираем задачи в новом порядке
    taskElements.forEach((element, newIndex) => {
        const originalIndex = parseInt(element.dataset.originalIndex);
        const task = taskArray[originalIndex];

        if (task) {
            task.originalPosition = newIndex;
            newTaskArray.push(task);
        }
    });

    // Обновляем массив задач
    if (isCompleted) {
        tasks.completed = newTaskArray;
    } else {
        tasks.active = newTaskArray;
    }

    // Обновляем data-атрибуты в DOM
    taskElements.forEach((element, index) => {
        element.dataset.originalIndex = index;
    });

    saveTasks();
}

// Функция отрисовки задач с учетом фильтров
function renderTasks() {

    // Получение списков задач
    const activeList = document.querySelector('#current-tasks-list');
    const completedList = document.querySelector('#completed-tasks-list');

    //Обнуление размети этих списков
    activeList.innerHTML = '';
    completedList.innerHTML = '';

    // Отбор задач по критериям фильтрации
    const matchesFilters = (task, isCompleted) => {

        // Отбор по статусу (Активные/Завершенные)
        if (currentStatusFilter === 'active' && isCompleted) return false;
        if (currentStatusFilter === 'completed' && !isCompleted) return false;

        // Отбор по категориям
        if (currentCategoryFilter !== 'all') {
            const taskCategory = task.category || defaultCategoryId;
            if (taskCategory !== currentCategoryFilter) return false;
        }

        // Отбор по дате
        const dateFilter = document.getElementById('date-filter').value;
        if (dateFilter) {
            if (dateFilter && task.dueDate !== dateFilter) return false;
        }

        return true;
    };

    // Сортируем каждый из списков
    const activeTasks = sortTasksByDate(tasks.active.filter(task => matchesFilters(task, false)));
    const completedTasks = sortTasksByDate(tasks.completed.filter(task => matchesFilters(task, true)));

    // Рендерим с сохранением оригинальных индексов
    activeTasks.forEach((task) => {
        const originalIndex = tasks.active.findIndex(t => t === task);
        const taskElement = createTaskElement(task, originalIndex, false);
        activeList.appendChild(taskElement);
    });

    completedTasks.forEach((task) => {
        const originalIndex = tasks.completed.findIndex(t => t === task);
        const taskElement = createTaskElement(task, originalIndex, true);
        completedList.appendChild(taskElement);
    });

    // Выводим отобранные задачи
    document.querySelector('.current-tasks-title').textContent = `Текущие (${activeTasks.length})`;
    document.querySelector('.completed-tasks-title').textContent = `Выполненные (${completedTasks.length})`;
}

// Функция создания самой задачи
function createTaskElement(task, index, isCompleted) {

    // Создает задачу (элемент списка) и задаем есть параметры
    const taskElement = document.createElement('li');
    taskElement.className = `task task${index} ${isCompleted ? 'completed-task' : ''}`;
    taskElement.dataset.originalIndex = index;
    taskElement.dataset.isCompleted = isCompleted;
    taskElement.draggable = true; // Добавляем возможность перетаскивания

    const categoryId = task.category || defaultCategoryId;
    taskElement.dataset.category = categoryId;
    const category = categories[categoryId] || categories[defaultCategoryId];

    // Создаем HTML структуру задачи
    taskElement.innerHTML = `
    <div class="task-wrapper">
        <div class="task-title-wrapper">
            <input class="task-comp hidden" type="checkbox" name="task-comp" ${isCompleted ? 'checked' : ''}>
            <label class="check-label" for="task-comp"></label>
            <span class="task-category" style="background-color: ${category.color}">
                ${category.name}
            </span>
            <h3 class="task-title">${task.title || 'Без названия'}</h3>
            <button class="task-change">
                <img class="task-change-logo" src="img/edit-ico.svg" alt="Редактировать">
            </button>
        </div>
        <div class="task-date-wrapper">
            <span class="task-due-date">${formatDate(task.dueDate)}</span>
            <button class="task-change-date">
                <img class="task-change-date-logo" src="img/edit-ico.svg" alt="Изменить дату">
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
        <div class="task-description hidden">
            <h4 class="task-description-title">Описание</h4>
            <div class="description-content">
                <div class="task-description-text">${task.description || 'Нет описания'}</div>
                <div class="task-description-editor hidden" id="editor-${index}"></div>
            </div>
            <div class="editor-buttons hidden">
                <button class="save-description-btn">Сохранить</button>
                <button class="cancel-description-btn">Отмена</button>
            </div>
        </div>
    `;

    taskElement.setAttribute('style', `border-color: ${category.color}`);
    return taskElement;
}

// Функция отображения настроек категорий
function showCategoryManager() {
    // Создаем модальное окно настроек
    const modal = document.createElement('div');
    modal.className = 'category-manager-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Управление категориями</h3>
            <button id="add-new-category-up" class="add-new-category">+</button>
            <ul class="categories-list"></ul>
            <div class="modal-buttons">
                <button id="add-new-category-down" class="add-new-category">Добавить категорию</button>
                <button id="close-category-manager">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    renderCategoriesList(modal.querySelector('.categories-list'));

    // Кнопкам добавления новой категории добавлем обработчики
    modal.querySelectorAll('.add-new-category').forEach(button => {
        button.addEventListener('click', addNewCategory)
    });

    // Добавляем обработчик для кнопки закрытия окна настроек
    modal.querySelector('#close-category-manager').addEventListener('click', () => modal.remove());

    // Если нажали на область вне осна настроек, то закрываем его
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Функция для вывода списка категорий в настройках категорий
function renderCategoriesList(container) {
    container.innerHTML = '';

    Object.values(categories).forEach(category => {
        // Пропускаем категорию "Другое", так как она не редактируется
        if (category.id === defaultCategoryId) return;

        // Создаем элементы списка категорий
        const categoryElement = document.createElement('li');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <input type="color" class="category-color-picker" value="${category.color}">
            <input type="text" class="category-name" value="${category.name}">
            <button class="delete-category" data-id="${category.id}">Удалить</button>
        `;

        container.appendChild(categoryElement);

        // Обработчик события для изменения имени категории
        categoryElement.querySelector('.category-name').addEventListener('change', (e) => {
            categories[category.id].name = e.target.value;
            saveCategories();
            updateCategorySelectors();
            renderTasks();
        });

        // Обработчик события для изменения цвета категории
        categoryElement.querySelector('.category-color-picker').addEventListener('input', (e) => {
            categories[category.id].color = e.target.value;
            saveCategories();
            renderTasks();
        });

        // Обработчик события для удаления категории
        categoryElement.querySelector('.delete-category').addEventListener('click', () => {
            deleteCategory(category.id);
            renderCategoriesList(container);
        });
    });
}

// Функция сохранения категорий
function saveCategories() {
    localStorage.setItem('todoCategories', JSON.stringify(categories));
}

// Функция обновления списка категорий в фильтрах
function updateCategorySelectors() {
    const categoryFilter = document.getElementById('category-filter');
    const options = Object.values(categories).map(cat =>
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');

    categoryFilter.innerHTML = `<option value="all">Все категории</option>${options}`;

    // Обновляем селекторы в формах
    const selects = document.querySelectorAll('.new-task-category, .task-category-select');
    selects.forEach(select => {
        if (select.parentNode) {
            select.innerHTML = Object.values(categories).map(cat =>
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
        }
    });
}

// Функция добавления новой категории
function addNewCategory() {
    const newId = generateId();
    const categoryNumber = Object.keys(categories).length;

    // Список цветов, которые могут быть по стандарту присвоены новой категории
    const colorPalette = [
        '#FF5252', '#FFD740', '#69F0AE', '#448AFF', '#B388FF',
        '#FF80AB', '#7C4DFF', '#64FFDA', '#FF8A80', '#EA80FC',
        '#8C9EFF', '#80D8FF', '#A7FFEB', '#CCFF90', '#FFFF8D'
    ];

    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

    // Создание объекта категории
    const newCategory = {
        id: newId,
        name: `Категория-${categoryNumber}`,
        color: randomColor
    };

    categories[newId] = newCategory;
    saveCategories();

    const manager = document.querySelector('.category-manager-modal');
    if (manager) {
        renderCategoriesList(manager.querySelector('.categories-list'));

        // Находим только что созданную категорию и фокусируемся на поле ввода
        const newCategoryElement = manager.querySelector(`.category-item:last-child`);
        if (newCategoryElement) {
            const nameInput = newCategoryElement.querySelector('.category-name');
            nameInput.focus();
            nameInput.select(); // Выделяем весь текст для удобства переименования
            manager.querySelector('#add-new-category-down').scrollIntoView({ behavior: 'smooth' });
        }
    }
    updateCategorySelectors();

}

// Функция для создания уникального ID у категории
function generateId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 4);
    return `cat_${timestamp}_${randomPart}`;
}

// Функция удаления категории
function deleteCategory(categoryId) {
    // Переводим задачи этой категории в категорию по умолчанию
    tasks.active.forEach(task => {
        if (task.category === categoryId) task.category = defaultCategoryId;
    });
    tasks.completed.forEach(task => {
        if (task.category === categoryId) task.category = defaultCategoryId;
    });

    // Удаляем категорию
    delete categories[categoryId];

    saveTasks();
    saveCategories();
    updateUI();
}

// Функция добавления новой задачи
function addTask() {

    // Создаем элемент списка и присваимаем ему класс
    const newTask = document.createElement('li');
    newTask.className = "task new-task";

    // Преобразуем объект категорий в массив для рендеринга options
    const categoryOptions = Object.values(categories).map(cat =>
        `<option class="new-task-category-option" value="${cat.id}">${cat.name}</option>`
    ).join('');

    // Создаем "форму" для создания новой задачи
    newTask.innerHTML = `
        <div class="task-title-wrapper">
            <img class="new-task-ico" src="img/task-ico.png" alt="check">
            <select class="new-task-category">
                ${categoryOptions}
            </select>
            <input class="new-task-title" type="text" name="new-task-title" maxlength="100">
        </div>
        <input type="date" class="new-task-due-date">
    `;

    // Добавляем "форму" создания задачи в начало списка текущих задач
    const taskList = document.querySelector('#current-tasks-list');
    taskList.prepend(newTask);

    // Фокусируемся и создаем обработчики для сохранения введенного названия новой задачи
    const newTitle = newTask.querySelector('.new-task-title');
    newTitle.focus();

    newTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            newTitle.blur();
        }
    });

    newTitle.addEventListener('blur', (e) => {
        const selectCat = newTask.querySelector('.new-task-category');
        const dueDateInput = newTask.querySelector('.new-task-due-date');

        if (e.relatedTarget === selectCat || e.relatedTarget === dueDateInput) {
            newTitle.focus();
            return;
        }

        if (newTitle.value) {
            const taskTitleText = newTitle.value;
            const taskDesc = '';
            const taskCategory = newTask.querySelector('.new-task-category').value;
            const dueDate = dueDateInput.value || null;

            tasks.active.unshift({
                title: taskTitleText,
                description: taskDesc,
                category: taskCategory,
                dueDate: dueDate,
                originalPosition: tasks.active.length
            });

            updateUI();
        } else {
            newTask.remove();
        }
    });
};

// Функция сохранения задач
function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
    localStorage.setItem('todoCategories', JSON.stringify(categories));
}

// Функция редактирования задачи
function changeTask(event) {
    const currentTaskWr = event.target.closest('.task');
    const currentTask = currentTaskWr.querySelector('.task-title-wrapper');
    const currentTaskTitle = currentTask.querySelector('.task-title');
    const currentTaskCategory = currentTask.querySelector('.task-category');

    const redactButton = currentTask.querySelector('.task-change');
    redactButton.classList.toggle('hidden');

    const isInput = currentTask.querySelector('.task-title-input');
    if (!isInput) {
        const currentTitleText = currentTaskTitle.innerText;
        const currentCategoryId = currentTaskWr.dataset.category ||
            getCategoryIdByName(currentTaskCategory.textContent.trim()) ||
            defaultCategoryId;

        currentTaskTitle.remove();
        currentTaskCategory.remove();

        const categorySelect = document.createElement('select');
        categorySelect.className = 'task-category-select';

        Object.values(categories).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (cat.id === currentCategoryId) option.selected = true;
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
        let newCategory = currentCategoryId;
        let newTitle = currentTitleText;

        const saveChanges = () => {
            if (isSaved) return;
            isSaved = true;

            const taskElement = event.target.closest('.task');
            const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);

            if (taskElement.classList.contains('completed-task')) {
                tasks.completed[taskIndex].title = newTitle;
                tasks.completed[taskIndex].category = newCategory;
            } else {
                tasks.active[taskIndex].title = newTitle;
                tasks.active[taskIndex].category = newCategory;
            }

            updateUI();
        };

        taskTitleInput.addEventListener('input', (e) => {
            newTitle = e.target.value;
        });

        categorySelect.addEventListener('change', (e) => {
            newCategory = e.target.value;
        });

        const handleBlur = (e) => {
            if (e.relatedTarget === categorySelect) {
                taskTitleInput.focus();
                return;
            }
            saveChanges();
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                saveChanges();
            }
        };

        taskTitleInput.addEventListener('blur', handleBlur);
        taskTitleInput.addEventListener('keydown', handleKeyDown);

        document.addEventListener('click', function outsideClick(e) {
            if (!currentTask.contains(e.target) && e.target !== redactButton) {
                saveChanges();
                document.removeEventListener('click', outsideClick);
            }
        }, { once: true });
    }
};

// Функция сортировки задач по дату
function sortTasksByDate(tasksArray) {
    const sortType = document.getElementById('date-sort').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Убираем время для сравнения

    if (sortType === 'none') {
        return tasksArray;
    }

    // Разделяем задачи на те, у которых есть дата и нет
    const tasksWithDate = tasksArray.filter(task => task.dueDate);
    const tasksWithoutDate = tasksArray.filter(task => !task.dueDate);

    // Сортируем только задачи с датой
    const sortedTasks = [...tasksWithDate].sort((a, b) => {
        const aDate = new Date(a.dueDate);
        aDate.setHours(0, 0, 0, 0);
        const bDate = new Date(b.dueDate);
        bDate.setHours(0, 0, 0, 0);

        // Для сортировки по близости к текущей дате
        if (sortType === 'nearest' || sortType === 'farthest') {
            const aDiff = Math.abs(aDate - today);
            const bDiff = Math.abs(bDate - today);

            return sortType === 'nearest' ? aDiff - bDiff : bDiff - aDiff;
        }
        // Для простой сортировки по дате
        else {
            return sortType === 'asc' ? aDate - bDate : bDate - aDate;
        }
    });

    // Возвращаем отсортированные задачи с датой + задачи без даты
    return [...sortedTasks, ...tasksWithoutDate];
}

// Вспомогательная функция для поиска ID категории по имени
function getCategoryIdByName(name) {
    for (const [id, category] of Object.entries(categories)) {
        if (category.name === name) return id;
    }
    return null;
}

// Функция инициализации редактора описания
function initEditorForTask(taskElement) {
    if (!taskElement) return; // Защита от null

    const index = taskElement.dataset.originalIndex;
    const isCompleted = taskElement.classList.contains('completed-task');
    const task = isCompleted ? tasks.completed[index] : tasks.active[index];

    if (!task) return; // Защита от несуществующей задачи

    const editorId = `editor-${index}`;
    const editorContainer = taskElement.querySelector(`#${editorId}`);
    const textDescription = taskElement.querySelector('.task-description-text');
    const editorButtons = taskElement.querySelector('.editor-buttons');

    // Проверяем существование всех необходимых элементов
    if (!editorContainer || !textDescription || !editorButtons) return;

    // Если редактор уже инициализирован, просто показываем его
    if (activeEditors[editorId]) {
        editorContainer.classList.remove('hidden');
        editorButtons.classList.remove('hidden');
        textDescription.classList.add('hidden');
        return;
    }

    // Скрываем текстовое описание и показываем редактор
    textDescription.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    editorButtons.classList.remove('hidden');

    try {
        const editor = new toastui.Editor({
            el: editorContainer,
            initialValue: task.description || '',
            previewStyle: 'tab',
            height: 'auto',
            minHeight: '100px',
            initialEditType: 'wysiwyg',
            hideModeSwitch: true,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task'],
                ['link'],
            ]
        });

        // Сохраняем ссылку на редактор
        activeEditors[editorId] = editor;
    } catch (e) {
        console.error('Ошибка при инициализации редактора:', e);
        // Восстанавливаем исходное состояние при ошибке
        textDescription.classList.remove('hidden');
        editorContainer.classList.add('hidden');
        editorButtons.classList.add('hidden');
    }
}

// Функция сохранения описания
function saveTaskDescription(event) {
    const taskElement = event.target.closest('.task');
    if (!taskElement) return;

    const index = parseInt(taskElement.dataset.originalIndex);
    if (isNaN(index)) return;

    const isCompleted = taskElement.classList.contains('completed-task');
    const editorId = `editor-${index}`;
    const editor = activeEditors[editorId];

    if (!editor) return;

    const editorContainer = taskElement.querySelector(`#${editorId}`);
    const textDescription = taskElement.querySelector('.task-description-text');
    const editorButtons = taskElement.querySelector('.editor-buttons');

    if (!editorContainer || !textDescription || !editorButtons) return;

    try {
        const newDescription = editor.getMarkdown();

        if (isCompleted) {
            if (tasks.completed[index]) {
                tasks.completed[index].description = newDescription;
            }
        } else {
            if (tasks.active[index]) {
                tasks.active[index].description = newDescription;
            }
        }

        saveTasks();

        // Обновляем текстовое представление
        textDescription.innerHTML = newDescription || 'Нет описания';
        textDescription.classList.remove('hidden');
        editorContainer.classList.add('hidden');
        editorButtons.classList.add('hidden');

        // Уничтожаем редактор
        destroyEditor(editorId);
    } catch (e) {
        console.error('Ошибка при сохранении описания:', e);
    }
}

// Функция отмены редактирования описания
function cancelTaskDescriptionEditing(event) {
    const taskElement = event.target.closest('.task');
    if (!taskElement) return;

    const index = parseInt(taskElement.dataset.originalIndex);
    if (isNaN(index)) return;

    const editorId = `editor-${index}`;
    const editorContainer = taskElement.querySelector(`#${editorId}`);
    const textDescription = taskElement.querySelector('.task-description-text');
    const editorButtons = taskElement.querySelector('.editor-buttons');

    if (!editorContainer || !textDescription || !editorButtons) return;

    // Возвращаем текстовое представление
    textDescription.classList.remove('hidden');
    editorContainer.classList.add('hidden');
    editorButtons.classList.add('hidden');

    // Уничтожаем редактор
    destroyEditor(editorId);
}

// Функция, которая убирает текстовый редактор описания
function destroyEditor(editorId) {
    if (!editorId || !activeEditors[editorId]) return;

    try {
        activeEditors[editorId].destroy();
        delete activeEditors[editorId];
    } catch (e) {
        console.error('Ошибка при уничтожении редактора:', e);
    }
}

// Функция изменения даты у задачи
function changeTaskDate(event) {
    const taskElement = event.target.closest('.task');
    if (!taskElement) return; // Защита от null

    const dateWrapper = taskElement.querySelector('.task-date-wrapper');
    if (!dateWrapper) return; // Защита от null

    const currentDateSpan = dateWrapper.querySelector('.task-due-date');
    const changeDateBtn = dateWrapper.querySelector('.task-change-date');
    if (!currentDateSpan || !changeDateBtn) return; // Защита от null

    const originalDate = currentDateSpan.textContent;

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'task-date-input';

    if (originalDate !== 'Без срока') {
        const [day, month, year] = originalDate.split('.');
        dateInput.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    currentDateSpan.replaceWith(dateInput);
    changeDateBtn.classList.add('hidden');

    dateInput.focus();

    const saveDate = () => {
        const newDate = dateInput.value || null;
        const taskIndex = parseInt(taskElement.dataset.originalIndex);
        const isCompleted = taskElement.classList.contains('completed-task');

        if (isCompleted) {
            if (tasks.completed[taskIndex]) {
                tasks.completed[taskIndex].dueDate = newDate;
            }
        } else {
            if (tasks.active[taskIndex]) {
                tasks.active[taskIndex].dueDate = newDate;
            }
        }

        saveTasks();
        renderTasks();

        // Удаляем обработчик после сохранения
        document.removeEventListener('click', handleOutsideClick);
    };

    const cancelDateEdit = () => {
        const newSpan = document.createElement('span');
        newSpan.className = 'task-due-date';
        newSpan.textContent = originalDate;

        dateInput.replaceWith(newSpan);
        changeDateBtn.classList.remove('hidden');

        // Удаляем обработчик после отмены
        document.removeEventListener('click', handleOutsideClick);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveDate();
        } else if (e.key === 'Escape') {
            cancelDateEdit();
        }
    };

    const handleOutsideClick = (e) => {
        if (!dateWrapper.contains(e.target) && e.target !== changeDateBtn) {
            saveDate();
        }
    };

    dateInput.addEventListener('blur', saveDate);
    dateInput.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleOutsideClick);
}

// Функция для форматирование даты для отображения
function formatDate(dateString) {
    if (!dateString) return 'Без срока';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Функция удаления задачи
function deleteTask(event) {
    // Получение задачи, у которой была нажата кнопка
    const taskElement = event.target.closest('.task');
    const taskList = taskElement.parentNode;
    const isCompleted = taskElement.classList.contains('completed-task');

    const taskIndex = Array.from(taskList.children).indexOf(taskElement);
    if (isCompleted) {
        tasks.completed.splice(taskIndex, 1);
    } else {
        tasks.active.splice(taskIndex, 1);
    }

    updateUI();
};

// Функция отметки задачи как выполненной/невыполненной
function completeTask(event) {

    // Получаем задачу, у которой нажата кнопка "отметки выполнения"
    const currentTask = event.target.closest('.task');
    if (!currentTask) return;

    // Сохраняем все параметры задачи
    const originalIndex = parseInt(currentTask.dataset.originalIndex);
    const isCompleted = currentTask.dataset.isCompleted === 'true';
    const now = Date.now();

    try {
        if (isCompleted) {
            // Перемещаем из выполненных в активные
            const task = tasks.completed[originalIndex];
            if (task) {
                // Восстанавливаем позицию
                const originalPos = task.originalPosition !== undefined ?
                    Math.min(task.originalPosition, tasks.active.length) : 0;

                tasks.active.splice(originalPos, 0, task);
                tasks.completed.splice(originalIndex, 1);
            }
        } else {
            // Перемещаем из активных в выполненные
            const task = tasks.active[originalIndex];
            if (task) {
                // Сохраняем текущую позицию
                task.originalPosition = originalIndex;
                task.lastStatusChange = now;
                tasks.completed.unshift(task);
                tasks.active.splice(originalIndex, 1);
            }
        }

        updateUI();

    } catch (e) {
        console.error('Ошибка при перемещении задачи:', e);
    }
};

// Функция инициализации диаграммы
function initPieChart() {
    const ctx = document.getElementById('pieChart').getContext('2d');

    // Если диаграмма уже существует, уничтожаем ее
    if (pieChart) {
        pieChart.destroy();
    }

    // Получаем данные для выбранного типа диаграммы
    const { labels, data, backgroundColors } = getChartData(currentChartType);

    // Создает новую диаграмму
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
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

    updateChartLegend(labels, backgroundColors, data);
}

// Функция для получения данных в зависимости от типа диаграммы
function getChartData(type) {
    switch (type) {
        case CHART_TYPES.COMPLETION:
            return {
                labels: ['Завершённые', 'Активные'],
                data: [tasks.completed.length, tasks.active.length],
                backgroundColors: ['#4CAF50', '#9E9E9E']
            };

        case CHART_TYPES.COMPLETED_BY_CATEGORY:
            return getDataByCategory(true);

        case CHART_TYPES.ACTIVE_BY_CATEGORY:
            return getDataByCategory(false);

        default:
            return getChartData(CHART_TYPES.COMPLETION);
    }
}

// Функция для получения данных по категориям
function getDataByCategory(completed) {
    const taskList = completed ? tasks.completed : tasks.active;
    const categoryCounts = {};

    // Считаем задачи по категориям
    taskList.forEach(task => {
        const categoryId = task.category || defaultCategoryId;
        categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    });

    // Формируем данные для диаграммы
    const labels = [];
    const data = [];
    const backgroundColors = [];

    Object.keys(categories).forEach(categoryId => {
        if (categoryCounts[categoryId]) {
            labels.push(categories[categoryId].name);
            data.push(categoryCounts[categoryId]);
            backgroundColors.push(categories[categoryId].color);
        }
    });

    return { labels, data, backgroundColors };
}

// Функция для обновления легенды
function updateChartLegend(labels, colors, data) {
    const legendContainer = document.getElementById('chart-legend');
    legendContainer.innerHTML = '';

    let total = 0;

    labels.forEach((label, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';

        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${colors[index]}"></span>
            <span class="legend-text">${label}: ${data[index]}</span>
        `;

        legendContainer.appendChild(legendItem);
        total += data[index];
    });

    // Добавляем итоговую строку
    const totalItem = document.createElement('div');
    totalItem.className = 'legend-item total';
    totalItem.innerHTML = `<span class="legend-text">Всего: ${total}</span>`;
    legendContainer.appendChild(totalItem);
}

// Функция обновления статистики на вкладке "статистика"
function updateStats() {
    // Проверяем, существует ли диаграмма и активна ли вкладка статистики
    const statsTabActive = document.getElementById('statistics').classList.contains('active');

    // Обновляем счетчики только если они видны
    if (statsTabActive) {
        const completedCount = tasks.completed.length;
        const activeCount = tasks.active.length;
        const totalCount = completedCount + activeCount;

        // Проверяем существование элементов перед обновлением
        const completedElement = document.getElementById('completed-count');
        const activeElement = document.getElementById('active-count');
        const totalElement = document.getElementById('total-count');

        if (completedElement) completedElement.textContent = completedCount;
        if (activeElement) activeElement.textContent = activeCount;
        if (totalElement) totalElement.textContent = totalCount;

        // Если диаграмма активна - обновляем ее
        if (pieChart) {
            const { labels, data, backgroundColors } = getChartData(currentChartType);

            pieChart.data.labels = labels;
            pieChart.data.datasets[0].data = data;
            pieChart.data.datasets[0].backgroundColor = backgroundColors;
            pieChart.update();

            updateChartLegend(labels, backgroundColors, data);
        }
    }

    if (document.getElementById('statistics').classList.contains('active')) {
        updateProductivityChart();
    }
}

// Функция для инициализации графика продуктивности
function initProductivityChart() {
    const ctx = document.getElementById('productivityChart').getContext('2d');

    // Если график уже есть, то уничтожаем его
    if (productivityChart) {
        productivityChart.destroy();
    }

    // Получаем данные для графика
    const { labels, data } = getProductivityData();

    productivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: data,
                backgroundColor: '#4CAF50',
                borderColor: '#388E3C',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Количество задач'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                }
            }
        }
    });
}

// Функция для получения данных продуктивности
function getProductivityData() {
    const periodSelect = document.getElementById('productivity-period');
    const period = periodSelect.value;

    let startDate, endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // Конец дня

    if (period === PRODUCTIVITY_PERIODS.CUSTOM) {
        const startDateStr = document.getElementById('productivity-start-date').value;
        const endDateStr = document.getElementById('productivity-end-date').value;

        if (!startDateStr || !endDateStr) {
            // Если даты не выбраны, используем последние 7 дней по умолчанию
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(startDateStr);
            endDate = new Date(endDateStr);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }
    } else {
        const days = parseInt(period);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);
    }

    // Создаем массив дат для отображения
    const dateArray = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Подготавливаем данные для графика
    const labels = dateArray.map(date => formatDateForChart(date));
    const data = dateArray.map(date => {
        return tasks.completed.filter(task => {
            if (!task.lastStatusChange) return false;
            const taskDate = new Date(task.lastStatusChange);
            return taskDate >= date && taskDate < new Date(date.getTime() + 24 * 60 * 60 * 1000);
        }).length;
    });

    return { labels, data };
}

// Форматирование даты для графика
function formatDateForChart(date) {
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
    });
}

// Обновление графика продуктивности
function updateProductivityChart() {
    if (document.getElementById('statistics').classList.contains('active')) {
        initProductivityChart();
    }
}

// Функция инициализации модального окна экспорта
function initExportModal() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Экспорт задач в PDF</h3>
            
            <div class="export-options">
                <label>Тип экспорта:</label>
                <select id="export-type">
                    <option value="${EXPORT_TYPES.SELECTED}">Только выбранные задачи</option>
                    <option value="${EXPORT_TYPES.ALL_TASKS}">Все задачи</option>
                    <option value="${EXPORT_TYPES.ALL_COMPLETED}">Все выполненные</option>
                    <option value="${EXPORT_TYPES.ALL_ACTIVE}">Все невыполненные</option>
                    <option value="${EXPORT_TYPES.BY_DATE_RANGE}">Задачи за период</option>
                </select>
                
                <div id="date-range-options" class="hidden">
                    <label>Период:</label>
                    <input type="date" id="export-start-date">
                    <span>по</span>
                    <input type="date" id="export-end-date">
                </div>
                
                <div id="selected-tasks-container">
                    <label>Выберите задачи для экспорта:</label>
                    <div id="selected-tasks-list" class="export-tasks-list"></div>
                </div>
                
                <div class="export-chart-options">
                    <label>Добавить диаграмму:</label>
                    <select id="export-chart-type">
                        <option value="${EXPORT_CHART_TYPES.NONE}">Нет</option>
                        <option value="${EXPORT_CHART_TYPES.COMPLETION}">Выполненные/Невыполненные</option>
                        <option value="${EXPORT_CHART_TYPES.BY_CATEGORY}">По категориям</option>
                    </select>
                </div>
                
                <div class="export-productivity-options">
                    <label>Добавить график продуктивности:</label>
                    <select id="export-productivity-type">
                        <option value="${EXPORT_PRODUCTIVITY_TYPES.NONE}">Нет</option>
                        <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_7_DAYS}">Последние 7 дней</option>
                        <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_14_DAYS}">Последние 14 дней</option>
                        <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_30_DAYS}">Последние 30 дней</option>
                        <option value="${EXPORT_PRODUCTIVITY_TYPES.CUSTOM}">Выбрать период</option>
                    </select>
                    
                    <div id="export-productivity-custom" class="hidden">
                        <label>Период:</label>
                        <input type="date" id="export-productivity-start-date">
                        <span>по</span>
                        <input type="date" id="export-productivity-end-date">
                    </div>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button id="generate-pdf-btn">Сгенерировать PDF</button>
                <button id="close-export-modal">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Сразу рендерим список задач для выбора
    renderTasksForExportSelection();

    // Добавляем обработчики событий для модального окна
    document.getElementById('export-type').addEventListener('change', (e) => {
        const type = e.target.value;
        document.getElementById('date-range-options').classList.toggle('hidden', type !== EXPORT_TYPES.BY_DATE_RANGE);
        document.getElementById('selected-tasks-container').classList.toggle('hidden', type !== EXPORT_TYPES.SELECTED);

        if (type === EXPORT_TYPES.SELECTED) {
            renderTasksForExportSelection();
        }
    });

    // Обработчик для выбора "типа" рафика продуктивности
    document.getElementById('export-productivity-type').addEventListener('change', (e) => {
        const type = e.target.value;
        document.getElementById('export-productivity-custom').classList.toggle('hidden', type !== EXPORT_PRODUCTIVITY_TYPES.CUSTOM);
    });

    // Обработчик для кнопки создания пдф, с ожидаением генерации файла
    document.getElementById('generate-pdf-btn').addEventListener('click', async () => {
        try {
            await generatePdf();
        } catch (error) {
            console.error('Ошибка при генерации PDF:', error);
            alert('Произошла ошибка при генерации PDF. Пожалуйста, попробуйте еще раз.');
        }
    });

    // Обработчики для закрытия окна
    document.getElementById('close-export-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Функция для отображения задач для выбора при экспорте
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

// Функция для получения задач в зависимости от выбранного типа экспорта
function getTasksForExport() {
    const exportType = document.getElementById('export-type').value;

    switch (exportType) {
        case EXPORT_TYPES.SELECTED:
            return getSelectedTasks();
        case EXPORT_TYPES.ALL_COMPLETED:
            return { active: [], completed: [...tasks.completed] };
        case EXPORT_TYPES.ALL_ACTIVE:
            return { active: [...tasks.active], completed: [] };
        case EXPORT_TYPES.ALL_TASKS:
            return { active: [...tasks.active], completed: [...tasks.completed] };
        case EXPORT_TYPES.BY_DATE_RANGE:
            return getTasksByDateRange();
        default:
            return { active: [], completed: [] };
    }
}

// Функция для получения выбранных задач
function getSelectedTasks() {
    const checkboxes = document.querySelectorAll('.export-task-checkbox:checked');
    const selectedTasks = { active: [], completed: [] };

    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        const type = checkbox.dataset.type;

        if (type === 'active' && tasks.active[index]) {
            selectedTasks.active.push(tasks.active[index]);
        } else if (type === 'completed' && tasks.completed[index]) {
            selectedTasks.completed.push(tasks.completed[index]);
        }
    });

    return selectedTasks;
}

// Функция для получения задач за определенный период
function getTasksByDateRange() {
    const startDateStr = document.getElementById('export-start-date').value;
    const endDateStr = document.getElementById('export-end-date').value;

    if (!startDateStr || !endDateStr) {
        return { active: [], completed: [] };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const filteredTasks = { active: [], completed: [] };

    // Фильтруем активные задачи
    filteredTasks.active = tasks.active.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= startDate && taskDate <= endDate;
    });

    // Фильтруем выполненные задачи
    filteredTasks.completed = tasks.completed.filter(task => {
        if (!task.lastStatusChange) return false;
        const taskDate = new Date(task.lastStatusChange);
        return taskDate >= startDate && taskDate <= endDate;
    });

    return filteredTasks;
}

// Функция генерации PDF
async function generatePdf() {
    // Получаем задачи для экспорта
    const exportTasks = getTasksForExport();

    // Создаем документ
    const docDefinition = {
        content: [],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 10]
            },
            subheader: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            taskTitle: {
                fontSize: 12,
                bold: true,
                margin: [0, 5, 0, 2]
            },
            taskDescription: {
                fontSize: 10,
                margin: [10, 0, 0, 5],
                color: '#555'
            },
            taskDate: {
                fontSize: 10,
                margin: [0, 0, 0, 5],
                color: '#777'
            },
            categoryLabel: {
                fontSize: 10,
                margin: [0, 0, 0, 5],
                color: '#444'
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    // Добавляем заголовок
    docDefinition.content.push({
        text: 'Список задач',
        style: 'header'
    });

    // Добавляем дату генерации
    docDefinition.content.push({
        text: `Сгенерировано: ${new Date().toLocaleString('ru-RU')}`,
        fontSize: 10,
        color: '#999',
        margin: [0, 0, 0, 20]
    });

    // Добавляем активные задачи
    if (exportTasks.active.length > 0) {
        docDefinition.content.push({
            text: 'Активные задачи',
            style: 'subheader'
        });

        exportTasks.active.forEach(task => {
            addTaskToPdf(docDefinition, task, false);
        });
    }

    // Добавляем выполненные задачи
    if (exportTasks.completed.length > 0) {
        docDefinition.content.push({
            text: 'Выполненные задачи',
            style: 'subheader'
        });

        exportTasks.completed.forEach(task => {
            addTaskToPdf(docDefinition, task, true);
        });
    }

    // Добавляем статистику
    docDefinition.content.push({
        text: 'Статистика',
        style: 'subheader',
        pageBreak: 'before'
    });

    const totalTasks = exportTasks.active.length + exportTasks.completed.length;
    docDefinition.content.push({
        text: `Всего задач: ${totalTasks}`,
        margin: [0, 0, 0, 5]
    });

    docDefinition.content.push({
        text: `Активных: ${exportTasks.active.length}`,
        margin: [0, 0, 0, 5]
    });

    docDefinition.content.push({
        text: `Выполненных: ${exportTasks.completed.length}`,
        margin: [0, 0, 0, 20]
    });

    // Добавляем диаграмму, если выбрано
    const chartType = document.getElementById('export-chart-type').value;
    if (chartType !== EXPORT_CHART_TYPES.NONE && totalTasks > 0) {
        await addChartToPdf(docDefinition, exportTasks, chartType);
    }

    // Добавляем график продуктивности, если выбрано
    const productivityType = document.getElementById('export-productivity-type').value;
    if (productivityType !== EXPORT_PRODUCTIVITY_TYPES.NONE) {
        await addProductivityChartToPdf(docDefinition, productivityType);
    }

    // Генерируем PDF
    pdfMake.createPdf(docDefinition).download('tasks_export.pdf');

    // Закрываем модальное окно
    document.querySelector('.export-modal')?.remove();
}

// Функция для добавления задачи в PDF
function addTaskToPdf(docDefinition, task, isCompleted) {
    const category = categories[task.category] || categories[defaultCategoryId];

    docDefinition.content.push({
        text: task.title || 'Без названия',
        style: 'taskTitle'
    });

    docDefinition.content.push({
        text: `Категория: ${category.name}`,
        style: 'categoryLabel',
        color: category.color
    });

    if (task.dueDate) {
        docDefinition.content.push({
            text: `Срок: ${formatDate(task.dueDate)}`,
            style: 'taskDate'
        });
    }

    if (task.description) {
        docDefinition.content.push({
            text: task.description,
            style: 'taskDescription'
        });
    }

    docDefinition.content.push({
        text: `Статус: ${isCompleted ? 'Выполнена' : 'Активна'}`,
        style: 'taskDate',
        margin: [0, 0, 0, 10]
    });

    docDefinition.content.push({
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eee' }],
        margin: [0, 5, 0, 5]
    });
}

// Функция для добавления диаграммы в PDF
async function addChartToPdf(docDefinition, exportTasks, chartType) {
    // Создаем данные для диаграммы
    let chartData;
    let chartTitle;

    if (chartType === EXPORT_CHART_TYPES.COMPLETION) {
        chartTitle = 'Соотношение выполненных и активных задач';
        chartData = {
            labels: ['Выполненные', 'Активные'],
            datasets: [
                {
                    data: [exportTasks.completed.length, exportTasks.active.length],
                    backgroundColor: ['#4CAF50', '#FF9800']
                }
            ]
        };
    } else if (chartType === EXPORT_CHART_TYPES.BY_CATEGORY) {
        chartTitle = 'Распределение задач по категориям';

        // Собираем данные по категориям
        const categoryCounts = {};
        const categoryColors = {};

        // Обрабатываем активные задачи
        exportTasks.active.forEach(task => {
            const categoryId = task.category || defaultCategoryId;
            categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
            if (!categoryColors[categoryId]) {
                categoryColors[categoryId] = categories[categoryId]?.color || '#607D8B';
            }
        });

        // Обрабатываем выполненные задачи
        exportTasks.completed.forEach(task => {
            const categoryId = task.category || defaultCategoryId;
            categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
            if (!categoryColors[categoryId]) {
                categoryColors[categoryId] = categories[categoryId]?.color || '#607D8B';
            }
        });

        // Формируем данные для диаграммы
        const labels = [];
        const data = [];
        const backgroundColors = [];

        Object.keys(categoryCounts).forEach(categoryId => {
            const category = categories[categoryId] || categories[defaultCategoryId];
            labels.push(category.name);
            data.push(categoryCounts[categoryId]);
            backgroundColors.push(categoryColors[categoryId]);
        });

        chartData = {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: backgroundColors
                }
            ]
        };
    }

    // Добавляем заголовок диаграммы
    docDefinition.content.push({
        text: chartTitle,
        style: 'subheader',
        margin: [0, 20, 0, 10]
    });

    try {
        // Получаем изображение диаграммы
        const chartImage = await getChartImage(chartData);

        // Добавляем саму диаграмму
        docDefinition.content.push({
            image: chartImage,
            width: 400,
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });

        // Добавляем легенду
        const legendItems = [];
        chartData.labels.forEach((label, index) => {
            legendItems.push({
                text: `${label}: ${chartData.datasets[0].data[index]}`,
                margin: [0, 0, 0, 5]
            });
        });

        docDefinition.content.push({
            stack: legendItems,
            margin: [50, 0, 0, 20]
        });
    } catch (error) {
        console.error('Ошибка при создании диаграммы:', error);
        docDefinition.content.push({
            text: 'Не удалось создать диаграмму',
            color: 'red',
            margin: [0, 0, 0, 20]
        });
    }
}

// Функция для добавления графика продуктивности в PDF
async function addProductivityChartToPdf(docDefinition, productivityType) {
    let startDate, endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (productivityType === EXPORT_PRODUCTIVITY_TYPES.CUSTOM) {
        const startDateStr = document.getElementById('export-productivity-start-date').value;
        const endDateStr = document.getElementById('export-productivity-end-date').value;

        if (!startDateStr || !endDateStr) {
            // Если даты не выбраны, используем последние 7 дней по умолчанию
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(startDateStr);
            endDate = new Date(endDateStr);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }
    } else {
        const days = parseInt(productivityType);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);
    }

    // Создаем массив дат для отображения
    const dateArray = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Подготавливаем данные для графика
    const labels = dateArray.map(date => formatDateForChart(date));
    const data = dateArray.map(date => {
        return tasks.completed.filter(task => {
            if (!task.lastStatusChange) return false;
            const taskDate = new Date(task.lastStatusChange);
            return taskDate >= date && taskDate < new Date(date.getTime() + 24 * 60 * 60 * 1000);
        }).length;
    });

    // Добавляем заголовок графика
    docDefinition.content.push({
        text: 'График продуктивности',
        style: 'subheader',
        margin: [0, 20, 0, 10]
    });

    // Добавляем описание периода
    docDefinition.content.push({
        text: `Период: с ${formatDate(startDate.toISOString())} по ${formatDate(endDate.toISOString())}`,
        margin: [0, 0, 0, 10]
    });

    // Создаем данные для графика
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Выполнено задач',
                data: data,
                backgroundColor: '#4CAF50',
                borderColor: '#388E3C',
                borderWidth: 1
            }
        ]
    };

    try {
        // Получаем изображение графика
        const chartImage = await getBarChartImage(chartData);

        // Добавляем сам график
        docDefinition.content.push({
            image: chartImage,
            width: 500,
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });
    } catch (error) {
        console.error('Ошибка при создании графика продуктивности:', error);
        docDefinition.content.push({
            text: 'Не удалось создать график продуктивности',
            color: 'red',
            margin: [0, 0, 0, 20]
        });
    }
}

// Функция для создания изображения круговой диаграммы
function getChartImage(chartData) {
    return new Promise((resolve) => {
        // Создаем временный canvas
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // Создаем диаграмму
        new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                responsive: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                animation: {
                    onComplete: () => {
                        // После завершения анимации получаем данные изображения
                        const image = canvas.toDataURL('image/png');
                        resolve(image);
                    }
                }
            }
        });
    });
}

// Функция для создания изображения столбчатой диаграммы
function getBarChartImage(chartData) {
    return new Promise((resolve) => {
        // Создаем временный canvas
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        // Создаем диаграмму
        new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                animation: {
                    onComplete: () => {
                        // После завершения анимации получаем данные изображения
                        const image = canvas.toDataURL('image/png');
                        resolve(image);
                    }
                }
            }
        });
    });
}
