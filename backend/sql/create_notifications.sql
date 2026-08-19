IF OBJECT_ID('dbo.Users', 'U') IS NULL
    OR OBJECT_ID('dbo.TherapyPlans', 'U') IS NULL
    OR OBJECT_ID('dbo.TherapySessions', 'U') IS NULL
BEGIN
    RAISERROR('Required tables dbo.Users, dbo.TherapyPlans, or dbo.TherapySessions were not found. Run prerequisite migrations first.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Notifications', 'NotificationId') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'UserId') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'TherapyPlanId') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'SessionId') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'NotificationType') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'Channel') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'Subject') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'Message') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'Status') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'SentAt') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'ErrorMessage') IS NULL
        OR COL_LENGTH('dbo.Notifications', 'CreatedAt') IS NULL
    BEGIN
        RAISERROR('Existing table dbo.Notifications does not match expected schema. Review manually before continuing.', 16, 1);
        RETURN;
    END
END
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        NotificationId INT IDENTITY(1,1) NOT NULL,
        UserId INT NOT NULL,
        TherapyPlanId INT NULL,
        SessionId INT NULL,
        NotificationType NVARCHAR(40) NOT NULL,
        Channel NVARCHAR(10) NOT NULL,
        Subject NVARCHAR(255) NULL,
        Message NVARCHAR(2000) NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        SentAt DATETIME2 NULL,
        ErrorMessage NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT GETUTCDATE(),
        CONSTRAINT PK_Notifications PRIMARY KEY (NotificationId)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_Notifications_Channel'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT CK_Notifications_Channel CHECK (Channel IN ('EMAIL', 'SMS'));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_Notifications_Status'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT CK_Notifications_Status CHECK (Status IN ('PENDING', 'SENT', 'FAILED'));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_Notifications_NotificationType'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT CK_Notifications_NotificationType CHECK (NotificationType IN (
        'BOOKING_ACCEPTED',
        'BOOKING_REJECTED'
    ));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_Notifications_Users'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT FK_Notifications_Users
        FOREIGN KEY (UserId)
        REFERENCES dbo.Users(UserId)
        ON DELETE NO ACTION;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_Notifications_TherapyPlans'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT FK_Notifications_TherapyPlans
        FOREIGN KEY (TherapyPlanId)
        REFERENCES dbo.TherapyPlans(TherapyPlanId)
        ON DELETE NO ACTION;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_Notifications_TherapySessions'
      AND [parent_object_id] = OBJECT_ID('dbo.Notifications')
)
BEGIN
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT FK_Notifications_TherapySessions
        FOREIGN KEY (SessionId)
        REFERENCES dbo.TherapySessions(SessionId)
        ON DELETE NO ACTION;
END
GO
