const pool = require('../config/db');

class Notification {
    /**
     * Создает новую настройку уведомлений для пользователя
     * @param {number} userId - ID пользователя
     * @param {Object} settings - Настройки уведомлений
     * @param {string} settings.notification_type - Тип уведомления ('day_before', 'hour_before', 'custom')
     * @param {number} [settings.custom_minutes] - Количество минут для пользовательского типа
     * @returns {Promise<Object>} Созданная настройка
     */
    static async createSetting(userId, settings) {
        try {
            const { notification_type, custom_minutes = null } = settings;

            const query = `
                INSERT INTO notification_settings (
                    user_id, notification_type, custom_minutes
                )
                VALUES ($1, $2, $3)
                RETURNING *
            `;

            const result = await pool.query(query, [
                userId,
                notification_type,
                custom_minutes
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Error in createSetting:', error);
            throw error;
        }
    }

    /**
     * Получает все настройки уведомлений пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<Array>} Массив настроек
     */
    static async getSettingsByUserId(userId) {
        try {
            const query = `
                SELECT * FROM notification_settings
                WHERE user_id = $1 AND is_enabled = true
                ORDER BY created_at
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Error in getSettingsByUserId:', error);
            throw error;
        }
    }

    /**
     * Обновляет настройку уведомлений
     * @param {number} settingId - ID настройки
     * @param {number} userId - ID пользователя
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object>} Обновленная настройка
     */
    static async updateSetting(settingId, userId, updateData) {
        try {
            const allowedFields = ['notification_type', 'custom_minutes', 'is_enabled'];
            const updates = [];
            const values = [settingId, userId];
            let paramCount = 3;

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = $${paramCount}`);
                    values.push(updateData[key]);
                    paramCount++;
                }
            });

            if (updates.length === 0) return null;

            const query = `
                UPDATE notification_settings
                SET ${updates.join(', ')}
                WHERE setting_id = $1 AND user_id = $2
                RETURNING *
            `;

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error in updateSetting:', error);
            throw error;
        }
    }

    /**
     * Удаляет настройку уведомлений
     * @param {number} settingId - ID настройки
     * @param {number} userId - ID пользователя
     * @returns {Promise<boolean>} Успешность удаления
     */
    static async deleteSetting(settingId, userId) {
        try {
            const query = 'DELETE FROM notification_settings WHERE setting_id = $1 AND user_id = $2';
            const result = await pool.query(query, [settingId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error in deleteSetting:', error);
            throw error;
        }
    }

    /**
     * Создает запись об отправленном уведомлении
     * @param {Object} notificationData - Данные уведомления
     * @returns {Promise<Object>} Созданная запись
     */
    static async createHistory(notificationData) {
        try {
            const {
                task_id,
                user_id,
                notification_type,
                status = 'sent'
            } = notificationData;

            const query = `
                INSERT INTO notification_history (
                    task_id, user_id, notification_type, status
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const result = await pool.query(query, [
                task_id,
                user_id,
                notification_type,
                status
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Error in createHistory:', error);
            throw error;
        }
    }

    /**
     * Получает задачи, для которых нужно отправить уведомления
     * @returns {Promise<Array>} Массив задач для уведомления
     */
    static async getTasksForNotification() {
        try {
            const query = `
                WITH notification_times AS (
                    SELECT 
                        t.task_id,
                        t.user_id,
                        t.title,
                        t.due_date,
                        ns.notification_type,
                        ns.custom_minutes,
                        CASE 
                            WHEN ns.notification_type = 'day_before' THEN 
                                t.due_date - interval '1 day'
                            WHEN ns.notification_type = 'hour_before' THEN 
                                t.due_date - interval '1 hour'
                            WHEN ns.notification_type = 'custom' THEN 
                                t.due_date - (ns.custom_minutes || ' minutes')::interval
                        END as notification_time
                    FROM tasks t
                    JOIN notification_settings ns ON t.user_id = ns.user_id
                    WHERE 
                        t.status = 'active' 
                        AND t.due_date IS NOT NULL
                        AND ns.is_enabled = true
                )
                SELECT 
                    nt.*,
                    tu.telegram_chat_id
                FROM notification_times nt
                JOIN telegram_users tu ON nt.user_id = tu.user_id
                LEFT JOIN notification_history nh ON 
                    nh.task_id = nt.task_id 
                    AND nh.notification_type = nt.notification_type
                WHERE 
                    nt.notification_time <= CURRENT_TIMESTAMP
                    AND nt.due_date > CURRENT_TIMESTAMP
                    AND nh.notification_id IS NULL
            `;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error in getTasksForNotification:', error);
            throw error;
        }
    }

    /**
     * Обновляет статус отправленного уведомления
     * @param {number} notificationId - ID уведомления
     * @param {string} status - Новый статус
     * @returns {Promise<Object>} Обновленное уведомление
     */
    static async updateHistoryStatus(notificationId, status) {
        try {
            const query = `
                UPDATE notification_history
                SET status = $2
                WHERE notification_id = $1
                RETURNING *
            `;

            const result = await pool.query(query, [notificationId, status]);
            return result.rows[0];
        } catch (error) {
            console.error('Error in updateHistoryStatus:', error);
            throw error;
        }
    }
}

module.exports = Notification;
