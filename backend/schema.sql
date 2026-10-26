-- ==============================================================================
-- Campus Mess Food Waste Management System
-- Database Schema for MySQL 8.0 (Derived from docs/backend-design.md)
-- ==============================================================================

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    hostel_block VARCHAR(50) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    dietary_preference ENUM('VEG', 'NON_VEG', 'JAIN', 'EGGITARIAN') NOT NULL DEFAULT 'VEG',
    status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_students_status (status),
    INDEX idx_students_hostel (hostel_block)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Meals Table
CREATE TABLE IF NOT EXISTS meals (
    id VARCHAR(36) PRIMARY KEY,
    meal_date DATE NOT NULL,
    meal_type ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER') NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    cutoff_time DATETIME NOT NULL,
    menu_description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_meal_date_type (meal_date, meal_type),
    CONSTRAINT chk_meal_window CHECK (start_time < end_time),
    CONSTRAINT chk_cutoff_before_start CHECK (cutoff_time <= start_time),
    INDEX idx_meals_date (meal_date),
    INDEX idx_meals_cutoff (cutoff_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Meal Responses Table (Student Opt-In / Opt-Out Intent)
CREATE TABLE IF NOT EXISTS meal_responses (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    meal_id VARCHAR(36) NOT NULL,
    status ENUM('EATING', 'SKIPPING') NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    responded_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_meal_response (student_id, meal_id),
    CONSTRAINT fk_meal_responses_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_responses_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_meal_responses_meal_status (meal_id, status),
    INDEX idx_meal_responses_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Attendance Table (Live Mess Check-in Scans)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    meal_id VARCHAR(36) NOT NULL,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100) NOT NULL,
    status ENUM('ATTENDED', 'WALK_IN') NOT NULL DEFAULT 'ATTENDED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_meal_attendance (student_id, meal_id),
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_attendance_meal (meal_id),
    INDEX idx_attendance_scanned_at (scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Meal Summaries Table (Locked Snapshot at Cutoff & Final Reconciliation)
CREATE TABLE IF NOT EXISTS meal_summaries (
    id VARCHAR(36) PRIMARY KEY,
    meal_id VARCHAR(36) NOT NULL UNIQUE,
    total_eligible_students INT NOT NULL,
    explicit_eating_count INT NOT NULL,
    explicit_skipping_count INT NOT NULL,
    defaulted_eating_count INT NOT NULL,
    final_expected_headcount INT NOT NULL,
    actual_attended_count INT NOT NULL DEFAULT 0,
    no_show_count INT NOT NULL DEFAULT 0,
    walk_in_count INT NOT NULL DEFAULT 0,
    finalized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reconciled_at DATETIME NULL,
    CONSTRAINT fk_meal_summaries_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Waste Logs Table (Post-Meal Kitchen Waste Measurement)
CREATE TABLE IF NOT EXISTS waste_logs (
    id VARCHAR(36) PRIMARY KEY,
    meal_id VARCHAR(36) NOT NULL,
    prepared_weight_kg DECIMAL(8, 2) NOT NULL,
    consumed_weight_kg DECIMAL(8, 2) NULL,
    wasted_weight_kg DECIMAL(8, 2) NOT NULL,
    remarks TEXT,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_logs_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_waste_logs_meal (meal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Idempotent Seed Data (Optional Initial Setup)
-- ==============================================================================

-- Seed Sample Student (matching student dashboard sample profile)
INSERT IGNORE INTO students (id, roll_number, full_name, email, phone_number, hostel_block, room_number, dietary_preference, status)
VALUES 
('STU2024001', 'CS21B001', 'Adarsh Jayaprakash', 'adarsh@campus.edu', '9876543210', 'Nilgiri Block', 'N-204', 'VEG', 'ACTIVE'),
('STU2024002', 'CS21B002', 'Rohan Sharma', 'rohan@campus.edu', '9876543211', 'Nilgiri Block', 'N-205', 'NON_VEG', 'ACTIVE'),
('STU2024003', 'CS21B003', 'Priya Patel', 'priya@campus.edu', '9876543212', 'Nilgiri Block', 'N-206', 'VEG', 'ACTIVE');
