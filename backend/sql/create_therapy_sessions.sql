IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NULL OR OBJECT_ID('dbo.Practitioners', 'U') IS NULL
BEGIN
    RAISERROR('Required tables dbo.TherapyPlans or dbo.Practitioners were not found. Run prerequisite migrations first.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID('dbo.TherapySessions', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.TherapySessions', 'SessionId') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'TherapyPlanId') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'PractitionerId') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'SessionNumber') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'SessionDate') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'StartTime') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'EndTime') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'Status') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'CreatedAt') IS NULL
        OR COL_LENGTH('dbo.TherapySessions', 'UpdatedAt') IS NULL
    BEGIN
        RAISERROR('Existing table dbo.TherapySessions does not match expected schema. Review manually before continuing.', 16, 1);
        RETURN;
    END
END
GO

IF OBJECT_ID('dbo.TherapySessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TherapySessions (
        SessionId INT IDENTITY(1,1) NOT NULL,
        TherapyPlanId INT NOT NULL,
        PractitionerId INT NOT NULL,
        SessionNumber INT NOT NULL,
        SessionDate DATE NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TherapySessions_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT PK_TherapySessions PRIMARY KEY (SessionId)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapySessions_SessionNumber_Positive'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT CK_TherapySessions_SessionNumber_Positive CHECK (SessionNumber > 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapySessions_TimeRange'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT CK_TherapySessions_TimeRange CHECK (StartTime < EndTime);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapySessions_Status'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT CK_TherapySessions_Status CHECK (Status IN (
        'PENDING',
        'CONFIRMED',
        'COMPLETED',
        'MISSED',
        'CANCELLED',
        'REJECTED'
    ));
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [type] = 'UQ'
      AND [name] = 'UQ_TherapySessions_TherapyPlanId_SessionNumber'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT UQ_TherapySessions_TherapyPlanId_SessionNumber UNIQUE (TherapyPlanId, SessionNumber);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapySessions_TherapyPlans'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT FK_TherapySessions_TherapyPlans
        FOREIGN KEY (TherapyPlanId)
        REFERENCES dbo.TherapyPlans(TherapyPlanId)
        ON DELETE NO ACTION;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapySessions_Practitioners'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapySessions')
)
BEGIN
    ALTER TABLE dbo.TherapySessions
    ADD CONSTRAINT FK_TherapySessions_Practitioners
        FOREIGN KEY (PractitionerId)
        REFERENCES dbo.Practitioners(PractitionerId)
        ON DELETE NO ACTION;
END
GO
