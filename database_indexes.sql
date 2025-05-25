-- Индекс для поиска задач по пользователю
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Индекс для поиска задач по категории
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);

-- Индекс для сортировки задач по позиции
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(original_position);

-- Индекс для поиска категорий по пользователю
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Составной индекс для уникальности категорий пользователя
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);

-- Индекс для поиска выполненных задач
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);

-- Индекс для поиска задач по дате выполнения
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date); 