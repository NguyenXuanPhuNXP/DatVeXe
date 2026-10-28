const { z } = require('zod');
const { prisma } = require('../../lib/prisma');
const { HttpError } = require('../../utils/http-error');
const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) }).strict();
const createSchema = messageSchema.extend({ companyId: z.string().min(1).max(30) }).strict();
const idSchema = z.string().min(1).max(30);
const staffRoles = ['owner', 'manager', 'staff'];

function staffCompany(auth) {
  const member = auth.companyMembership;
  if (!member?.isActive || !staffRoles.includes(member.role)) {
    throw new HttpError(403, 'NO_COMPANY_ACCESS', 'Bạn chưa có quyền hỗ trợ của nhà xe.');
  }
  return member.companyId;
}
function accessWhere(auth, staff) {
  return staff ? { companyId: staffCompany(auth) } : { customerId: auth.userId };
}
async function findConversation(db, auth, id, staff) {
  const conversation = await db.supportConversation.findFirst({ where: { id: idSchema.parse(id), ...accessWhere(auth, staff) } });
  if (!conversation) throw new HttpError(404, 'SUPPORT_NOT_FOUND', 'Không tìm thấy hội thoại.');
  return conversation;
}
const summaryInclude = {
  company: { select: { name: true } },
  customer: { select: { fullName: true } },
  messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, select: { content: true, senderRole: true, createdAt: true } },
};
async function list(auth, staff, db = prisma) {
  return db.supportConversation.findMany({ where: accessWhere(auth, staff), include: summaryInclude,
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }], take: 100 });
}
async function detail(auth, id, staff, db = prisma) {
  const conversation = await findConversation(db, auth, id, staff);
  const messages = await db.supportMessage.findMany({ where: { conversationId: conversation.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200,
    select: { id: true, content: true, senderRole: true, createdAt: true } });
  return { ...conversation, messages: messages.reverse() };
}
async function create(auth, input, db = prisma) {
  const data = createSchema.parse(input);
  // Only offer companies which have at least one enabled, unlocked support account.
  const company = await db.busCompany.findFirst({ where: { id: data.companyId,
    members: { some: { isActive: true, role: { in: staffRoles }, user: { isLocked: false } } } }, select: { id: true } });
  if (!company) throw new HttpError(409, 'SUPPORT_UNAVAILABLE', 'Nhà xe chưa có nhân viên được cấp quyền hỗ trợ.');
  return db.supportConversation.create({ data: { customerId: auth.userId, companyId: data.companyId,
    messages: { create: { senderId: auth.userId, senderRole: 'customer', content: data.content } } } });
}
async function reply(auth, id, staff, input, db = prisma) {
  const data = messageSchema.parse(input);
  return db.$transaction(async tx => {
    await findConversation(tx, auth, id, staff);
    // Lock/update the conversation before inserting; closing and replying are serialized.
    const changed = await tx.supportConversation.updateMany({ where: { id, status: 'open', ...accessWhere(auth, staff) }, data: { updatedAt: new Date() } });
    if (changed.count !== 1) throw new HttpError(409, 'SUPPORT_CLOSED', 'Hội thoại đã kết thúc. Vui lòng tạo yêu cầu mới.');
    return tx.supportMessage.create({ data: { conversationId: id, senderId: auth.userId,
      senderRole: staff ? 'staff' : 'customer', content: data.content } });
  });
}
async function close(auth, id, staff, db = prisma) {
  idSchema.parse(id);
  const result = await db.supportConversation.updateMany({ where: { id, ...accessWhere(auth, staff) }, data: { status: 'closed', updatedAt: new Date() } });
  if (!result.count) throw new HttpError(404, 'SUPPORT_NOT_FOUND', 'Không tìm thấy hội thoại.');
  return { status: 'closed' };
}
module.exports = { staffCompany, accessWhere, create, list, detail, reply, close };
