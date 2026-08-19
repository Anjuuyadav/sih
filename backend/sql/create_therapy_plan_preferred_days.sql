IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NULL
BEGIN
    RAISERROR('Required table dbo.TherapyPlans was not found. Run create_therapy_plans.sql first.', 16, 1);
    RETURN;
END
GO

IF OBJECT_ID('dbo.TherapyPlanPreferredDays', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.TherapyPlanPreferredDays', 'TherapyPlanPreferredDayId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlanPreferredDays', 'TherapyPlanId') IS NULL
        OR COL_LENGTH('dbo.TherapyPlanPreferredDays', 'DayOfWeek') IS NULL
        OR COL_LENGTH('dbo.TherapyPlanPreferredDays', 'CreatedAt') IS NULL
    BEGIN
        RAISERROR('Existing table dbo.TherapyPlanPreferredDays does not match expected schema. Review manually before continuing.', 16, 1);
        RETURN;
    END
END
GO

IF OBJECT_ID('dbo.TherapyPlanPreferredDays', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TherapyPlanPreferredDays (
        TherapyPlanPreferredDayId INT IDENTITY(1,1) NOT NULL,
        TherapyPlanId INT NOT NULL,
        DayOfWeek TINYINT NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TherapyPlanPreferredDays_CreatedAt DEFAULT GETUTCDATE(),
        CONSTRAINT PK_TherapyPlanPreferredDays PRIMARY KEY (TherapyPlanPreferredDayId)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_TherapyPlanPreferredDays_DayOfWeek'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlanPreferredDays')
)
BEGIN
    ALTER TABLE dbo.TherapyPlanPreferredDays
    ADD CONSTRAINT CK_TherapyPlanPreferredDays_DayOfWeek CHECK (DayOfWeek BETWEEN 1 AND 7);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [type] = 'UQ'
      AND [name] = 'UQ_TherapyPlanPreferredDays_TherapyPlanId_DayOfWeek'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlanPreferredDays')
)
BEGIN
    ALTER TABLE dbo.TherapyPlanPreferredDays
    ADD CONSTRAINT UQ_TherapyPlanPreferredDays_TherapyPlanId_DayOfWeek UNIQUE (TherapyPlanId, DayOfWeek);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = 'FK_TherapyPlanPreferredDays_TherapyPlans'
      AND [parent_object_id] = OBJECT_ID('dbo.TherapyPlanPreferredDays')
)
BEGIN
    ALTER TABLE dbo.TherapyPlanPreferredDays
    ADD CONSTRAINT FK_TherapyPlanPreferredDays_TherapyPlans
        FOREIGN KEY (TherapyPlanId)
        REFERENCES dbo.TherapyPlans(TherapyPlanId)
        ON DELETE NO ACTION;
END
GO
