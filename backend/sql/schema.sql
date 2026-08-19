IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        ContactNumber VARCHAR(15) NULL,
        PasswordHash NVARCHAR(500) NOT NULL,
        Role NVARCHAR(50) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
    );
END

IF COL_LENGTH('dbo.Users', 'ContactNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD ContactNumber VARCHAR(15) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Therapies')
BEGIN
    CREATE TABLE dbo.Therapies (
        TherapyId INT IDENTITY(1,1) PRIMARY KEY,
        TherapyName NVARCHAR(150) NOT NULL,
        Cost DECIMAL(10,2) NOT NULL,
        Duration INT NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
IF COL_LENGTH('Therapies', 'Duration') IS NULL ALTER TABLE Therapies ADD Duration INT NULL;
IF COL_LENGTH('Therapies', 'Description') IS NULL ALTER TABLE Therapies ADD Description NVARCHAR(500) NULL;
IF COL_LENGTH('Therapies', 'IsActive') IS NULL ALTER TABLE Therapies ADD IsActive BIT NOT NULL CONSTRAINT DF_Therapies_IsActive DEFAULT 1;
IF COL_LENGTH('Therapies', 'CreatedAt') IS NULL ALTER TABLE Therapies ADD CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Therapies_CreatedAt DEFAULT GETDATE();
IF COL_LENGTH('Therapies', 'UpdatedAt') IS NULL ALTER TABLE Therapies ADD UpdatedAt DATETIME2 NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Therapies_TherapyName') CREATE UNIQUE INDEX UX_Therapies_TherapyName ON Therapies(TherapyName);

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TherapyPrecautions')
BEGIN
    CREATE TABLE dbo.TherapyPrecautions (
        PrecautionId INT IDENTITY(1,1) PRIMARY KEY,
        TherapyId INT NOT NULL,
        PrecautionType VARCHAR(10) NOT NULL CHECK (PrecautionType IN ('PRE', 'POST')),
        PrecautionText NVARCHAR(500) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TherapyPrecautions_Therapies FOREIGN KEY (TherapyId) REFERENCES dbo.Therapies(TherapyId)
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Practitioners')
BEGIN
    CREATE TABLE dbo.Practitioners (
        PractitionerId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        ContactNumber VARCHAR(15) NOT NULL,
        Specialization NVARCHAR(150) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
IF COL_LENGTH('dbo.Practitioners', 'UserId') IS NULL
    ALTER TABLE dbo.Practitioners ADD UserId INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Practitioners_Users')
    ALTER TABLE dbo.Practitioners ADD CONSTRAINT FK_Practitioners_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Practitioners_UserId')
    CREATE UNIQUE INDEX UX_Practitioners_UserId ON dbo.Practitioners(UserId) WHERE UserId IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PractitionerAvailability')
BEGIN
    CREATE TABLE dbo.PractitionerAvailability (
        AvailabilityId INT IDENTITY(1,1) PRIMARY KEY,
        PractitionerId INT NOT NULL,
        DayOfWeek TINYINT NOT NULL CHECK (DayOfWeek BETWEEN 1 AND 7),
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        IsAvailable BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_PractitionerAvailability_Time CHECK (StartTime < EndTime),
        CONSTRAINT FK_PractitionerAvailability_Practitioners FOREIGN KEY (PractitionerId) REFERENCES dbo.Practitioners(PractitionerId)
    );
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PractitionerAvailability_Day')
    CREATE UNIQUE INDEX UX_PractitionerAvailability_Day ON dbo.PractitionerAvailability(PractitionerId, DayOfWeek);

IF COL_LENGTH('dbo.Practitioners', 'Rating') IS NULL
BEGIN
    ALTER TABLE dbo.Practitioners
    ADD Rating DECIMAL(3,2) NULL;
END
GO