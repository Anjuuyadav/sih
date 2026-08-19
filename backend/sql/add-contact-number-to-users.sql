USE panchkarmaDb;
GO

IF COL_LENGTH('dbo.Users', 'ContactNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD ContactNumber VARCHAR(15) NULL;
END
GO
