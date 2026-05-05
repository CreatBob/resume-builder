-- author: Bob
CREATE TABLE IF NOT EXISTS resume_documents (
  id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(120) NOT NULL,
  content_json JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  share_token VARCHAR(64) NULL,
  share_enabled TINYINT(1) NOT NULL DEFAULT 0,
  shared_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_resume_documents_share_token (share_token),
  INDEX idx_resume_documents_workspace_updated_at (workspace_id, deleted_at, updated_at, id),
  INDEX idx_resume_documents_updated_at (deleted_at, updated_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @resume_documents_workspace_column_exists = (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'resume_documents'
    AND column_name = 'workspace_id'
);

SET @resume_documents_workspace_column_sql = IF(
  @resume_documents_workspace_column_exists = 0,
  'ALTER TABLE resume_documents ADD COLUMN workspace_id VARCHAR(64) NOT NULL DEFAULT '''' AFTER id',
  'SELECT 1'
);

PREPARE resume_documents_workspace_column_stmt FROM @resume_documents_workspace_column_sql;
EXECUTE resume_documents_workspace_column_stmt;
DEALLOCATE PREPARE resume_documents_workspace_column_stmt;

SET @resume_documents_workspace_index_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'resume_documents'
    AND index_name = 'idx_resume_documents_workspace_updated_at'
);

SET @resume_documents_workspace_index_sql = IF(
  @resume_documents_workspace_index_exists = 0,
  'ALTER TABLE resume_documents ADD INDEX idx_resume_documents_workspace_updated_at (workspace_id, deleted_at, updated_at, id)',
  'SELECT 1'
);

PREPARE resume_documents_workspace_index_stmt FROM @resume_documents_workspace_index_sql;
EXECUTE resume_documents_workspace_index_stmt;
DEALLOCATE PREPARE resume_documents_workspace_index_stmt;

-- 历史共享池数据在升级后默认保留空 workspace_id。
-- 主编辑接口只会命中当前匿名工作区，避免沿用旧的全局共享列表行为。
