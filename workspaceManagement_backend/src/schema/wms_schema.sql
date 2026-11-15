CREATE DATABASE IF NOT EXISTS workspace_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE workspace_management;

-- ============================================================================
-- 1. COMPANY & SCHEDULE DOMAIN
-- ============================================================================

CREATE TABLE companies (
    company_id VARCHAR(20) NOT NULL COMMENT 'Format: CO-###',
    name VARCHAR(150) NOT NULL,
    main_campus VARCHAR(150) NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    geofence_lat DECIMAL(10,7) NULL,
    geofence_lng DECIMAL(10,7) NULL,
    geofence_radius_m INT NOT NULL DEFAULT 200,
    working_days JSON NULL,
    rate_absent DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    -- rate_unpaid DECIMAL(12,2) NOT NULL DEFAULT 3500.00,
    currency CHAR(3) NOT NULL DEFAULT 'PKR',
    PRIMARY KEY (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `schedule` (
    company_id VARCHAR(20) NOT NULL,
    starting_time DATE NOT NULL,
    ending_time DATE NOT NULL,
    PRIMARY KEY (company_id),
    CONSTRAINT fk_schedule_company
        FOREIGN KEY (company_id) REFERENCES companies (company_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. IDENTITY DOMAIN (USERS)
-- ============================================================================

CREATE TABLE users (
    email VARCHAR(190) NOT NULL,
    company_id VARCHAR(20) NOT NULL,
    manager_email VARCHAR(190) NULL,
    name VARCHAR(120) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    role ENUM('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'CLIENT') NOT NULL,
    company_name VARCHAR(150) NULL COMMENT 'Populated for ADMIN role only',
    avatar_key VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email),
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_company (company_id),
    INDEX idx_users_manager (manager_email),
    CONSTRAINT fk_users_company
        FOREIGN KEY (company_id) REFERENCES companies (company_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_users_manager
        FOREIGN KEY (manager_email) REFERENCES users (email)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. HR, ATTENDANCE & PAYROLL DOMAIN
-- ============================================================================

CREATE TABLE salary_configs (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    company_id VARCHAR(20) NOT NULL,
    user_email VARCHAR(190) NULL COMMENT 'NULL = company-wide default',
    base_salary DECIMAL(12,2) NOT NULL,
    working_days_per_month TINYINT UNSIGNED NOT NULL DEFAULT 22,
    rate_absent DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    PRIMARY KEY (id),
    INDEX idx_salary_configs_company (company_id),
    INDEX idx_salary_configs_user (user_email),
    CONSTRAINT fk_salary_configs_company
        FOREIGN KEY (company_id) REFERENCES companies (company_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_salary_configs_user
        FOREIGN KEY (user_email) REFERENCES users (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    user_email VARCHAR(190) NOT NULL COMMENT 'Applicant',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (id),
    INDEX idx_leave_requests_user (user_email),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT fk_leave_requests_user
        FOREIGN KEY (user_email) REFERENCES users (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance_logs (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    user_email VARCHAR(190) NOT NULL,
    attendance_date DATETIME NOT NULL,
    is_checkin TINYINT(1) NOT NULL COMMENT '1 = check-in, 0 = check-out',
    PRIMARY KEY (id),
    INDEX idx_attendance_user_date (user_email, attendance_date),
    CONSTRAINT fk_attendance_logs_user
        FOREIGN KEY (user_email) REFERENCES users (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hr_tickets (
    id VARCHAR(20) NOT NULL COMMENT 'Format: TKT-###',
    user_email VARCHAR(190) NOT NULL COMMENT 'Raised by',
    subject VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status ENUM('OPEN', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_hr_tickets_user (user_email),
    CONSTRAINT fk_hr_tickets_user
        FOREIGN KEY (user_email) REFERENCES users (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_messages (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    ticket_id VARCHAR(20) NOT NULL,
    author_email VARCHAR(190) NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_ticket_messages_ticket (ticket_id),
    INDEX idx_ticket_messages_author (author_email),
    CONSTRAINT fk_ticket_messages_ticket
        FOREIGN KEY (ticket_id) REFERENCES hr_tickets (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ticket_messages_author
        FOREIGN KEY (author_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TASKS DOMAIN
-- ============================================================================

CREATE TABLE tasks (
    id VARCHAR(20) NOT NULL COMMENT 'Format: TSK-###',
    created_by_email VARCHAR(190) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'TO_DO' COMMENT 'TO_DO | IN_PROGRESS | COMPLETED',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT 'LOW | MEDIUM | HIGH | CRITICAL',
    progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
    internal_due_date DATE NULL,
    client_due_date DATE NULL,
    internal_remaining_days INT,
    is_milestone_synced TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    has_conflict TINYINT(1) GENERATED ALWAYS AS (
        CASE
            WHEN internal_due_date IS NOT NULL
             AND client_due_date IS NOT NULL
             AND internal_due_date > client_due_date THEN 1
            ELSE 0
        END
    ) STORED,
    PRIMARY KEY (id),
    INDEX idx_tasks_creator (created_by_email),
    CONSTRAINT chk_tasks_progress CHECK (progress_percent BETWEEN 0 AND 100),
    CONSTRAINT fk_tasks_created_by
        FOREIGN KEY (created_by_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_assignments (
    task_id VARCHAR(20) NOT NULL,
    user_email VARCHAR(190) NOT NULL,
    PRIMARY KEY (task_id, user_email),
    INDEX idx_task_assignments_user (user_email),
    CONSTRAINT fk_task_assignments_task
        FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_task_assignments_user
        FOREIGN KEY (user_email) REFERENCES users (email)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task progress log / message timeline shown on the manager and employee
-- task detail screens.
CREATE TABLE task_logs (
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

-- ============================================================================
-- 5. CLIENT REQUIREMENTS DOMAIN
-- ============================================================================

CREATE TABLE requirements (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    code VARCHAR(30) NOT NULL,
    client_email VARCHAR(190) NOT NULL COMMENT 'User with role = CLIENT',
    author_email VARCHAR(190) NOT NULL COMMENT 'Manager or Admin',
    title VARCHAR(200) NOT NULL,
    deadline DATE NULL,
    lifecycle_state ENUM('IN_PROGRESS', 'AWAITING_CLIENT', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    PRIMARY KEY (id),
    UNIQUE KEY uk_requirements_code (code),
    INDEX idx_requirements_client (client_email),
    INDEX idx_requirements_author (author_email),
    CONSTRAINT fk_requirements_client
        FOREIGN KEY (client_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_requirements_author
        FOREIGN KEY (author_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE milestones (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    requirement_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_milestones_requirement (requirement_id),
    CONSTRAINT fk_milestones_requirement
        FOREIGN KEY (requirement_id) REFERENCES requirements (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE broadcasts (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    requirement_id VARCHAR(36) NOT NULL,
    author_email VARCHAR(190) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_broadcasts_requirement (requirement_id),
    INDEX idx_broadcasts_author (author_email),
    CONSTRAINT fk_broadcasts_requirement
        FOREIGN KEY (requirement_id) REFERENCES requirements (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_broadcasts_author
        FOREIGN KEY (author_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clarification_replies (
    id VARCHAR(36) NOT NULL COMMENT 'UUID',
    requirement_id VARCHAR(36) NOT NULL,
    client_email VARCHAR(190) NOT NULL,
    author_email VARCHAR(190) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_clarification_requirement (requirement_id),
    INDEX idx_clarification_client (client_email),
    INDEX idx_clarification_author (author_email),
    CONSTRAINT fk_clarification_requirement
        FOREIGN KEY (requirement_id) REFERENCES requirements (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_clarification_client
        FOREIGN KEY (client_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_clarification_author
        FOREIGN KEY (author_email) REFERENCES users (email)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;