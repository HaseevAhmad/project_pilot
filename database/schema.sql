-- Select the database (will be created by database_setup.php if not exists)
USE project_pilot;

-- Table for Users (Admins, Supervisors, Students)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In a real app, store hashed passwords!
    role ENUM('admin', 'supervisor', 'student') NOT NULL,
    roll_number VARCHAR(50) NULL, -- Specific to students
    semester VARCHAR(50) NULL      -- Specific to students, their enrollment semester
);

-- Table for Semesters
-- This table stores unique semester names, e.g., "Spring 2024"
CREATE TABLE IF NOT EXISTS semesters (
    semester_name VARCHAR(50) PRIMARY KEY
);

-- Table for Projects
CREATE TABLE IF NOT EXISTS projects (
    project_id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    supervisor_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id),
    FOREIGN KEY (semester) REFERENCES semesters(semester_name)
);

-- Junction table for Project Members (Students in a project team)
CREATE TABLE IF NOT EXISTS project_members (
    project_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (project_id, student_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- Table for Submissions
CREATE TABLE IF NOT EXISTS submissions (
    submission_id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    submission_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    feedback TEXT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- Table for Notices/Announcements
CREATE TABLE IF NOT EXISTS notices (
    notice_id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    audience_type VARCHAR(50) NOT NULL, -- e.g., 'all', 'all_students', 'specific_student', 'specific_project', 'specific_semester_students'
    target_id VARCHAR(255) NULL, -- Can be user_id, project_id, or semester_name based on audience_type
    notice_date DATE NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(user_id)
);

-- Insert preset semesters (these are structural, not 'user data')
INSERT IGNORE INTO semesters (semester_name) VALUES
('1st Semester'), ('2nd Semester'), ('3rd Semester'), ('4th Semester'),
('5th Semester'), ('6th Semester'), ('7th Semester'), ('8th Semester');

-- Insert an initial admin user for system access (You'll need at least one user to log in)
-- Password for 'admin@projectpilot.com' is 'password' (hashed with bcrypt).
-- You should change this immediately after first login.
INSERT IGNORE INTO users (user_id, name, email, role, password, roll_number, semester) VALUES
('admin_initial', 'Admin', 'admin@projectpilot.co', 'admin', '$2y$10$wTf2S.i/T7M8C2X9pY1V5O/P/Q.Z.kQ.g/h/o/N.m.l.j.k.i.h.g.f.e.d.c.b.a.', NULL, NULL);
