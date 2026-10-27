BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(30) NOT NULL,
    [email] NVARCHAR(254) NOT NULL,
    [fullName] NVARCHAR(120),
    [passwordHash] VARCHAR(60) NOT NULL,
    [isLocked] BIT NOT NULL CONSTRAINT [User_isLocked_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(30) NOT NULL,
    [refreshTokenHash] CHAR(64) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_refreshTokenHash_key] UNIQUE NONCLUSTERED ([refreshTokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(300),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Role_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [id] NVARCHAR(30) NOT NULL,
    [key] NVARCHAR(150) NOT NULL,
    [description] NVARCHAR(300),
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [userId] NVARCHAR(30) NOT NULL,
    [roleId] NVARCHAR(30) NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [UserRole_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [roleId] NVARCHAR(30) NOT NULL,
    [permissionId] NVARCHAR(30) NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[BusCompany] (
    [id] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [logo] NVARCHAR(500),
    [description] NVARCHAR(500),
    [rating] FLOAT(53) NOT NULL CONSTRAINT [BusCompany_rating_df] DEFAULT 0,
    [totalReviews] INT NOT NULL CONSTRAINT [BusCompany_totalReviews_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BusCompany_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BusCompany_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BusCompany_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Bus] (
    [id] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [totalSeats] INT NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Bus_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Bus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Route] (
    [id] NVARCHAR(30) NOT NULL,
    [origin] NVARCHAR(100) NOT NULL,
    [destination] NVARCHAR(100) NOT NULL,
    [distance] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Route_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Route_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Route_origin_destination_key] UNIQUE NONCLUSTERED ([origin],[destination])
);

-- CreateTable
CREATE TABLE [dbo].[RouteStop] (
    [id] NVARCHAR(30) NOT NULL,
    [routeId] NVARCHAR(30) NOT NULL,
    [type] NVARCHAR(10) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [address] NVARCHAR(300) NOT NULL,
    [city] NVARCHAR(100) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [RouteStop_sortOrder_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [RouteStop_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RouteStop_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RouteStop_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Trip] (
    [id] NVARCHAR(30) NOT NULL,
    [routeId] NVARCHAR(30) NOT NULL,
    [busId] NVARCHAR(30) NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [departureTime] NVARCHAR(5) NOT NULL,
    [arrivalTime] NVARCHAR(5) NOT NULL,
    [duration] NVARCHAR(10) NOT NULL,
    [price] INT NOT NULL,
    [availableDate] DATETIME2,
    [isActive] BIT NOT NULL CONSTRAINT [Trip_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Trip_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Trip_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SeatStatus] (
    [id] NVARCHAR(30) NOT NULL,
    [tripId] NVARCHAR(30) NOT NULL,
    [tripDate] DATE NOT NULL,
    [seatCode] NVARCHAR(10) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [SeatStatus_status_df] DEFAULT 'available',
    [bookingId] NVARCHAR(30),
    [ticketId] NVARCHAR(30),
    CONSTRAINT [SeatStatus_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SeatStatus_tripId_tripDate_seatCode_key] UNIQUE NONCLUSTERED ([tripId],[tripDate],[seatCode])
);

-- CreateTable
CREATE TABLE [dbo].[Booking] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingCode] NVARCHAR(20) NOT NULL,
    [tripId] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(30),
    [tripDate] DATE NOT NULL,
    [passengerName] NVARCHAR(120) NOT NULL,
    [passengerPhone] NVARCHAR(20) NOT NULL,
    [passengerEmail] NVARCHAR(254) NOT NULL,
    [seatCode] NVARCHAR(200) NOT NULL,
    [totalPrice] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Booking_status_df] DEFAULT 'pending',
    [paymentMethod] NVARCHAR(50),
    [paymentStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Booking_paymentStatus_df] DEFAULT 'unpaid',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Booking_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [qrVersion] INT NOT NULL CONSTRAINT [Booking_qrVersion_df] DEFAULT 1,
    CONSTRAINT [Booking_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Booking_bookingCode_key] UNIQUE NONCLUSTERED ([bookingCode])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] NVARCHAR(30) NOT NULL,
    [ticketCode] NVARCHAR(40) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [seatCode] NVARCHAR(10) NOT NULL,
    [passengerName] NVARCHAR(120) NOT NULL,
    [passengerPhone] NVARCHAR(20) NOT NULL,
    [passengerEmail] NVARCHAR(254) NOT NULL,
    [price] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Ticket_status_df] DEFAULT 'pending',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Ticket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [checkedInAt] DATETIME2,
    [checkedInById] NVARCHAR(30),
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Ticket_ticketCode_key] UNIQUE NONCLUSTERED ([ticketCode]),
    CONSTRAINT [Ticket_bookingId_seatCode_key] UNIQUE NONCLUSTERED ([bookingId],[seatCode])
);

-- CreateTable
CREATE TABLE [dbo].[BookingAnomalyReview] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BookingAnomalyReview_status_df] DEFAULT 'open',
    [note] NVARCHAR(500),
    [reviewedById] NVARCHAR(30),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BookingAnomalyReview_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BookingAnomalyReview_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BookingAnomalyReview_bookingId_key] UNIQUE NONCLUSTERED ([bookingId])
);

-- CreateTable
CREATE TABLE [dbo].[Promotion] (
    [id] NVARCHAR(30) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [image] NVARCHAR(500),
    [discount] INT,
    [code] NVARCHAR(50),
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [isActive] BIT NOT NULL CONSTRAINT [Promotion_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Promotion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Promotion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[News] (
    [id] NVARCHAR(30) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [summary] NVARCHAR(500),
    [content] NVARCHAR(max),
    [image] NVARCHAR(500),
    [category] NVARCHAR(50),
    [isPublished] BIT NOT NULL CONSTRAINT [News_isPublished_df] DEFAULT 1,
    [publishedAt] DATETIME2 NOT NULL CONSTRAINT [News_publishedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [News_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [News_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CompanyMembership] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(30) NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [role] NVARCHAR(20) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [CompanyMembership_isActive_df] DEFAULT 1,
    CONSTRAINT [CompanyMembership_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompanyMembership_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[PaymentReceipt] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [amount] INT NOT NULL,
    [method] NVARCHAR(20) NOT NULL,
    [reference] NVARCHAR(100),
    [receivedById] NVARCHAR(30) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL CONSTRAINT [PaymentReceipt_receivedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PaymentReceipt_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentReceipt_bookingId_key] UNIQUE NONCLUSTERED ([bookingId])
);

-- CreateTable
CREATE TABLE [dbo].[PaymentAttempt] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [orderId] NVARCHAR(100) NOT NULL,
    [requestId] NVARCHAR(100) NOT NULL,
    [amount] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL CONSTRAINT [PaymentAttempt_status_df] DEFAULT 'pending',
    [payUrl] NVARCHAR(2000),
    [transId] NVARCHAR(100),
    [resultCode] INT,
    [message] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentAttempt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PaymentAttempt_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentAttempt_orderId_key] UNIQUE NONCLUSTERED ([orderId]),
    CONSTRAINT [PaymentAttempt_requestId_key] UNIQUE NONCLUSTERED ([requestId])
);

-- CreateTable
CREATE TABLE [dbo].[TicketEmailJob] (
    [id] NVARCHAR(30) NOT NULL,
    [bookingId] NVARCHAR(30) NOT NULL,
    [version] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [TicketEmailJob_status_df] DEFAULT 'pending',
    [attempts] INT NOT NULL CONSTRAINT [TicketEmailJob_attempts_df] DEFAULT 0,
    [nextAttemptAt] DATETIME2 NOT NULL CONSTRAINT [TicketEmailJob_nextAttemptAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lockedUntil] DATETIME2,
    [sentAt] DATETIME2,
    [lastError] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TicketEmailJob_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketEmailJob_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TicketEmailJob_bookingId_version_key] UNIQUE NONCLUSTERED ([bookingId],[version])
);

-- CreateTable
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
    [reference] NVARCHAR(100),
    [performedById] NVARCHAR(30) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BookingChange_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BookingChange_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_revokedAt_expiresAt_idx] ON [dbo].[Session]([userId], [revokedAt], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRole_roleId_idx] ON [dbo].[UserRole]([roleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermission_permissionId_idx] ON [dbo].[RolePermission]([permissionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RouteStop_routeId_type_sortOrder_idx] ON [dbo].[RouteStop]([routeId], [type], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Trip_routeId_isActive_idx] ON [dbo].[Trip]([routeId], [isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SeatStatus_ticketId_idx] ON [dbo].[SeatStatus]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Booking_tripId_tripDate_idx] ON [dbo].[Booking]([tripId], [tripDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Booking_userId_idx] ON [dbo].[Booking]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Booking_bookingCode_idx] ON [dbo].[Booking]([bookingCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Booking_createdAt_idx] ON [dbo].[Booking]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_bookingId_status_idx] ON [dbo].[Ticket]([bookingId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BookingAnomalyReview_status_updatedAt_idx] ON [dbo].[BookingAnomalyReview]([status], [updatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CompanyMembership_companyId_role_idx] ON [dbo].[CompanyMembership]([companyId], [role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PaymentReceipt_receivedAt_idx] ON [dbo].[PaymentReceipt]([receivedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PaymentAttempt_bookingId_status_idx] ON [dbo].[PaymentAttempt]([bookingId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TicketEmailJob_status_nextAttemptAt_idx] ON [dbo].[TicketEmailJob]([status], [nextAttemptAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BookingChange_bookingId_createdAt_idx] ON [dbo].[BookingChange]([bookingId], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Bus] ADD CONSTRAINT [Bus_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[BusCompany]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RouteStop] ADD CONSTRAINT [RouteStop_routeId_fkey] FOREIGN KEY ([routeId]) REFERENCES [dbo].[Route]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Trip] ADD CONSTRAINT [Trip_routeId_fkey] FOREIGN KEY ([routeId]) REFERENCES [dbo].[Route]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Trip] ADD CONSTRAINT [Trip_busId_fkey] FOREIGN KEY ([busId]) REFERENCES [dbo].[Bus]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Trip] ADD CONSTRAINT [Trip_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[BusCompany]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SeatStatus] ADD CONSTRAINT [SeatStatus_tripId_fkey] FOREIGN KEY ([tripId]) REFERENCES [dbo].[Trip]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SeatStatus] ADD CONSTRAINT [SeatStatus_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SeatStatus] ADD CONSTRAINT [SeatStatus_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Booking] ADD CONSTRAINT [Booking_tripId_fkey] FOREIGN KEY ([tripId]) REFERENCES [dbo].[Trip]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Booking] ADD CONSTRAINT [Booking_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BookingAnomalyReview] ADD CONSTRAINT [BookingAnomalyReview_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BookingAnomalyReview] ADD CONSTRAINT [BookingAnomalyReview_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CompanyMembership] ADD CONSTRAINT [CompanyMembership_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CompanyMembership] ADD CONSTRAINT [CompanyMembership_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[BusCompany]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PaymentReceipt] ADD CONSTRAINT [PaymentReceipt_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PaymentAttempt] ADD CONSTRAINT [PaymentAttempt_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketEmailJob] ADD CONSTRAINT [TicketEmailJob_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BookingChange] ADD CONSTRAINT [BookingChange_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[Booking]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
