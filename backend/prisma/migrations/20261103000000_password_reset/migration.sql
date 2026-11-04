CREATE TABLE [dbo].[PasswordReset] (
    [userId] NVARCHAR(30) NOT NULL,
    [codeHash] CHAR(64) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [PasswordReset_attempts_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PasswordReset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PasswordReset_pkey] PRIMARY KEY CLUSTERED ([userId]),
    CONSTRAINT [PasswordReset_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);
