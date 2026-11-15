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

-- Company shift window used by the employee Check-In / Check-Out screen.
INSERT INTO schedule (company_id, starting_time, ending_time) VALUES (
    'CO-001',
    '09:00:00',
    '17:00:00'
) ON DUPLICATE KEY UPDATE
    starting_time = VALUES(starting_time),
    ending_time = VALUES(ending_time);

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

-- ----------------------------------------------------------------------------
-- Demo HR tickets raised by the demo employee (employee portal)
-- ----------------------------------------------------------------------------
INSERT INTO hr_tickets (
    id, user_email, subject, description, event_date, status, created_at
) VALUES (
    'TKT-101',
    'employee2@grt.com',
    'Forgot to check out yesterday',
    'I left the office at 6:10 PM but forgot to punch out in the app. Please correct my attendance for 12 Nov.',
    '2026-11-12',
    'OPEN',
    '2026-11-13 09:15:00'
) ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    description = VALUES(description),
    event_date = VALUES(event_date),
    status = VALUES(status),
    created_at = VALUES(created_at);

INSERT INTO hr_tickets (
    id, user_email, subject, description, event_date, status, created_at
) VALUES (
    'TKT-102',
    'employee2@grt.com',
    'Salary slip deduction query',
    'My November payslip shows an absence deduction for 10 Nov even though I was present. Kindly review.',
    '2026-11-10',
    'RESOLVED',
    '2026-11-10 16:40:00'
) ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    description = VALUES(description),
    event_date = VALUES(event_date),
    status = VALUES(status),
    created_at = VALUES(created_at);

INSERT INTO ticket_messages (
    id, ticket_id, author_email, body, created_at
) VALUES (
    '11111111-1111-1111-1111-111111111101',
    'TKT-101',
    'employee2@grt.com',
    'I left the office at 6:10 PM but forgot to punch out in the app. Please correct my attendance for 12 Nov.',
    '2026-11-13 09:15:00'
), (
    '11111111-1111-1111-1111-111111111102',
    'TKT-101',
    'hr@grt.com',
    'Thanks for reporting. We have noted the correction and will update your attendance log shortly.',
    '2026-11-13 10:05:00'
), (
    '11111111-1111-1111-1111-111111111201',
    'TKT-102',
    'employee2@grt.com',
    'My November payslip shows an absence deduction for 10 Nov even though I was present. Kindly review.',
    '2026-11-10 16:40:00'
), (
    '11111111-1111-1111-1111-111111111202',
    'TKT-102',
    'hr@grt.com',
    'Reviewed with Payroll - the deduction was reversed. Your updated slip reflects the correction.',
    '2026-11-11 11:20:00'
) ON DUPLICATE KEY UPDATE
    body = VALUES(body),
    created_at = VALUES(created_at);

-- ----------------------------------------------------------------------------
-- Demo attendance history for the demo employee (historical, not today)
-- ----------------------------------------------------------------------------
INSERT INTO attendance_logs (
    id, user_email, attendance_date, is_checkin, distance_meters
) VALUES (
    'al-001',
    'employee2@grt.com',
    '2026-10-18 09:00:00',
    1,
    14.2
) ON DUPLICATE KEY UPDATE
    user_email = VALUES(user_email),
    attendance_date = VALUES(attendance_date),
    is_checkin = VALUES(is_checkin),
    distance_meters = VALUES(distance_meters);
