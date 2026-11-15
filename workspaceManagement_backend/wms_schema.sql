-- =====================================================================
-- Workspace Management System (WMS) - MySQL 8.0+ schema
-- Generated from the final ERD (WMS_ERD.drawio)
-- Engine: InnoDB | Charset: utf8mb4
-- =====================================================================

CREATE DATABASE IF NOT EXISTS wms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wms;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS clarification_replies;
DROP TABLE IF EXISTS broadcasts;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS task_logs;
DROP TABLE IF EXISTS task_assignments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS ticket_messages;
DROP TABLE IF EXISTS hr_tickets;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendance_logs;
DROP TABLE IF EXISTS salary_configs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- COMPANY  (@wms_company)
-- ---------------------------------------------------------------------
CREATE TABLE companies (
  company_id          VARCHAR(20)    NOT NULL,                 -- CO-###
  name                VARCHAR(150)   NOT NULL,
  enterprise_id       VARCHAR(50)    NULL,
  main_campus         VARCHAR(150)   NULL,
  timezone            VARCHAR(64)    NOT NULL DEFAULT 'Asia/Karachi',
  geofence_lat        DECIMAL(10,7)  NULL,
  geofence_lng        DECIMAL(10,7)  NULL,
  geofence_radius_m   INT UNSIGNED   NOT NULL DEFAULT 200,
  working_days        JSON           NULL,                     -- e.g. ["Mon","Tue","Wed","Thu","Fri"]
  rate_absent         DECIMAL(12,2)  NOT NULL DEFAULT 5000.00,
  rate_unpaid         DECIMAL(12,2)  NOT NULL DEFAULT 3500.00,
  currency            CHAR(3)        NOT NULL DEFAULT 'PKR',
  PRIMARY KEY (company_id),
  UNIQUE KEY uq_companies_enterprise (enterprise_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- USER  (@wms_users)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            VARCHAR(20)   NOT NULL,                        -- ADM-### / EMP-### / MGR-### ...
  company_id    VARCHAR(20)   NULL,
  manager_id    VARCHAR(20)   NULL,                            -- self reference
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  password      VARCHAR(255)  NOT NULL,                        -- stored as-is per the app; store a bcrypt hash in production
  phone         VARCHAR(30)   NULL,
  role          ENUM('ADMIN','HR','MANAGER','EMPLOYEE','CLIENT') NOT NULL,
  company_name  VARCHAR(150)  NULL,                            -- ADMIN only
  avatar_key    VARCHAR(255)  NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_company (company_id),
  KEY idx_users_manager (manager_id),
  KEY idx_users_role (role),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id)
    REFERENCES companies (company_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- SALARY_CONFIG  (@wms_salary_config)
-- user_id NULL = company-wide default; set = per-employee override
-- ---------------------------------------------------------------------
CREATE TABLE salary_configs (
  id                       VARCHAR(36)    NOT NULL,
  company_id               VARCHAR(20)    NOT NULL,
  user_id                  VARCHAR(20)    NULL,
  base_salary              DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  working_days_per_month   TINYINT UNSIGNED NOT NULL DEFAULT 22,
  rate_absent              DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  rate_unpaid              DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salary_company_user (company_id, user_id),
  KEY idx_salary_user (user_id),
  CONSTRAINT fk_salary_company FOREIGN KEY (company_id)
    REFERENCES companies (company_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salary_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ATTENDANCE_LOG  (@wms_attendance)
-- One row per punch event: is_checkin = 1 (check-in) / 0 (check-out)
-- ---------------------------------------------------------------------
CREATE TABLE attendance_logs (
  id               VARCHAR(36)   NOT NULL,
  user_email       VARCHAR(190)  NOT NULL,
  attendance_date  DATETIME      NOT NULL,
  is_checkin       TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_att_user_date (user_email, attendance_date),
  CONSTRAINT fk_att_user FOREIGN KEY (user_email)
    REFERENCES users (email) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- LEAVE_REQUEST  (@wms_leaves)
-- ---------------------------------------------------------------------
CREATE TABLE leave_requests (
  id            VARCHAR(36)   NOT NULL,
  user_email    VARCHAR(190)  NOT NULL,                        -- applicant
  leave_type    ENUM('annualLeave','sickLeave') NOT NULL,
  start_date    DATE          NOT NULL,
  end_date      DATE          NOT NULL,
  reason        TEXT          NULL,
  status        ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_user (user_email),
  KEY idx_leave_status (status),
  KEY idx_leave_dates (start_date, end_date),
  CONSTRAINT fk_leave_user FOREIGN KEY (user_email)
    REFERENCES users (email) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- HR_TICKET  (@wms_tickets)
-- ---------------------------------------------------------------------
CREATE TABLE hr_tickets (
  id                  VARCHAR(20)   NOT NULL,                  -- TKT-###
  user_id             VARCHAR(20)   NOT NULL,                  -- raised by
  handled_by          VARCHAR(20)   NULL,                      -- HR user
  attendance_id       VARCHAR(36)   NULL,                      -- attendance correction target
  category            VARCHAR(50)   NOT NULL,
  subject             VARCHAR(200)  NOT NULL,
  description         TEXT          NULL,
  correction_date     DATE          NULL,
  correction_time     TIME          NULL,
  evidence_image_key  VARCHAR(255)  NULL,
  status              ENUM('OPEN','APPROVED','REJECTED') NOT NULL DEFAULT 'OPEN',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tickets_user (user_id),
  KEY idx_tickets_handler (handled_by),
  KEY idx_tickets_attendance (attendance_id),
  KEY idx_tickets_status (status),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_handler FOREIGN KEY (handled_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_attendance FOREIGN KEY (attendance_id)
    REFERENCES attendance_logs (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TICKET_MESSAGE  (timeline)
-- ---------------------------------------------------------------------
CREATE TABLE ticket_messages (
  id          VARCHAR(36)  NOT NULL,
  ticket_id   VARCHAR(20)  NOT NULL,
  author_id   VARCHAR(20)  NOT NULL,
  body        TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tmsg_ticket (ticket_id, created_at),
  KEY idx_tmsg_author (author_id),
  CONSTRAINT fk_tmsg_ticket FOREIGN KEY (ticket_id)
    REFERENCES hr_tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tmsg_author FOREIGN KEY (author_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TASK  (@wms_tasks)
-- buffer_days and has_conflict are derived (generated) columns.
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
  id                 VARCHAR(20)   NOT NULL,                   -- TSK-###
  created_by         VARCHAR(20)   NOT NULL,                   -- manager / admin
  title              VARCHAR(200)  NOT NULL,
  description        TEXT          NULL,
  status             VARCHAR(30)   NOT NULL DEFAULT 'pending',
  progress_percent   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  internal_due_date  DATE          NULL,
  client_due_date    DATE          NULL,
  buffer_days        INT           GENERATED ALWAYS AS (DATEDIFF(client_due_date, internal_due_date)) STORED,
  has_conflict       TINYINT(1)    GENERATED ALWAYS AS (DATEDIFF(client_due_date, internal_due_date) < 0) STORED,
  milestone_sync     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_creator (created_by),
  KEY idx_tasks_status (status),
  KEY idx_tasks_due (internal_due_date),
  CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_tasks_progress CHECK (progress_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TASK_ASSIGNMENT  (assignedToIds) - resolves M:N between task and user
-- ---------------------------------------------------------------------
CREATE TABLE task_assignments (
  task_id  VARCHAR(20)  NOT NULL,
  user_id  VARCHAR(20)  NOT NULL,
  PRIMARY KEY (task_id, user_id),
  KEY idx_ta_user (user_id),
  CONSTRAINT fk_ta_task FOREIGN KEY (task_id)
    REFERENCES tasks (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ta_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TASK_LOG  (notes / activity)
-- ---------------------------------------------------------------------
CREATE TABLE task_logs (
  id          VARCHAR(36)  NOT NULL,
  task_id     VARCHAR(20)  NOT NULL,
  author_id   VARCHAR(20)  NOT NULL,
  note        TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tlog_task (task_id, created_at),
  KEY idx_tlog_author (author_id),
  CONSTRAINT fk_tlog_task FOREIGN KEY (task_id)
    REFERENCES tasks (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tlog_author FOREIGN KEY (author_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- REQUIREMENT  (@wms_requirements)
-- ---------------------------------------------------------------------
CREATE TABLE requirements (
  id               VARCHAR(36)   NOT NULL,
  code             VARCHAR(30)   NOT NULL,
  client_email     VARCHAR(190)  NOT NULL,                     -- users.role = 'CLIENT'
  author_email     VARCHAR(190)  NOT NULL,                     -- manager / admin who created it
  title            VARCHAR(200)  NOT NULL,
  deadline         DATE          NULL,
  lifecycle_state  ENUM('IN_PROGRESS','AWAITING_CLIENT','COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
  PRIMARY KEY (id),
  UNIQUE KEY uq_requirements_code (code),
  KEY idx_req_client (client_email),
  KEY idx_req_author (author_email),
  KEY idx_req_state (lifecycle_state),
  CONSTRAINT fk_req_client FOREIGN KEY (client_email)
    REFERENCES users (email) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_req_author FOREIGN KEY (author_email)
    REFERENCES users (email) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- MILESTONE
-- ---------------------------------------------------------------------
CREATE TABLE milestones (
  id              VARCHAR(36)   NOT NULL,
  requirement_id  VARCHAR(36)   NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  is_completed    TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_ms_req (requirement_id),
  CONSTRAINT fk_ms_req FOREIGN KEY (requirement_id)
    REFERENCES requirements (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- BROADCAST  (manager -> client)
-- ---------------------------------------------------------------------
CREATE TABLE broadcasts (
  id              VARCHAR(36)  NOT NULL,
  requirement_id  VARCHAR(36)  NOT NULL,
  author_id       VARCHAR(20)  NOT NULL,
  content         TEXT         NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bc_req (requirement_id, created_at),
  KEY idx_bc_author (author_id),
  CONSTRAINT fk_bc_req FOREIGN KEY (requirement_id)
    REFERENCES requirements (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bc_author FOREIGN KEY (author_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CLARIFICATION_REPLY  (client -> manager)
-- ---------------------------------------------------------------------
CREATE TABLE clarification_replies (
  id              VARCHAR(36)   NOT NULL,
  requirement_id  VARCHAR(36)   NOT NULL,
  client_email    VARCHAR(190)  NOT NULL,
  author_email    VARCHAR(190)  NOT NULL,
  message         TEXT          NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rp_req (requirement_id, created_at),
  KEY idx_rp_client (client_email),
  KEY idx_rp_author (author_email),
  CONSTRAINT fk_rp_req FOREIGN KEY (requirement_id)
    REFERENCES requirements (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_client FOREIGN KEY (client_email)
    REFERENCES users (email) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_author FOREIGN KEY (author_email)
    REFERENCES users (email) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VIEW: requirement progress (replaces the removed derived columns)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_requirement_progress AS
SELECT
  r.id,
  r.code,
  r.title,
  r.lifecycle_state,
  COUNT(m.id)                                   AS total_milestones,
  COALESCE(SUM(m.is_completed), 0)              AS completed_milestones,
  CASE WHEN COUNT(m.id) = 0 THEN 0
       ELSE ROUND(100 * SUM(m.is_completed) / COUNT(m.id))
  END                                           AS progress_percent
FROM requirements r
LEFT JOIN milestones m ON m.requirement_id = r.id
GROUP BY r.id, r.code, r.title, r.lifecycle_state;
