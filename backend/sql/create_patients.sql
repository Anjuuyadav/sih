IF OBJECT_ID('dbo.Users', 'U') IS NULL OR COL_LENGTH('dbo.Users', 'UserId') IS NULL
BEGIN
    RAISERROR('Required table/column dbo.Users(UserId) was not found. Run base schema migration first.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID('dbo.Patients', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Patients', 'PatientId') IS NULL
        OR COL_LENGTH('dbo.Patients', 'UserId') IS NULL
        OR COL_LENGTH('dbo.Patients', 'CreatedAt') IS NULL
        OR COL_LENGTH('dbo.Patients', 'UpdatedAt') IS NULL
    BEGIN
        RAISERROR('Existing table dbo.Patients does not match expected schema. Review manually before continuing.', 16, 1);
        RETURN;
    END
END
GO

IF OBJECT_ID('dbo.Patients', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Patients (
        PatientId INT IDENTITY(1,1) NOT NULL,
        UserId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Patients_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT PK_Patients PRIMARY KEY (PatientId)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [type] = 'UQ'
      AND [name] = 'UQ_Patients_UserId'
      AND [parent_object_id] = OBJECT_ID('dbo.Patients')
)
BEGIN
    ALTER TABLE dbo.Patients
    ADD CONSTRAINT UQ_Patients_UserId UNIQUE (UserId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE [name] = 'FK_Patients_Users'
      AND [parent_object_id] = OBJECT_ID('dbo.Patients')
)
BEGIN
    ALTER TABLE dbo.Patients
    ADD CONSTRAINT FK_Patients_Users
        FOREIGN KEY (UserId)
        REFERENCES dbo.Users(UserId)
        ON DELETE NO ACTION;
END
GO
