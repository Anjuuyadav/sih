IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(500) NOT NULL,
        Role NVARCHAR(50) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Doctors')
-- BEGIN
--     CREATE TABLE Doctors (
--         DoctorId INT IDENTITY(1,1) PRIMARY KEY,
--         UserId INT NOT NULL,
--         Specialization NVARCHAR(255) NULL,
--         Qualification NVARCHAR(255) NULL,
--         ExperienceYears INT NULL,
--         DailyPatientLimit INT NULL,
--         StartTime TIME NULL,
--         EndTime TIME NULL,
--         IsActive BIT NOT NULL DEFAULT 1,
--         CONSTRAINT FK_Doctors_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
--     );
-- END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Patients')
-- BEGIN
--     CREATE TABLE Patients (
--         PatientId INT IDENTITY(1,1) PRIMARY KEY,
--         UserId INT NOT NULL,
--         DOB DATE NULL,
--         Gender NVARCHAR(50) NULL,
--         Height DECIMAL(5,2) NULL,
--         Weight DECIMAL(5,2) NULL,
--         BloodGroup NVARCHAR(10) NULL,
--         Address NVARCHAR(500) NULL,
--         EmergencyContact NVARCHAR(100) NULL,
--         RegistrationDate DATE NULL,
--         CONSTRAINT FK_Patients_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
--     );
-- END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Symptoms')
-- BEGIN
--     CREATE TABLE Symptoms (
--         SymptomId INT IDENTITY(1,1) PRIMARY KEY,
--         SymptomName NVARCHAR(255) NOT NULL UNIQUE,
--         Description NVARCHAR(MAX) NULL
--     );
-- END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Therapies')
-- BEGIN
--     CREATE TABLE Therapies (
--         TherapyId INT IDENTITY(1,1) PRIMARY KEY,
--         TherapyName NVARCHAR(255) NOT NULL,
--         Description NVARCHAR(MAX) NULL,
--         DurationDays INT NOT NULL DEFAULT 0,
--         DurationMinutes INT NULL,
--         Cost DECIMAL(10,2) NOT NULL DEFAULT 0,
--         IsActive BIT NOT NULL DEFAULT 1,
--         CreatedBy INT NOT NULL,
--         CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
--         CONSTRAINT FK_Therapies_Users FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
--     );
-- END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TherapySymptoms')
-- BEGIN
--     CREATE TABLE TherapySymptoms (
--         TherapySymptomId INT IDENTITY(1,1) PRIMARY KEY,
--         TherapyId INT NOT NULL,
--         SymptomId INT NOT NULL,
--         Priority INT NOT NULL,
--         CONSTRAINT FK_TherapySymptoms_Therapies FOREIGN KEY (TherapyId) REFERENCES Therapies(TherapyId),
--         CONSTRAINT FK_TherapySymptoms_Symptoms FOREIGN KEY (SymptomId) REFERENCES Symptoms(SymptomId),
--         CONSTRAINT UQ_TherapySymptoms UNIQUE (TherapyId, SymptomId)
--     );
-- END

-- IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TherapyPrecautions')
-- BEGIN
--     CREATE TABLE TherapyPrecautions (
--         PrecautionId INT IDENTITY(1,1) PRIMARY KEY,
--         TherapyId INT NOT NULL,
--         Type NVARCHAR(10) NOT NULL,
--         Description NVARCHAR(MAX) NOT NULL,
--         CONSTRAINT FK_TherapyPrecautions_Therapies FOREIGN KEY (TherapyId) REFERENCES Therapies(TherapyId)
--     );
-- END
