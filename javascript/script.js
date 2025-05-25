import ToastUIEditor from '@toast-ui/editor';
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
const db = require('./db-client');

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
const defaultCategoryId = 1; // ID категории "Общее" из базы данных

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

// Текущий пользователь (временно)
let currentUserId = 1;

// Обработчик переключения пользователя
document.getElementById('switch-user').addEventListener('click', async () => {
    currentUserId = currentUserId === 1 ? 2 : 1;
    document.getElementById('switch-user').textContent = `Переключить пользователя (ID: ${currentUserId})`;
    await loadUserData();
});

// Функция загрузки данных пользователя
async function loadUserData() {
    try {
        const [userCategories, userTasks] = await Promise.all([
            db.getUserCategories(currentUserId),
            db.getUserTasks(currentUserId)
        ]);

        // Преобразуем категории в нужный формат
        categories = {};
        userCategories.forEach(category => {
            categories[category.id] = {
                id: category.id,
                name: category.name,
                color: category.color
            };
        });

        // Убедимся, что категория по умолчанию существует
        if (!categories[defaultCategoryId]) {
            categories[defaultCategoryId] = {
                id: defaultCategoryId,
                name: 'Общее',
                color: '#607D8B'
            };
        }

        // Преобразуем задачи в нужный формат
        tasks = {
            active: [],
            completed: []
        };

        userTasks.forEach(task => {
            const taskObj = {
                id: task.id,
                title: task.title,
                description: task.description,
                category_id: task.category_id,
                dueDate: task.due_date,
                originalPosition: task.original_position
            };

            if (task.is_completed) {
                tasks.completed.push(taskObj);
            } else {
                tasks.active.push(taskObj);
            }
        });

        updateUI();
    } catch (err) {
        console.error('Ошибка при загрузке данных пользователя:', err);
    }
}

//-----------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------
// Функции

// Главная функция всей программы. Инициализация компонентов и присваивание событий
const init = async () => {
    await loadUserData();
    initTabs();
    setupDragAndDrop();

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
async function updateTaskOrder(list) {
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

    try {
        // Обновляем позиции в базе данных
        await db.updateTaskPositions(newTaskArray.map((task, index) => ({
            id: task.id,
            position: index
        })));
    } catch (err) {
        console.error('Ошибка при обновлении позиций задач:', err);
    }

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
            const taskCategory = task.category_id || defaultCategoryId;
            if (parseInt(taskCategory) !== parseInt(currentCategoryFilter)) return false;
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

    const categoryId = parseInt(task.category_id) || defaultCategoryId;
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
        categoryElement.querySelector('.category-name').addEventListener('change', async (e) => {
            try {
                await updateCategory(category.id, e.target.value, category.color);
            } catch (err) {
                e.target.value = category.name; // Возвращаем старое значение при ошибке
            }
        });

        // Обработчик события для изменения цвета категории
        categoryElement.querySelector('.category-color-picker').addEventListener('input', async (e) => {
            try {
                await updateCategory(category.id, category.name, e.target.value);
            } catch (err) {
                e.target.value = category.color; // Возвращаем старый цвет при ошибке
            }
        });

        // Обработчик события для удаления категории
        categoryElement.querySelector('.delete-category').addEventListener('click', async () => {
            try {
                await db.deleteCategory(category.id);
                delete categories[category.id];
                renderCategoriesList(container);
                updateUI();
            } catch (err) {
                console.error('Ошибка при удалении категории:', err);
                alert('Не удалось удалить категорию');
            }
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
async function addNewCategory() {
    const categoryNumber = Object.keys(categories).length;

    // Список цветов, которые могут быть по стандарту присвоены новой категории
    const colorPalette = [
        '#FF5252', '#FFD740', '#69F0AE', '#448AFF', '#B388FF',
        '#FF80AB', '#7C4DFF', '#64FFDA', '#FF8A80', '#EA80FC',
        '#8C9EFF', '#80D8FF', '#A7FFEB', '#CCFF90', '#FFFF8D'
    ];

    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

    try {
        // Создаем новую категорию в базе данных
        const newCategory = await db.addCategory(currentUserId, `Категория-${categoryNumber}`, randomColor);

        // Добавляем категорию в локальный объект
        categories[newCategory.id] = {
            id: newCategory.id,
            name: newCategory.name,
            color: newCategory.color
        };

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
    } catch (err) {
        console.error('Ошибка при создании категории:', err);
        alert('Не удалось создать категорию');
    }
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
async function addTask() {
    const newTask = document.createElement('li');
    newTask.className = "task new-task";

    const categoryOptions = Object.values(categories).map(cat =>
        `<option class="new-task-category-option" value="${cat.id}">${cat.name}</option>`
    ).join('');

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

    const taskList = document.querySelector('#current-tasks-list');
    taskList.prepend(newTask);

    const newTitle = newTask.querySelector('.new-task-title');
    newTitle.focus();

    newTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            newTitle.blur();
        }
    });

    newTitle.addEventListener('blur', async (e) => {
        const selectCat = newTask.querySelector('.new-task-category');
        const dueDateInput = newTask.querySelector('.new-task-due-date');

        if (e.relatedTarget === selectCat || e.relatedTarget === dueDateInput) {
            newTitle.focus();
            return;
        }

        if (newTitle.value) {
            try {
                const taskTitleText = newTitle.value;
                const taskDesc = '';
                const taskCategory = newTask.querySelector('.new-task-category').value;
                const dueDate = dueDateInput.value || null;

                const newTaskData = await db.addTask(
                    currentUserId,
                    taskTitleText,
                    taskCategory,
                    taskDesc,
                    dueDate,
                    0
                );

                // Добавляем задачу в локальный массив
                tasks.active.unshift({
                    id: newTaskData.id,
                    title: taskTitleText,
                    description: taskDesc,
                    category_id: parseInt(taskCategory),
                    dueDate: dueDate,
                    originalPosition: 0
                });

                updateUI();
            } catch (err) {
                console.error('Ошибка при добавлении задачи:', err);
                alert('Не удалось добавить задачу');
            }
        }
    });
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
            if (parseInt(cat.id) === parseInt(currentCategoryId)) option.selected = true;
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

        const saveChanges = async () => {
            if (isSaved) return;
            isSaved = true;

            const taskElement = event.target.closest('.task');
            const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);

            try {
                if (taskElement.classList.contains('completed-task')) {
                    if (tasks.completed[taskIndex]) {
                        const task = tasks.completed[taskIndex];
                        await db.updateTask(task.id, {
                            title: newTitle,
                            category_id: parseInt(newCategory)
                        });
                        task.title = newTitle;
                        task.category_id = parseInt(newCategory);
                    }
                } else {
                    if (tasks.active[taskIndex]) {
                        const task = tasks.active[taskIndex];
                        await db.updateTask(task.id, {
                            title: newTitle,
                            category_id: parseInt(newCategory)
                        });
                        task.title = newTitle;
                        task.category_id = parseInt(newCategory);
                    }
                }
                updateUI();
            } catch (err) {
                console.error('Ошибка при обновлении задачи:', err);
                alert('Не удалось обновить задачу');
            }
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

// Функция для получения данных по категориям
function getDataByCategory(completed) {
    const taskList = completed ? tasks.completed : tasks.active;
    const categoryCounts = {};

    // Считаем задачи по категориям
    taskList.forEach(task => {
        const categoryId = parseInt(task.category_id) || defaultCategoryId;
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
            const categoryId = parseInt(task.category_id) || defaultCategoryId;
            categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
            if (!categoryColors[categoryId]) {
                categoryColors[categoryId] = categories[categoryId]?.color || '#607D8B';
            }
        });

        // Обрабатываем выполненные задачи
        exportTasks.completed.forEach(task => {
            const categoryId = parseInt(task.category_id) || defaultCategoryId;
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

// Функция для добавления задачи в PDF
function addTaskToPdf(docDefinition, task, isCompleted) {
    const categoryId = parseInt(task.category_id) || defaultCategoryId;
    const category = categories[categoryId] || categories[defaultCategoryId];

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

// Функция сортировки задач по дате
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

// Обновление графика продуктивности
function updateProductivityChart() {
    if (document.getElementById('statistics').classList.contains('active')) {
        initProductivityChart();
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

// Функция для инициализации круговой диаграммы
function initPieChart() {
    const ctx = document.getElementById('pieChart').getContext('2d');

    // Если диаграмма уже существует, уничтожаем её
    if (pieChart) {
        pieChart.destroy();
    }

    let chartData;
    if (currentChartType === CHART_TYPES.COMPLETION) {
        chartData = {
            labels: ['Выполненные', 'Активные'],
            datasets: [{
                data: [tasks.completed.length, tasks.active.length],
                backgroundColor: ['#4CAF50', '#FF9800']
            }]
        };
    } else if (currentChartType === CHART_TYPES.COMPLETED_BY_CATEGORY) {
        chartData = getDataByCategory(true);
    } else {
        chartData = getDataByCategory(false);
    }

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: chartData.backgroundColors || ['#4CAF50', '#FF9800']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Функция форматирования даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Функция обновления статистики
function updateStats() {
    // Обновляем счетчики задач
    const totalTasksElement = document.querySelector('.total-tasks');
    const completedTasksElement = document.querySelector('.completed-tasks');
    const activeTasksElement = document.querySelector('.active-tasks');
    const completionPercentageElement = document.querySelector('.completion-percentage');

    if (totalTasksElement) {
        totalTasksElement.textContent = tasks.active.length + tasks.completed.length;
    }
    
    if (completedTasksElement) {
        completedTasksElement.textContent = tasks.completed.length;
    }
    
    if (activeTasksElement) {
        activeTasksElement.textContent = tasks.active.length;
    }

    // Обновляем процент выполнения
    if (completionPercentageElement) {
        const totalTasks = tasks.active.length + tasks.completed.length;
        const completionPercentage = totalTasks === 0 ? 0 : Math.round((tasks.completed.length / totalTasks) * 100);
        completionPercentageElement.textContent = `${completionPercentage}%`;
    }

    // Обновляем диаграммы, если открыта вкладка статистики
    const statisticsTab = document.getElementById('statistics');
    if (statisticsTab && statisticsTab.classList.contains('active')) {
        if (typeof initPieChart === 'function') {
            initPieChart();
        }
        if (typeof updateProductivityChart === 'function') {
            updateProductivityChart();
        }
    }
}

// Функция инициализации модального окна экспорта
function initExportModal() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Экспорт задач в PDF</h3>
            
            <div class="export-section">
                <h4>Выберите задачи для экспорта:</h4>
                <select id="export-tasks-select">
                    <option value="${EXPORT_TYPES.ALL_TASKS}">Все задачи</option>
                    <option value="${EXPORT_TYPES.ALL_COMPLETED}">Все выполненные</option>
                    <option value="${EXPORT_TYPES.ALL_ACTIVE}">Все активные</option>
                    <option value="${EXPORT_TYPES.BY_DATE_RANGE}">По диапазону дат</option>
                </select>
            </div>

            <div id="date-range-selector" class="export-section hidden">
                <label>С: <input type="date" id="export-start-date"></label>
                <label>По: <input type="date" id="export-end-date"></label>
            </div>

            <div class="export-section">
                <h4>Добавить диаграмму:</h4>
                <select id="export-chart-select">
                    <option value="${EXPORT_CHART_TYPES.NONE}">Без диаграммы</option>
                    <option value="${EXPORT_CHART_TYPES.COMPLETION}">Выполненные/Активные</option>
                    <option value="${EXPORT_CHART_TYPES.BY_CATEGORY}">По категориям</option>
                </select>
            </div>

            <div class="export-section">
                <h4>Добавить график продуктивности:</h4>
                <select id="export-productivity-select">
                    <option value="${EXPORT_PRODUCTIVITY_TYPES.NONE}">Без графика</option>
                    <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_7_DAYS}">За последние 7 дней</option>
                    <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_14_DAYS}">За последние 14 дней</option>
                    <option value="${EXPORT_PRODUCTIVITY_TYPES.LAST_30_DAYS}">За последние 30 дней</option>
                </select>
            </div>

            <div class="modal-buttons">
                <button id="generate-pdf">Сгенерировать PDF</button>
                <button id="close-export-modal">Отмена</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Обработчик для выбора типа экспорта
    const exportSelect = modal.querySelector('#export-tasks-select');
    const dateRangeSelector = modal.querySelector('#date-range-selector');

    exportSelect.addEventListener('change', () => {
        dateRangeSelector.classList.toggle('hidden', exportSelect.value !== EXPORT_TYPES.BY_DATE_RANGE);
    });

    // Обработчик для кнопки генерации PDF
    modal.querySelector('#generate-pdf').addEventListener('click', () => {
        const exportType = exportSelect.value;
        const chartType = modal.querySelector('#export-chart-select').value;
        const productivityType = modal.querySelector('#export-productivity-select').value;

        let exportTasks = { active: [], completed: [] };

        // Определяем, какие задачи экспортировать
        if (exportType === EXPORT_TYPES.ALL_TASKS) {
            exportTasks = tasks;
        } else if (exportType === EXPORT_TYPES.ALL_COMPLETED) {
            exportTasks.completed = tasks.completed;
        } else if (exportType === EXPORT_TYPES.ALL_ACTIVE) {
            exportTasks.active = tasks.active;
        } else if (exportType === EXPORT_TYPES.BY_DATE_RANGE) {
            const startDate = new Date(modal.querySelector('#export-start-date').value);
            const endDate = new Date(modal.querySelector('#export-end-date').value);
            endDate.setHours(23, 59, 59, 999);

            exportTasks.active = tasks.active.filter(task => {
                const taskDate = new Date(task.dueDate);
                return taskDate >= startDate && taskDate <= endDate;
            });

            exportTasks.completed = tasks.completed.filter(task => {
                const taskDate = new Date(task.dueDate);
                return taskDate >= startDate && taskDate <= endDate;
            });
        }

        generatePDF(exportTasks, chartType, productivityType);
        modal.remove();
    });

    // Обработчик для кнопки закрытия
    modal.querySelector('#close-export-modal').addEventListener('click', () => modal.remove());

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Функция выполнения задачи
async function completeTask(event) {
    const taskElement = event.target.closest('.task');
    const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);
    const isCompleted = taskElement.classList.contains('completed-task');
    const taskArray = isCompleted ? tasks.completed : tasks.active;

    if (taskArray[taskIndex]) {
        const task = taskArray[taskIndex];
        const newStatus = !isCompleted;

        try {
            await db.updateTask(task.id, { is_completed: newStatus });

            // Обновляем локальное состояние
            if (newStatus) {
                task.lastStatusChange = new Date().toISOString();
                tasks.completed.push(task);
                tasks.active = tasks.active.filter(t => t.id !== task.id);
            } else {
                task.lastStatusChange = new Date().toISOString();
                tasks.active.push(task);
                tasks.completed = tasks.completed.filter(t => t.id !== task.id);
            }

            updateUI();
        } catch (err) {
            console.error('Ошибка при обновлении статуса задачи:', err);
            alert('Не удалось обновить статус задачи');
        }
    }
}

// Функция генерации PDF
async function generatePDF(exportTasks, chartType, productivityType) {
    const docDefinition = {
        content: [
            {
                text: 'Список задач',
                style: 'header'
            }
        ],
        styles: {
            header: {
                fontSize: 22,
                bold: true,
                margin: [0, 0, 0, 20]
            },
            subheader: {
                fontSize: 16,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            taskTitle: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            categoryLabel: {
                fontSize: 12,
                margin: [0, 0, 0, 5]
            },
            taskDate: {
                fontSize: 12,
                margin: [0, 0, 0, 5]
            },
            taskDescription: {
                fontSize: 12,
                margin: [0, 0, 0, 10]
            }
        }
    };

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

    // Добавляем диаграмму, если выбрана
    if (chartType !== EXPORT_CHART_TYPES.NONE) {
        await addChartToPdf(docDefinition, exportTasks, chartType);
    }

    // Добавляем график продуктивности, если выбран
    if (productivityType !== EXPORT_PRODUCTIVITY_TYPES.NONE) {
        await addProductivityChartToPdf(docDefinition, productivityType);
    }

    // Генерируем PDF
    pdfMake.createPdf(docDefinition).download('tasks.pdf');
}

// Функция для получения изображения диаграммы
function getChartImage(chartData) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const tempChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                responsive: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Устанавливаем размеры canvas
        canvas.width = 400;
        canvas.height = 400;

        // Перерисовываем диаграмму с новыми размерами
        tempChart.resize();

        // Получаем изображение
        const image = canvas.toDataURL('image/png');
        tempChart.destroy();

        resolve(image);
    });
}

// Функция для добавления графика продуктивности в PDF
async function addProductivityChartToPdf(docDefinition, period) {
    docDefinition.content.push({
        text: 'График продуктивности',
        style: 'subheader',
        margin: [0, 20, 0, 10]
    });

    try {
        const { labels, data } = getProductivityData();
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Выполнено задач',
                data: data,
                backgroundColor: '#4CAF50',
                borderColor: '#388E3C',
                borderWidth: 1
            }]
        };

        const chartImage = await getChartImage(chartData);

        docDefinition.content.push({
            image: chartImage,
            width: 400,
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });

        // Добавляем легенду
        const legendItems = [];
        labels.forEach((label, index) => {
            legendItems.push({
                text: `${label}: ${data[index]} задач`,
                margin: [0, 0, 0, 5]
            });
        });

        docDefinition.content.push({
            stack: legendItems,
            margin: [50, 0, 0, 20]
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

// Функция изменения даты задачи
async function changeTaskDate(event) {
    const taskElement = event.target.closest('.task');
    const dateWrapper = taskElement.querySelector('.task-date-wrapper');
    const currentDate = dateWrapper.querySelector('.task-due-date');
    const changeDateButton = dateWrapper.querySelector('.task-change-date');

    changeDateButton.classList.toggle('hidden');

    if (!dateWrapper.querySelector('.task-date-input')) {
        const currentDateText = currentDate.textContent;
        currentDate.remove();

        const dateInput = document.createElement('input');
        dateInput.setAttribute('type', 'date');
        dateInput.className = 'task-date-input';
        if (currentDateText) {
            dateInput.value = currentDateText;
        }

        dateWrapper.insertBefore(dateInput, changeDateButton);
        dateInput.focus();

        const saveDate = async () => {
            const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);
            const newDate = dateInput.value;

            try {
                if (taskElement.classList.contains('completed-task')) {
                    if (tasks.completed[taskIndex]) {
                        const task = tasks.completed[taskIndex];
                        await db.updateTask(task.id, { due_date: newDate });
                        task.dueDate = newDate;
                    }
                } else {
                    if (tasks.active[taskIndex]) {
                        const task = tasks.active[taskIndex];
                        await db.updateTask(task.id, { due_date: newDate });
                        task.dueDate = newDate;
                    }
                }
                updateUI();
            } catch (err) {
                console.error('Ошибка при обновлении даты задачи:', err);
                alert('Не удалось обновить дату задачи');
            }
        };

        dateInput.addEventListener('blur', saveDate);
        dateInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveDate();
            }
        });
    }
}

// Функция инициализации редактора описания задачи
function initEditorForTask(taskElement) {
    const descriptionContent = taskElement.querySelector('.description-content');
    const descriptionText = descriptionContent.querySelector('.task-description-text');
    const editorContainer = descriptionContent.querySelector('.task-description-editor');
    const editorButtons = taskElement.querySelector('.editor-buttons');

    // Скрываем текст и показываем редактор
    descriptionText.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    editorButtons.classList.remove('hidden');

    // Если редактор уже инициализирован для этой задачи, просто показываем его
    if (activeEditors[editorContainer.id]) {
        return;
    }

    // Создаем новый редактор
    const editor = new Editor({
        el: editorContainer,
        height: '200px',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        initialValue: descriptionText.textContent === 'Нет описания' ? '' : descriptionText.textContent
    });

    // Сохраняем редактор в объекте активных редакторов
    activeEditors[editorContainer.id] = editor;
}

// Функция удаления задачи
async function deleteTask(event) {
    const taskElement = event.target.closest('.task');
    const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);
    const isCompleted = taskElement.classList.contains('completed-task');
    const taskArray = isCompleted ? tasks.completed : tasks.active;

    if (taskArray[taskIndex]) {
        const task = taskArray[taskIndex];

        try {
            await db.deleteTask(task.id);

            // Удаляем задачу из локального массива
            if (isCompleted) {
                tasks.completed = tasks.completed.filter(t => t.id !== task.id);
            } else {
                tasks.active = tasks.active.filter(t => t.id !== task.id);
            }

            updateUI();
        } catch (err) {
            console.error('Ошибка при удалении задачи:', err);
            alert('Не удалось удалить задачу');
        }
    }
}

// Функция сохранения описания задачи
async function saveTaskDescription(event) {
    const taskElement = event.target.closest('.task');
    const taskIndex = Array.from(taskElement.parentNode.children).indexOf(taskElement);
    const descriptionContent = taskElement.querySelector('.description-content');
    const descriptionText = descriptionContent.querySelector('.task-description-text');
    const editorContainer = descriptionContent.querySelector('.task-description-editor');
    const editorButtons = taskElement.querySelector('.editor-buttons');
    const editor = activeEditors[editorContainer.id];

    if (editor) {
        const newDescription = editor.getMarkdown();
        const isCompleted = taskElement.classList.contains('completed-task');
        const taskArray = isCompleted ? tasks.completed : tasks.active;

        try {
            if (taskArray[taskIndex]) {
                const task = taskArray[taskIndex];
                await db.updateTask(task.id, { description: newDescription });
                task.description = newDescription;
            }

            // Обновляем отображение
            descriptionText.textContent = newDescription || 'Нет описания';
            descriptionText.classList.remove('hidden');
            editorContainer.classList.add('hidden');
            editorButtons.classList.add('hidden');

            // Удаляем редактор
            editor.destroy();
            delete activeEditors[editorContainer.id];
        } catch (err) {
            console.error('Ошибка при обновлении описания задачи:', err);
            alert('Не удалось обновить описание задачи');
        }
    }
}

// Функция отмены редактирования описания
function cancelTaskDescriptionEditing(event) {
    const taskElement = event.target.closest('.task');
    const descriptionContent = taskElement.querySelector('.description-content');
    const descriptionText = descriptionContent.querySelector('.task-description-text');
    const editorContainer = descriptionContent.querySelector('.task-description-editor');
    const editorButtons = taskElement.querySelector('.editor-buttons');
    const editor = activeEditors[editorContainer.id];

    if (editor) {
        // Возвращаем отображение к исходному состоянию
        descriptionText.classList.remove('hidden');
        editorContainer.classList.add('hidden');
        editorButtons.classList.add('hidden');

        // Удаляем редактор
        editor.destroy();
        delete activeEditors[editorContainer.id];
    }
}
