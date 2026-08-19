IF OBJECT_ID('dbo.TherapySessions', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_TherapySessions_PractitionerDateStatusTime'
          AND [object_id] = OBJECT_ID('dbo.TherapySessions')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TherapySessions_PractitionerDateStatusTime
        ON dbo.TherapySessions (PractitionerId, SessionDate, Status, StartTime, EndTime)
        INCLUDE (TherapyPlanId, SessionNumber);
    END
END
GO

IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_TherapyPlans_PatientStatusCreatedAt'
          AND [object_id] = OBJECT_ID('dbo.TherapyPlans')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TherapyPlans_PatientStatusCreatedAt
        ON dbo.TherapyPlans (PatientId, Status, CreatedAt DESC);
    END
END
GO

IF OBJECT_ID('dbo.TherapyPlans', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_TherapyPlans_PractitionerStatusCreatedAt'
          AND [object_id] = OBJECT_ID('dbo.TherapyPlans')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TherapyPlans_PractitionerStatusCreatedAt
        ON dbo.TherapyPlans (PractitionerId, Status, CreatedAt DESC);
    END
END
GO

IF OBJECT_ID('dbo.TherapyPlanPreferredDays', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_TherapyPlanPreferredDays_TherapyPlanId_DayOfWeek'
          AND [object_id] = OBJECT_ID('dbo.TherapyPlanPreferredDays')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TherapyPlanPreferredDays_TherapyPlanId_DayOfWeek
        ON dbo.TherapyPlanPreferredDays (TherapyPlanId, DayOfWeek);
    END
END
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_Notifications_UserId_CreatedAt'
          AND [object_id] = OBJECT_ID('dbo.Notifications')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Notifications_UserId_CreatedAt
        ON dbo.Notifications (UserId, CreatedAt DESC);
    END
END
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE [name] = 'IX_Notifications_TherapyPlanId_CreatedAt'
          AND [object_id] = OBJECT_ID('dbo.Notifications')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Notifications_TherapyPlanId_CreatedAt
        ON dbo.Notifications (TherapyPlanId, CreatedAt DESC);
    END
END
GO
