-- Create AdminAudit table to record admin grant/revoke events
-- Run this on your MySQL server before using the admin audit feature.

CREATE TABLE IF NOT EXISTS AdminAudit (
  AuditID INT AUTO_INCREMENT PRIMARY KEY,
  ActorWorkerID INT NULL,
  TargetWorkerID INT NOT NULL,
  OldValue TINYINT NOT NULL,
  NewValue TINYINT NOT NULL,
  Reason VARCHAR(255) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (ActorWorkerID),
  INDEX (TargetWorkerID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
