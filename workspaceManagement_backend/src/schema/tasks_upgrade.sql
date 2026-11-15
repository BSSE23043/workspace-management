-- Upgrade an existing `workspace_management` database to the task schema used
-- by the app (adds real priority / milestone-sync / created-at columns and the
-- task_logs timeline table).
--
-- Fresh installs do NOT need this file — src/schema/wms_schema.sql already
-- contains these definitions.
--
-- Run once:
--   Get-Content -Raw 'src\schema\tasks_upgrade.sql' | & 'C:\xampp\mysql\bin\mysql.exe' -u root

USE workspace_management;

ALTER TABLE tasks
    MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'TO_DO'
        COMMENT 'TO_DO | IN_PROGRESS | COMPLETED',
    ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        COMMENT 'LOW | MEDIUM | HIGH | CRITICAL' AFTER status,
    ADD COLUMN is_milestone_synced TINYINT(1) NOT NULL DEFAULT 0
        AFTER internal_remaining_days,
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        AFTER is_milestone_synced;

CREATE TABLE IF NOT EXISTS task_logs (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    task_id VARCHAR(20) NOT NULL,
    author_email VARCHAR(190) NULL,
    author_name VARCHAR(120) NULL,
    note TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_task_logs_task (task_id, created_at),
    INDEX idx_task_logs_author (author_email),
    CONSTRAINT fk_task_logs_task
        FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_task_logs_author
        FOREIGN KEY (author_email) REFERENCES users (email)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Microsecond precision keeps rapid timeline messages in the right order.
ALTER TABLE task_logs
    MODIFY COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
