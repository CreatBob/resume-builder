-- author: Bob
CREATE TABLE IF NOT EXISTS resume_documents (
  id VARCHAR(64) NOT NULL,
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
  INDEX idx_resume_documents_updated_at (deleted_at, updated_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分享字段与唯一索引已在建表语句中定义，避免首次初始化时重复执行 DDL。
