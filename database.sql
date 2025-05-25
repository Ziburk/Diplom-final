-- Создание базы данных
CREATE DATABASE todo_list;

-- Подключение к созданной базе данных
\c todo_list;

-- Создание таблицы пользователей
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы категорий
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Создание таблицы задач
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_position INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Вставка тестовых пользователей
INSERT INTO users (id, username, first_name, last_name) VALUES
(1, 'test_user1', 'Test', 'User1'),
(2, 'test_user2', 'Test', 'User2');

-- Вставка стандартных категорий для каждого пользователя
INSERT INTO categories (user_id, name, color, is_default) VALUES
(1, 'Общее', '#607D8B', true),
(1, 'Работа', '#FF5252', false),
(1, 'Личное', '#69F0AE', false),
(1, 'Покупки', '#448AFF', false),
(2, 'Общее', '#607D8B', true),
(2, 'Работа', '#FF5252', false),
(2, 'Личное', '#69F0AE', false),
(2, 'Покупки', '#448AFF', false); 