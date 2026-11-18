-- ====================================================================
-- NeuroLab Enterprise - Initial Database Migration Schema (PostgreSQL)
-- Corresponds to Section 8 of "Documento Maestro de Desarrollo"
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'Ingeniero de IA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'active',
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Members Table (RBAC)
CREATE TABLE IF NOT EXISTS project_members (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Ingeniero de IA',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

-- 4. Datasets Table
CREATE TABLE IF NOT EXISTS datasets (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0.0',
    storage_key VARCHAR(512) NOT NULL,
    input_shape INTEGER NOT NULL,
    target_column VARCHAR(100) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Architectures Table
CREATE TABLE IF NOT EXISTS architectures (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    family VARCHAR(50) NOT NULL, -- Feedforward, CNN, RNN, GAN
    config_json JSONB NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Training Jobs Table
CREATE TABLE IF NOT EXISTS training_jobs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    architecture_id VARCHAR(36) NOT NULL REFERENCES architectures(id) ON DELETE RESTRICT,
    dataset_id VARCHAR(36) NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, PREPARING, RUNNING, COMPLETED, FAILED, CANCELLED
    progress REAL DEFAULT 0.0,
    total_epochs INTEGER DEFAULT 30,
    current_epoch INTEGER DEFAULT 0,
    hyperparameters JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Training Metrics Table
CREATE TABLE IF NOT EXISTS training_metrics (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
    epoch INTEGER NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value REAL NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_metrics_job_epoch ON training_metrics(job_id, epoch);

-- 8. Model Versions Table (Model Registry)
CREATE TABLE IF NOT EXISTS model_versions (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_id VARCHAR(36) NOT NULL REFERENCES training_jobs(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0.0',
    storage_key VARCHAR(512) NOT NULL,
    status VARCHAR(50) DEFAULT 'Borrador', -- Borrador, En Revisión, Aprobado, Retirado
    checksum VARCHAR(128) NOT NULL,
    accuracy REAL DEFAULT 0.0,
    loss REAL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
