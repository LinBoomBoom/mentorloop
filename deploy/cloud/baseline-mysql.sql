-- ============================================================================
-- MentorLoop 云端基准 DDL（微信云托管 Serverless MySQL，实际实例 5.7，兼容 8.0）
-- 版本：1（对应设计稿 MentorLoop/docs/miniapp-cloud-backend-design.md §4）
-- 来源：桌面端 SQLite schema（迁移 v1~v34）整合翻译为单份基准 DDL；云端为新库，不重放历史迁移。
--
-- 翻译规则（§4.2）：
--   TEXT 主键            -> VARCHAR(64)
--   INTEGER 时间戳(ms)   -> BIGINT
--   长文本(content/a/explain) -> MEDIUMTEXT，其余长文本 TEXT
--   JSON 文本(options/providers/vip/messages/choice_review/written_review/weak_points) -> JSON
--   INTEGER 0/1 布尔     -> TINYINT(1)
--   AUTOINCREMENT        -> AUTO_INCREMENT
--   REAL                 -> DOUBLE
-- 附加决策：
--   0) 实例为 MySQL 5.7：JSON 列不支持任何 DEFAULT（含 8.0.13+ 的表达式默认值），
--      users.providers/vip 不设默认值，由应用层写入兜底（M1 mysql2 改造时 INSERT 必须带值）。
--   1) 全部标识符加反引号：auth_codes.`key`、login_attempts.`key`、exam_choice_reviews.`right`、modules.`desc`
--      为 MySQL 保留字，且保持列名与现有 handler SQL 一致（M1 mysql2 改造沿用）。
--   2) progress / user_wrong_items 新增 updated_at（用户数据同步 pull 游标依赖，桌面端 M2 需同步加列）。
--   3) sessions 新增 platform/device/last_active_at（§4.5 规格，现有 handler 未写则走默认值）。
--   4) users.phone / users.email 加索引：wx-phone 按手机号归一双端账号（§5.2）需要。
--   5) checkins.check_date TEXT 'YYYY-MM-DD' -> DATE。
--   6) interview_questions.section_id 无外键（与本地一致），补索引供 by-section 查询。
--   7) draft 内容一并入库（题 936 / 节 101），对外可见性由 API 层 status 门禁保证。
--   8) 字符集 utf8mb4 / utf8mb4_unicode_ci（兼容微信昵称 emoji；避免 0900 排序规则对旧版本 MySQL 的依赖）。
-- 执行：mysql -h <host> -u <user> -p <database> < baseline-mysql.sql
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 内容表（§4.4，云端唯一内容源）
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `modules` (
  `id`       VARCHAR(64)  NOT NULL,
  `name`     VARCHAR(255) NULL,
  `icon`     VARCHAR(255) NULL,
  `color`    VARCHAR(64)  NULL,
  `desc`     TEXT         NULL,
  `position` INT          NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chapters` (
  `id`        VARCHAR(64)  NOT NULL,
  `module_id` VARCHAR(64)  NULL,
  `title`     VARCHAR(255) NULL,
  `goal`      TEXT         NULL,
  `position`  INT          NULL,
  `subtrack`  VARCHAR(64)  NULL,
  PRIMARY KEY (`id`),
  KEY `idx_chapters_module` (`module_id`),
  CONSTRAINT `fk_ch_module` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sections` (
  `id`            VARCHAR(64)   NOT NULL,
  `chapter_id`    VARCHAR(64)   NOT NULL,
  `title`         VARCHAR(255)  NULL,
  `objective`     TEXT          NULL,
  `content`       MEDIUMTEXT    NULL,
  `position`      INT           NULL DEFAULT 0,
  `source_url`    VARCHAR(512)  NULL,
  `source_type`   VARCHAR(32)   NULL,
  `license`       VARCHAR(64)   NULL,
  `rewrite_level` VARCHAR(16)   NULL DEFAULT 'paraphrased',
  `status`        VARCHAR(16)   NULL DEFAULT 'published',
  `reviewed_at`   BIGINT        NULL,
  `version`       INT           NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_sections_status` (`status`),
  KEY `idx_sections_chapter` (`chapter_id`),
  CONSTRAINT `fk_sec_ch` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_questions` (
  `id`              VARCHAR(64)  NOT NULL,
  `track`           VARCHAR(64)  NULL,
  `type`            VARCHAR(32)  NULL,
  `q`               TEXT         NULL,
  `a`               MEDIUMTEXT   NULL,
  `keywords`        TEXT         NULL,
  `weight`          INT          NULL DEFAULT 3,
  `difficulty`      VARCHAR(16)  NULL DEFAULT 'normal',
  `tech`            VARCHAR(64)  NULL,
  `section_id`      VARCHAR(64)  NULL,
  `subtrack`        VARCHAR(64)  NULL,
  `skill`           VARCHAR(255) NULL,
  `source`          VARCHAR(255) NULL,
  `subtrack_detail` VARCHAR(255) NULL,
  `source_type`     VARCHAR(32)  NULL,
  `license`         VARCHAR(64)  NULL,
  `rewrite_level`   VARCHAR(16)  NULL DEFAULT 'paraphrased',
  `status`          VARCHAR(16)  NULL DEFAULT 'published',
  `reviewed_at`     BIGINT       NULL,
  `version`         INT          NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_iq_track_subtrack` (`track`, `subtrack`),
  KEY `idx_iq_track_skill` (`track`, `skill`),
  KEY `idx_iq_status` (`status`),
  KEY `idx_iq_license` (`license`),
  KEY `idx_iq_section` (`section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_sets` (
  `id`       VARCHAR(64)  NOT NULL,
  `name`     VARCHAR(255) NULL,
  `track`    VARCHAR(64)  NULL,
  `level`    VARCHAR(16)  NULL,
  `duration` INT          NULL,
  `vip_only` TINYINT(1)   NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_choices` (
  `id`      VARCHAR(64)  NOT NULL,
  `set_id`  VARCHAR(64)  NULL,
  `tag`     VARCHAR(255) NULL,
  `q`       TEXT         NULL,
  `options` JSON         NULL,
  `answer`  VARCHAR(64)  NULL,
  `explain` MEDIUMTEXT   NULL,
  `multi`   TINYINT(1)   NULL DEFAULT 0,
  `source`  VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ec_set` (`set_id`),
  CONSTRAINT `fk_ec_set` FOREIGN KEY (`set_id`) REFERENCES `exam_sets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_written` (
  `id`        VARCHAR(64)  NOT NULL,
  `set_id`    VARCHAR(64)  NULL,
  `q`         TEXT         NULL,
  `points`    TEXT         NULL,
  `reference` TEXT         NULL,
  `source`    VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ew_set` (`set_id`),
  CONSTRAINT `fk_ew_set` FOREIGN KEY (`set_id`) REFERENCES `exam_sets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_section_map` (
  `skill_key`   VARCHAR(64)  NOT NULL,
  `section_id`  VARCHAR(64)  NOT NULL,
  `score`       INT          NULL DEFAULT 0,
  `track`       VARCHAR(64)  NULL,
  `subtrack_id` VARCHAR(64)  NULL,
  `skill_name`  VARCHAR(255) NULL,
  PRIMARY KEY (`skill_key`, `section_id`),
  KEY `idx_ssm_section` (`section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id`          VARCHAR(64)  NOT NULL,
  `company`     VARCHAR(255) NULL,
  `title`       VARCHAR(255) NULL,
  `track`       VARCHAR(64)  NULL,
  `city`        VARCHAR(64)  NULL,
  `level`       VARCHAR(16)  NULL,
  `type`        VARCHAR(16)  NULL,
  `requirement` TEXT         NULL,
  `intro`       TEXT         NULL,
  `contact`     VARCHAR(255) NULL,
  `created_at`  BIGINT       NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 用户表（§4.5，云端权威；用户数据不搬迁，结构先行建好）
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`         VARCHAR(64)  NOT NULL,
  `username`   VARCHAR(64)  NULL,
  `nickname`   VARCHAR(255) NULL,
  `email`      VARCHAR(255) NULL,
  `phone`      VARCHAR(32)  NULL,
  `password`   VARCHAR(255) NULL,
  `avatar`     VARCHAR(512) NULL,
  `providers`  JSON         NULL,
  `vip`        JSON         NULL,
  `created_at` BIGINT       NULL,
  `role`       VARCHAR(16)  NULL DEFAULT 'user',
  `banned`     TINYINT(1)   NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auth_identities` (
  `id`           VARCHAR(64)  NOT NULL,
  `user_id`      VARCHAR(64)  NOT NULL,
  `provider`     VARCHAR(32)  NOT NULL,
  `provider_uid` VARCHAR(128) NOT NULL,
  `unionid`      VARCHAR(128) NULL,
  `created_at`   BIGINT       NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_provider_uid` (`provider`, `provider_uid`),
  KEY `idx_auth_user` (`user_id`),
  CONSTRAINT `fk_auth_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `token`          VARCHAR(128) NOT NULL,
  `user_id`        VARCHAR(64)  NULL,
  `created_at`     BIGINT       NULL,
  `expires_at`     BIGINT       NULL,
  `platform`       VARCHAR(16)  NULL DEFAULT 'desktop',
  `device`         VARCHAR(255) NULL,
  `last_active_at` BIGINT       NULL,
  PRIMARY KEY (`token`),
  KEY `idx_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `progress` (
  `user_id`    VARCHAR(64) NOT NULL,
  `module_id`  VARCHAR(64) NULL,
  `chapter_id` VARCHAR(64) NULL,
  `section_id` VARCHAR(64) NOT NULL,
  `done_at`    BIGINT      NULL,
  `updated_at` BIGINT      NULL,
  PRIMARY KEY (`user_id`, `section_id`),
  CONSTRAINT `fk_prog_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_skill_mastery` (
  `user_id`          VARCHAR(64)  NOT NULL,
  `skill_key`        VARCHAR(64)  NOT NULL,
  `track`            VARCHAR(64)  NOT NULL,
  `subtrack_id`      VARCHAR(64)  NOT NULL,
  `skill_name`       VARCHAR(255) NOT NULL,
  `marked`           TINYINT(1)   NULL DEFAULT 0,
  `practiced_correct` INT         NULL DEFAULT 0,
  `practiced_total`  INT          NULL DEFAULT 0,
  `exam_correct`     INT          NULL DEFAULT 0,
  `exam_total`       INT          NULL DEFAULT 0,
  `learned_sections` INT          NULL DEFAULT 0,
  `learned_total`    INT          NULL DEFAULT 0,
  `updated_at`       BIGINT       NULL,
  PRIMARY KEY (`user_id`, `skill_key`),
  CONSTRAINT `fk_usm_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_wrong_items` (
  `id`             VARCHAR(64)  NOT NULL,
  `user_id`        VARCHAR(64)  NOT NULL,
  `source`         VARCHAR(16)  NOT NULL,
  `item_id`        VARCHAR(64)  NOT NULL,
  `track`          VARCHAR(64)  NULL,
  `subtrack_id`    VARCHAR(64)  NULL,
  `skill_key`      VARCHAR(64)  NULL,
  `q`              TEXT         NULL,
  `user_answer`    TEXT         NULL,
  `answer`         TEXT         NULL,
  `wrong_count`    INT          NULL DEFAULT 1,
  `next_review_at` BIGINT       NULL,
  `reviewed_at`    BIGINT       NULL,
  `created_at`     BIGINT       NULL,
  `updated_at`     BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_uwi_user_review` (`user_id`, `next_review_at`),
  CONSTRAINT `fk_uwi_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_attempts` (
  `id`         VARCHAR(64) NOT NULL,
  `user_id`    VARCHAR(64) NOT NULL,
  `set_id`     VARCHAR(64) NOT NULL,
  `started_at` BIGINT      NOT NULL,
  `status`     VARCHAR(16) NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_ea_user` (`user_id`),
  KEY `idx_ea_set` (`set_id`),
  CONSTRAINT `fk_ea_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ea_set` FOREIGN KEY (`set_id`) REFERENCES `exam_sets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 注意：UNIQUE(user_id, set_id, submit_nonce) 中 submit_nonce 允许 NULL，
-- MySQL 对含 NULL 的唯一键不生效（历史旧行 nonce 为空可并存），新写入行由服务端保证 nonce 非空。
CREATE TABLE IF NOT EXISTS `exam_records` (
  `id`             VARCHAR(64)  NOT NULL,
  `user_id`        VARCHAR(64)  NULL,
  `set_id`         VARCHAR(64)  NULL,
  `set_name`       VARCHAR(255) NULL,
  `track`          VARCHAR(64)  NULL,
  `score`          INT          NULL,
  `correct`        INT          NULL,
  `total`          INT          NULL,
  `weak_points`    JSON         NULL,
  `level`          VARCHAR(16)  NULL,
  `advice`         TEXT         NULL,
  `used_seconds`   INT          NULL,
  `choice_review`  JSON         NULL,
  `written_review` JSON         NULL,
  `created_at`     BIGINT       NULL,
  `submit_nonce`   VARCHAR(64)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_er_submit` (`user_id`, `set_id`, `submit_nonce`),
  KEY `idx_er_user` (`user_id`),
  CONSTRAINT `fk_er_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_choice_reviews` (
  `id`          VARCHAR(64) NOT NULL,
  `record_id`   VARCHAR(64) NOT NULL,
  `choice_id`   VARCHAR(64) NULL,
  `q`           TEXT        NULL,
  `options`     JSON        NULL,
  `user_answer` TEXT        NULL,
  `answer`      VARCHAR(64) NULL,
  `right`       TINYINT(1)  NULL,
  `explain`     MEDIUMTEXT  NULL,
  `tag`         VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ecr_record` (`record_id`),
  CONSTRAINT `fk_ecr_record` FOREIGN KEY (`record_id`) REFERENCES `exam_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_written_reviews` (
  `id`          VARCHAR(64) NOT NULL,
  `record_id`   VARCHAR(64) NOT NULL,
  `written_id`  VARCHAR(64) NULL,
  `q`           TEXT        NULL,
  `user_answer` TEXT        NULL,
  `reference`   TEXT        NULL,
  `points`      TEXT        NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ewr_record` (`record_id`),
  CONSTRAINT `fk_ewr_record` FOREIGN KEY (`record_id`) REFERENCES `exam_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_sessions` (
  `id`            VARCHAR(64)  NOT NULL,
  `user_id`       VARCHAR(64)  NOT NULL,
  `track`         VARCHAR(64)  NULL,
  `level`         VARCHAR(16)  NULL,
  `goal`          TEXT         NULL,
  `status`        VARCHAR(16)  NULL DEFAULT 'active',
  `messages`      JSON         NULL,
  `turns`         INT          NULL DEFAULT 0,
  `score`         DOUBLE       NULL,
  `summary`       TEXT         NULL,
  `created_at`    BIGINT       NULL,
  `updated_at`    BIGINT       NULL,
  `finished_at`   BIGINT       NULL,
  `mode`          VARCHAR(16)  NULL DEFAULT 'text',
  `recording_url` VARCHAR(512) NULL,
  `duration_ms`   BIGINT       NULL,
  `consent_at`    BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_is_user` (`user_id`),
  CONSTRAINT `fk_is_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_transcripts` (
  `id`         VARCHAR(64) NOT NULL,
  `session_id` VARCHAR(64) NOT NULL,
  `turn`       INT         NULL,
  `role`       VARCHAR(16) NULL,
  `text`       MEDIUMTEXT  NULL,
  `confidence` DOUBLE      NULL,
  `audio_url`  VARCHAR(512) NULL,
  `created_at` BIGINT      NULL,
  PRIMARY KEY (`id`),
  KEY `idx_it_session` (`session_id`),
  CONSTRAINT `fk_it_session` FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_media` (
  `id`         VARCHAR(64)  NOT NULL,
  `session_id` VARCHAR(64)  NOT NULL,
  `kind`       VARCHAR(32)  NULL,
  `url`        VARCHAR(512) NULL,
  `created_at` BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_im_session` (`session_id`),
  CONSTRAINT `fk_im_session` FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `study_plans` (
  `id`         VARCHAR(64) NOT NULL,
  `user_id`    VARCHAR(64) NOT NULL,
  `track`      VARCHAR(64) NULL,
  `weak_points` JSON       NULL,
  `plan`       MEDIUMTEXT  NULL,
  `created_at` BIGINT      NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sp_user` (`user_id`),
  CONSTRAINT `fk_sp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_questions` (
  `id`                 VARCHAR(64)  NOT NULL,
  `user_id`            VARCHAR(64)  NOT NULL,
  `track`              VARCHAR(64)  NULL,
  `raw_question`       TEXT         NOT NULL,
  `enhanced_title`     VARCHAR(512) NULL,
  `enhanced_tags`      TEXT         NULL,
  `ai_answer`          MEDIUMTEXT   NULL,
  `status`             VARCHAR(16)  NULL DEFAULT 'pending',
  `created_at`         BIGINT       NULL,
  `updated_at`         BIGINT       NULL,
  `result_question_id` VARCHAR(64)  NULL,
  `reviewed_at`        BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_uq_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_answer_cache` (
  `q_hash`     VARCHAR(64)  NOT NULL,
  `track`      VARCHAR(64)  NULL,
  `answer`     MEDIUMTEXT   NOT NULL,
  `enhanced`   MEDIUMTEXT   NULL,
  `model`      VARCHAR(64)  NULL,
  `created_at` BIGINT       NULL,
  PRIMARY KEY (`q_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `resume_diags` (
  `id`           VARCHAR(64) NOT NULL,
  `user_id`      VARCHAR(64) NOT NULL,
  `content_hash` VARCHAR(64) NULL,
  `content`      MEDIUMTEXT  NULL,
  `result`       MEDIUMTEXT  NULL,
  `created_at`   BIGINT      NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rd_user` (`user_id`),
  CONSTRAINT `fk_rd_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`               VARCHAR(64)  NOT NULL,
  `user_id`          VARCHAR(64)  NOT NULL,
  `plan_id`          VARCHAR(64)  NOT NULL,
  `amount`           INT          NOT NULL,
  `currency`         VARCHAR(8)   NULL DEFAULT 'CNY',
  `status`           VARCHAR(16)  NULL DEFAULT 'pending',
  `provider`         VARCHAR(16)  NULL,
  `provider_order_id` VARCHAR(64) NULL,
  `subject`          VARCHAR(255) NULL,
  `created_at`       BIGINT       NULL,
  `paid_at`          BIGINT       NULL,
  `expire_at`        BIGINT       NULL,
  `meta`             TEXT         NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`          VARCHAR(64) NOT NULL,
  `user_id`     VARCHAR(64) NOT NULL,
  `plan_id`     VARCHAR(64) NOT NULL,
  `level`       INT         NOT NULL,
  `status`      VARCHAR(16) NULL DEFAULT 'active',
  `auto_renew`  TINYINT(1)  NULL DEFAULT 0,
  `start_at`    BIGINT      NULL,
  `expire_at`   BIGINT      NULL,
  `created_at`  BIGINT      NULL,
  `canceled_at` BIGINT      NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user` (`user_id`),
  CONSTRAINT `fk_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checkins` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`    VARCHAR(64) NOT NULL,
  `check_date` DATE        NOT NULL,
  `created_at` BIGINT      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_checkin_user_date` (`user_id`, `check_date`),
  CONSTRAINT `fk_checkin_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referral_applications` (
  `id`          VARCHAR(64)  NOT NULL,
  `user_id`     VARCHAR(64)  NOT NULL,
  `referral_id` VARCHAR(64)  NOT NULL,
  `name`        VARCHAR(255) NULL,
  `contact`     VARCHAR(255) NULL,
  `note`        TEXT         NULL,
  `status`      VARCHAR(16)  NULL DEFAULT 'pending',
  `created_at`  BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ra_user` (`user_id`),
  KEY `idx_ra_referral` (`referral_id`),
  CONSTRAINT `fk_ra_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ra_referral` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `key`          VARCHAR(255) NOT NULL,
  `fails`        INT          NULL DEFAULT 0,
  `locked_until` BIGINT       NULL DEFAULT 0,
  `updated_at`   BIGINT       NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auth_codes` (
  `key`        VARCHAR(255) NOT NULL,
  `code`       VARCHAR(32)  NULL,
  `expires_at` BIGINT       NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         VARCHAR(64)  NOT NULL,
  `admin_id`   VARCHAR(64)  NULL,
  `action`     VARCHAR(64)  NULL,
  `target`     VARCHAR(255) NULL,
  `meta`       TEXT         NULL,
  `created_at` BIGINT       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 元数据与同步基础设施（§4.6）
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `meta` (
  `key`   VARCHAR(64) NOT NULL,
  `value` TEXT        NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 内容增量日志：全局版本链（内容表一切变更必须经 push 写入本表，禁止绕过直改）
CREATE TABLE IF NOT EXISTS `content_changes` (
  `seq`        BIGINT      NOT NULL AUTO_INCREMENT,
  `tbl`        VARCHAR(64) NOT NULL,
  `row_id`     VARCHAR(64) NOT NULL,
  `version`    BIGINT      NOT NULL,
  `op`         VARCHAR(16) NOT NULL DEFAULT 'upsert',
  `changed_at` BIGINT      NOT NULL,
  PRIMARY KEY (`seq`),
  KEY `idx_cc_version` (`version`, `seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设备同步游标（服务端留档）
CREATE TABLE IF NOT EXISTS `sync_state` (
  `user_id`          VARCHAR(64) NOT NULL,
  `device_id`        VARCHAR(64) NOT NULL,
  `last_push_at`     BIGINT      NULL,
  `last_pull_cursor` BIGINT      NULL,
  PRIMARY KEY (`user_id`, `device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 云端 schema 演进登记（与本地 SQLite schema_migrations 同构；后续 DDL 变更追加新版本行）
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version`    INT          NOT NULL,
  `name`       VARCHAR(255) NULL,
  `applied_at` BIGINT       NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `schema_migrations` (`version`, `name`, `applied_at`)
VALUES (1, 'baseline-cloud-mysql', UNIX_TIMESTAMP() * 1000);
