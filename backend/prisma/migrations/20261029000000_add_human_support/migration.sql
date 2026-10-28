BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[SupportConversation] (
    [id] NVARCHAR(30) NOT NULL,
    [customerId] NVARCHAR(30) NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [SupportConversation_status_df] DEFAULT 'open',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupportConversation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupportConversation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SupportMessage] (
    [id] NVARCHAR(30) NOT NULL,
    [conversationId] NVARCHAR(30) NOT NULL,
    [senderId] NVARCHAR(30) NOT NULL,
    [senderRole] NVARCHAR(20) NOT NULL,
    [content] NVARCHAR(2000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupportMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SupportMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportConversation_customerId_updatedAt_idx] ON [dbo].[SupportConversation]([customerId], [updatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportConversation_companyId_status_updatedAt_idx] ON [dbo].[SupportConversation]([companyId], [status], [updatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportMessage_conversationId_createdAt_idx] ON [dbo].[SupportMessage]([conversationId], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[SupportConversation] ADD CONSTRAINT [SupportConversation_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportConversation] ADD CONSTRAINT [SupportConversation_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[BusCompany]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportMessage] ADD CONSTRAINT [SupportMessage_conversationId_fkey] FOREIGN KEY ([conversationId]) REFERENCES [dbo].[SupportConversation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportMessage] ADD CONSTRAINT [SupportMessage_senderId_fkey] FOREIGN KEY ([senderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
