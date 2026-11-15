-- ============================================================================
-- DEMO SEED DATA — Global Research Trends (CO-001)
-- ----------------------------------------------------------------------------
-- Needed because leave_requests.user_email has a foreign key to users(email),
-- and users.company_id has a foreign key to companies(company_id). The real
-- accounts are still provisioned in the mobile app (AsyncStorage); these rows
-- exist so the employee backend can persist data against valid parents.
--
-- All demo accounts use the password: 123456
-- Safe to re-run (INSERT ... ON DUPLICATE KEY UPDATE).
-- ============================================================================

USE workspace_management;

INSERT INTO companies (
    company_id,
    name,
    main_campus,
    timezone,
    geofence_lat,
    geofence_lng,
    geofence_radius_m,
    working_days,
    rate_absent,
    currency
) VALUES (
    'CO-001',
    'Global Research Trends',
    'Lahore',
    'Asia/Karachi',
    31.5204,
    74.3587,
    200,
    JSON_ARRAY('M', 'T', 'W', 'T', 'F'),
    5000.00,
    'PKR'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    main_campus = VALUES(main_campus),
    timezone = VALUES(timezone),
    geofence_lat = VALUES(geofence_lat),
    geofence_lng = VALUES(geofence_lng),
    geofence_radius_m = VALUES(geofence_radius_m),
    working_days = VALUES(working_days),
    rate_absent = VALUES(rate_absent),
    currency = VALUES(currency);

-- Insert admins first (other users reference them via manager_email).
INSERT INTO users (
    email, company_id, manager_email, name, password, phone, role, company_name, is_active
) VALUES (
    'admin@grt.com', 'CO-001', NULL, 'GRT Admin', '123456', '+92 300 0000001',
    'ADMIN', 'Global Research Trends', 1
) ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    manager_email = VALUES(manager_email),
    name = VALUES(name),
    password = VALUES(password),
    phone = VALUES(phone),
    role = VALUES(role),
    company_name = VALUES(company_name),
    is_active = VALUES(is_active);

INSERT INTO users (
    email, company_id, manager_email, name, password, phone, role, company_name, is_active
) VALUES (
    'manager@grt.com', 'CO-001', 'admin@grt.com', 'GRT Manager', '123456', '+92 300 0000002',
    'MANAGER', NULL, 1
) ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    manager_email = VALUES(manager_email),
    name = VALUES(name),
    password = VALUES(password),
    phone = VALUES(phone),
    role = VALUES(role),
    company_name = VALUES(company_name),
    is_active = VALUES(is_active);

INSERT INTO users (
    email, company_id, manager_email, name, password, phone, role, company_name, is_active
) VALUES (
    'hr@grt.com', 'CO-001', 'admin@grt.com', 'GRT HR', '123456', '+92 300 0000003',
    'HR', NULL, 1
) ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    manager_email = VALUES(manager_email),
    name = VALUES(name),
    password = VALUES(password),
    phone = VALUES(phone),
    role = VALUES(role),
    company_name = VALUES(company_name),
    is_active = VALUES(is_active);

INSERT INTO users (
    email, company_id, manager_email, name, password, phone, role, company_name, is_active
) VALUES (
    'client@grt.com', 'CO-001', 'admin@grt.com', 'GRT Client', '123456', '+92 300 0000004',
    'CLIENT', NULL, 1
) ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    manager_email = VALUES(manager_email),
    name = VALUES(name),
    password = VALUES(password),
    phone = VALUES(phone),
    role = VALUES(role),
    company_name = VALUES(company_name),
    is_active = VALUES(is_active);

INSERT INTO users (
    email, company_id, manager_email, name, password, phone, role, company_name, is_active
) VALUES (
    'employee2@grt.com', 'CO-001', 'manager@grt.com', 'GRT Employee', '123456', '+92 300 0000005',
    'EMPLOYEE', NULL, 1
) ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    manager_email = VALUES(manager_email),
    name = VALUES(name),
    password = VALUES(password),
    phone = VALUES(phone),
    role = VALUES(role),
    company_name = VALUES(company_name),
    is_active = VALUES(is_active);
