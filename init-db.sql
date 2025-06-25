-- GIOAT Production Database Initialization
-- This script sets up the production database with proper permissions and initial data

-- Create additional database users for different access levels
CREATE USER gioat_readonly WITH PASSWORD 'readonly_password_here';
CREATE USER gioat_app WITH PASSWORD 'app_password_here';

-- Grant appropriate permissions
GRANT CONNECT ON DATABASE gioat_prod TO gioat_readonly;
GRANT CONNECT ON DATABASE gioat_prod TO gioat_app;

-- Grant schema permissions to app user
GRANT USAGE ON SCHEMA public TO gioat_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gioat_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gioat_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO gioat_app;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA public TO gioat_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO gioat_readonly;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gioat_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gioat_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO gioat_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO gioat_readonly;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_filled_at ON trades(filled_at);
CREATE INDEX IF NOT EXISTS idx_followers_leader_id ON followers(leader_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_orders_follower_id ON copy_orders(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_orders_status ON copy_orders(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_leader_id ON live_sessions(leader_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);

-- Create partial indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_active ON trades(user_id, filled_at) WHERE filled_at > NOW() - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_copy_orders_pending ON copy_orders(follower_id, status) WHERE status = 'QUEUED';

-- Create initial admin user (password should be changed immediately)
INSERT INTO users (
    id, email, first_name, last_name, handle, status, kyc_status, 
    is_verified, mfa_enabled, subscription_tier, created_at, updated_at
) VALUES (
    'admin-user-id',
    'admin@gioat.com',
    'System',
    'Administrator',
    'admin',
    'ACTIVE',
    'APPROVED',
    true,
    true,
    'PREMIUM',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create initial system configuration
INSERT INTO audit_log (
    id, user_id, action, resource, details, ip_address, user_agent, created_at
) VALUES (
    'system-init-log',
    'admin-user-id',
    'SYSTEM_INIT',
    'DATABASE',
    '{"message": "Production database initialized", "version": "1.0.0"}',
    '127.0.0.1',
    'System/1.0',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Set up database monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to archive old trades
CREATE OR REPLACE FUNCTION archive_old_trades()
RETURNS void AS $$
BEGIN
    -- Move trades older than 1 year to archive table (if exists)
    -- This is a placeholder for future implementation
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Set up automatic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT cleanup_old_audit_logs();');
-- SELECT cron.schedule('archive-old-trades', '0 3 * * 0', 'SELECT archive_old_trades();');

-- Create views for common queries
CREATE OR REPLACE VIEW active_users_summary AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_users,
    COUNT(CASE WHEN kyc_status = 'APPROVED' THEN 1 END) as verified_users
FROM users;

CREATE OR REPLACE VIEW copy_trading_summary AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as successful_orders,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
    AVG(CASE WHEN status = 'FILLED' THEN EXTRACT(EPOCH FROM (filled_at - created_at)) END) as avg_execution_time_seconds
FROM copy_orders;

-- Grant access to views
GRANT SELECT ON active_users_summary TO gioat_readonly;
GRANT SELECT ON copy_trading_summary TO gioat_readonly;
GRANT SELECT ON active_users_summary TO gioat_app;
GRANT SELECT ON copy_trading_summary TO gioat_app; 