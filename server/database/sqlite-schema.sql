-- ZEMANO SQLite Database Schema
-- Complete SQLite schema for escrow platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('employer', 'contractor', 'arbitrator', 'admin')),
    is_verified BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    profile_image VARCHAR(255),
    national_id VARCHAR(20),
    birth_date DATE,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTP verification table
CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    employer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contractor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100),
    budget DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IRR',
    deadline DATE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'waiting_for_acceptance', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed')),
    attachment_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project milestones
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed')),
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Escrow transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    employer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded', 'disputed')),
    zarinpal_authority VARCHAR(100),
    zarinpal_ref_id VARCHAR(100),
    payment_date DATETIME,
    release_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wallet system
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    total_earned DECIMAL(15, 2) DEFAULT 0.00,
    total_spent DECIMAL(15, 2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'refund', 'earning')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- For ZarinPal or other payment gateways
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    attachment_path VARCHAR(255),
    attachment_type VARCHAR(50),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Arbitration cases
CREATE TABLE IF NOT EXISTS arbitrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    initiator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    arbitrator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'resolved')),
    resolution TEXT,
    decision VARCHAR(20) CHECK (decision IN ('contractor', 'employer', 'split')),
    contractor_percentage DECIMAL(5, 2), -- For split decisions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

-- Arbitrator ratings
CREATE TABLE IF NOT EXISTS arbitrator_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arbitration_id INTEGER REFERENCES arbitrations(id) ON DELETE CASCADE,
    rater_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    arbitrator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Digital contracts
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    content TEXT NOT NULL, -- JSON or HTML content
    pdf_path VARCHAR(255),
    employer_signed BOOLEAN DEFAULT 0,
    contractor_signed BOOLEAN DEFAULT 0,
    employer_signature_date DATETIME,
    contractor_signature_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File uploads
CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    purpose VARCHAR(50), -- 'profile', 'project', 'chat', 'contract', etc.
    reference_id INTEGER, -- ID of related entity
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'payment', 'project', 'message', 'arbitration', etc.
    is_read BOOLEAN DEFAULT 0,
    data TEXT, -- JSON as TEXT in SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values TEXT, -- JSON as TEXT in SQLite
    new_values TEXT, -- JSON as TEXT in SQLite
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project applications table
CREATE TABLE IF NOT EXISTS project_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    contractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    proposal TEXT NOT NULL,
    estimated_days INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project invites table
CREATE TABLE IF NOT EXISTS project_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    contractor_email VARCHAR(255),
    contractor_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    accepted_at DATETIME
);

-- Verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    national_card_image VARCHAR(255),
    selfie_image VARCHAR(255),
    national_id VARCHAR(20),
    province VARCHAR(100),
    city VARCHAR(100),
    birth_date DATE,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_at DATETIME,
    reviewed_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_projects_employer ON projects(employer_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_escrow_project ON escrow_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_project_applications_project ON project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_contractor ON project_applications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);
CREATE INDEX IF NOT EXISTS idx_project_invites_token ON project_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_verification_documents_user ON verification_documents(user_id);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('commission_rate', '0.05', 'Platform commission rate (5%)'),
('min_withdrawal', '50000', 'Minimum withdrawal amount in IRR'),
('max_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('zarinpal_merchant_id', '', 'ZarinPal merchant ID'),
('sms_api_key', '', 'Melli Payamak API key'),
('sms_username', '', 'Melli Payamak username'),
('platform_name', 'ضمانو', 'Platform name'),
('support_email', 'support@zemano.ir', 'Support email address'),
('support_phone', '+982112345678', 'Support phone number');

-- Create default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, first_name, last_name, email, phone_number, password_hash, role, is_verified, is_active) 
VALUES (1, 'مدیر', 'سیستم', 'admin@zemano.ir', '+989123456789', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 1);

-- Create wallet for admin user
INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (1, 0.00);
