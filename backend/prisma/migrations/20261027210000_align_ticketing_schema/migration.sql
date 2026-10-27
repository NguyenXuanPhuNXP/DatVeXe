-- Additive reconciliation for objects verified missing in dbo.
-- No existing rows or objects are deleted or rewritten.

IF COL_LENGTH(N'dbo.Booking', N'qrVersion') IS NULL
BEGIN
  ALTER TABLE [dbo].[Booking]
    ADD [qrVersion] INT NOT NULL
      CONSTRAINT [Booking_qrVersion_df] DEFAULT 1 WITH VALUES;
END;

IF COL_LENGTH(N'dbo.Ticket', N'checkedInAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[Ticket] ADD [checkedInAt] DATETIME2(7) NULL;
END;

IF COL_LENGTH(N'dbo.Ticket', N'checkedInById') IS NULL
BEGIN
  ALTER TABLE [dbo].[Ticket] ADD [checkedInById] NVARCHAR(30) NULL;
END;

IF OBJECT_ID(N'dbo.BookingAnomalyReview', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[BookingAnomalyReview] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BookingAnomalyReview_status_df] DEFAULT 'open',
    [note] NVARCHAR(500) NULL,
    [reviewedById] NVARCHAR(30) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BookingAnomalyReview_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2(7) NOT NULL,
    CONSTRAINT [BookingAnomalyReview_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BookingAnomalyReview_bookingId_key] UNIQUE NONCLUSTERED ([bookingId]),
    CONSTRAINT [BookingAnomalyReview_bookingId_fkey] FOREIGN KEY ([bookingId])
      REFERENCES [dbo].[Booking] ([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [BookingAnomalyReview_reviewedById_fkey] FOREIGN KEY ([reviewedById])
      REFERENCES [dbo].[User] ([id]) ON DELETE SET NULL ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.BookingAnomalyReview')
    AND [name] = N'BookingAnomalyReview_status_updatedAt_idx'
)
  CREATE INDEX [BookingAnomalyReview_status_updatedAt_idx]
    ON [dbo].[BookingAnomalyReview] ([status], [updatedAt]);

IF OBJECT_ID(N'dbo.CompanyMembership', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[CompanyMembership] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(30) NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [role] NVARCHAR(20) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [CompanyMembership_isActive_df] DEFAULT 1,
    CONSTRAINT [CompanyMembership_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompanyMembership_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [CompanyMembership_userId_fkey] FOREIGN KEY ([userId])
      REFERENCES [dbo].[User] ([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [CompanyMembership_companyId_fkey] FOREIGN KEY ([companyId])
      REFERENCES [dbo].[BusCompany] ([id]) ON DELETE NO ACTION ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.CompanyMembership')
    AND [name] = N'CompanyMembership_companyId_role_idx'
)
  CREATE INDEX [CompanyMembership_companyId_role_idx]
    ON [dbo].[CompanyMembership] ([companyId], [role]);

IF OBJECT_ID(N'dbo.PaymentReceipt', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[PaymentReceipt] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [amount] INT NOT NULL,
    [method] NVARCHAR(20) NOT NULL,
    [reference] NVARCHAR(100) NULL,
    [receivedById] NVARCHAR(30) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL CONSTRAINT [PaymentReceipt_receivedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PaymentReceipt_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentReceipt_bookingId_key] UNIQUE NONCLUSTERED ([bookingId]),
    CONSTRAINT [PaymentReceipt_bookingId_fkey] FOREIGN KEY ([bookingId])
      REFERENCES [dbo].[Booking] ([id]) ON DELETE NO ACTION ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.PaymentReceipt')
    AND [name] = N'PaymentReceipt_receivedAt_idx'
)
  CREATE INDEX [PaymentReceipt_receivedAt_idx]
    ON [dbo].[PaymentReceipt] ([receivedAt]);

IF OBJECT_ID(N'dbo.PaymentAttempt', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[PaymentAttempt] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [orderId] NVARCHAR(100) NOT NULL,
    [requestId] NVARCHAR(100) NOT NULL,
    [amount] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL CONSTRAINT [PaymentAttempt_status_df] DEFAULT 'pending',
    [payUrl] NVARCHAR(2000) NULL,
    [transId] NVARCHAR(100) NULL,
    [resultCode] INT NULL,
    [message] NVARCHAR(500) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentAttempt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2(7) NOT NULL,
    CONSTRAINT [PaymentAttempt_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentAttempt_orderId_key] UNIQUE NONCLUSTERED ([orderId]),
    CONSTRAINT [PaymentAttempt_requestId_key] UNIQUE NONCLUSTERED ([requestId]),
    CONSTRAINT [PaymentAttempt_bookingId_fkey] FOREIGN KEY ([bookingId])
      REFERENCES [dbo].[Booking] ([id]) ON DELETE NO ACTION ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.PaymentAttempt')
    AND [name] = N'PaymentAttempt_bookingId_status_idx'
)
  CREATE INDEX [PaymentAttempt_bookingId_status_idx]
    ON [dbo].[PaymentAttempt] ([bookingId], [status]);

IF OBJECT_ID(N'dbo.TicketEmailJob', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[TicketEmailJob] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [version] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [TicketEmailJob_status_df] DEFAULT 'pending',
    [attempts] INT NOT NULL CONSTRAINT [TicketEmailJob_attempts_df] DEFAULT 0,
    [nextAttemptAt] DATETIME2 NOT NULL CONSTRAINT [TicketEmailJob_nextAttemptAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lockedUntil] DATETIME2(7) NULL,
    [sentAt] DATETIME2(7) NULL,
    [lastError] NVARCHAR(500) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TicketEmailJob_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketEmailJob_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TicketEmailJob_bookingId_version_key] UNIQUE NONCLUSTERED ([bookingId], [version]),
    CONSTRAINT [TicketEmailJob_bookingId_fkey] FOREIGN KEY ([bookingId])
      REFERENCES [dbo].[Booking] ([id]) ON DELETE NO ACTION ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.TicketEmailJob')
    AND [name] = N'TicketEmailJob_status_nextAttemptAt_idx'
)
  CREATE INDEX [TicketEmailJob_status_nextAttemptAt_idx]
    ON [dbo].[TicketEmailJob] ([status], [nextAttemptAt]);

IF OBJECT_ID(N'dbo.BookingChange', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[BookingChange] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [oldTripId] NVARCHAR(30) NOT NULL,
    [oldDate] DATE NOT NULL,
    [oldSeats] NVARCHAR(200) NOT NULL,
    [newTripId] NVARCHAR(30) NOT NULL,
    [newDate] DATE NOT NULL,
    [newSeats] NVARCHAR(200) NOT NULL,
    [difference] INT NOT NULL,
    [method] NVARCHAR(20) NOT NULL,
    [reference] NVARCHAR(100) NULL,
    [performedById] NVARCHAR(30) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BookingChange_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BookingChange_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BookingChange_bookingId_fkey] FOREIGN KEY ([bookingId])
      REFERENCES [dbo].[Booking] ([id]) ON DELETE NO ACTION ON UPDATE CASCADE
  );
END;
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE [object_id] = OBJECT_ID(N'dbo.BookingChange')
    AND [name] = N'BookingChange_bookingId_createdAt_idx'
)
  CREATE INDEX [BookingChange_bookingId_createdAt_idx]
    ON [dbo].[BookingChange] ([bookingId], [createdAt]);
