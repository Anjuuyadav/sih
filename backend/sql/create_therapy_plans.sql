IF OBJECT_ID('dbo.Patients', 'U') IS NULL
    OR OBJECT_ID('dbo.Therapies', 'U') IS NULL
    OR OBJECT_ID('dbo.Practitioners', 'U') IS NULL
BEGIN
    RAISERROR('Required tables dbo.Patients, dbo.Therapies, or dbo.Practitioners were not found. Run prerequisite migrations first.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.TherapyPlans', 'TherapyPlanId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'PatientId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'TherapyId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'PractitionerId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'NumberOfSessions') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'PreferredStartDate') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'PreferredTime') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'Status') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'DurationMinutes') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'CostPerSession') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'TotalCost') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'RejectionReason') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'CreatedAt') IS NULL
        OR COL_LENGTH('dbo.TherapyPlans', 'UpdatedAt') IS NULL
    BEGIN
        RAISERROR('Existing table dbo.TherapyPlans does not match expected schema. Review manually before continuing.', 16, 1);
        RETURN;
    END
END
GO

IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TherapyPlans (
        TherapyPlanId INT IDENTITY(1,1) NOT NULL,
        PatientId INT NOT NULL,
        TherapyId INT NOT NULL,
        PractitionerId INT NOT NULL,
        NumberOfSessions INT NOT NULL,
        PreferredStartDate DATE NOT NULL,
        PreferredTime TIME NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        DurationMinutes INT NOT NULL,
        CostPerSession DECIMAL(10,2) NOT NULL,
        TotalCost DECIMAL(12,2) NOT NULL,
        RejectionReason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TherapyPlans_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT PK_TherapyPlans PRIMARY KEY (TherapyPlanId)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlans_NumberOfSessions_Positive'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT CK_TherapyPlans_NumberOfSessions_Positive CHECK (NumberOfSessions > 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlans_DurationMinutes_Positive'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT CK_TherapyPlans_DurationMinutes_Positive CHECK (DurationMinutes > 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlans_CostPerSession_NonNegative'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT CK_TherapyPlans_CostPerSession_NonNegative CHECK (CostPerSession >= 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlans_TotalCost_NonNegative'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT CK_TherapyPlans_TotalCost_NonNegative CHECK (TotalCost >= 0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlans_Status'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT CK_TherapyPlans_Status CHECK (Status IN (
        'PENDING',
        'CONFIRMED',
        'REJECTED',
        'CANCELLED',
        'COMPLETED'
    ));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapyPlans_Patients'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT FK_TherapyPlans_Patients
        FOREIGN KEY (PatientId)
        REFERENCES dbo.Patients(PatientId)
        ON DELETE NO ACTION;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapyPlans_Therapies'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT FK_TherapyPlans_Therapies
        FOREIGN KEY (TherapyId)
        REFERENCES dbo.Therapies(TherapyId)
        ON DELETE NO ACTION;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapyPlans_Practitioners'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlans')
)
BEGIN
    ALTER TABLE dbo.TherapyPlans
    ADD CONSTRAINT FK_TherapyPlans_Practitioners
        FOREIGN KEY (PractitionerId)
        REFERENCES dbo.Practitioners(PractitionerId)
        ON DELETE NO ACTION;
END
GO
