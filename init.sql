-- Создание таблицы пользователей Telegram (основная таблица пользователей)
CREATE TABLE telegram_users (
    user_id SERIAL PRIMARY KEY,
    telegram_chat_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы категорий
CREATE TABLE categories (
    category_id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER REFERENCES telegram_users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Создание таблицы задач
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES telegram_users(user_id) ON DELETE CASCADE,
    category_id VARCHAR(50) REFERENCES categories(category_id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    "order" INTEGER
);

-- Создание таблицы настроек уведомлений
CREATE TABLE notification_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES telegram_users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(20) CHECK (notification_type IN ('day_before', 'hour_before', 'custom')),
    custom_minutes INTEGER,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы истории уведомлений
CREATE TABLE notification_history (
    notification_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(task_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES telegram_users(user_id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_type VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('sent', 'failed', 'delivered'))
);

-- Создание индексов для оптимизации производительности
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_telegram_users_chat_id ON telegram_users(telegram_chat_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Создание триггерной функции для автоматического обновления порядка задач
CREATE OR REPLACE FUNCTION update_task_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order IS NULL THEN
        SELECT COALESCE(MAX("order") + 1, 0)
        INTO NEW.order
        FROM tasks
        WHERE user_id = NEW.user_id AND status = NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для автоматического обновления порядка задач
CREATE TRIGGER set_task_order
    BEFORE INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_order(); 