-- Manual script: run explicitly only when you decide to backfill Patients.
-- This script does NOT update or delete Users. It only inserts missing Patients rows.

IF OBJECT_ID('dbo.Users', 'U') IS NULL OR OBJECT_ID('dbo.Patients', 'U') IS NULL
BEGIN
    RAISERROR('Required tables dbo.Users and/or dbo.Patients were not found. Run base migrations first.', 16, 1);
    RETURN;
END
GO

SELECT COUNT(1) AS CandidatePatientUsers
FROM dbo.Users u
WHERE LOWER(LTRIM(RTRIM(ISNULL(u.Role, '')))) = 'patient'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.Patients p
      WHERE p.UserId = u.UserId
  );
GO

INSERT INTO dbo.Patients (UserId, CreatedAt)
SELECT u.UserId, GETUTCDATE()
FROM dbo.Users u
WHERE LOWER(LTRIM(RTRIM(ISNULL(u.Role, '')))) = 'patient'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.Patients p
      WHERE p.UserId = u.UserId
  );
GO

SELECT COUNT(1) AS TotalPatientsAfterBackfill
FROM dbo.Patients;
GO
