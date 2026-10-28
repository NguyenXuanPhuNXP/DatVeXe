const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { env } = require('../../config/env');
const { answerQuestion } = require('./support.service');
const knowledge = require('./knowledge.json');
const supportRouter = Router();
const { authenticate } = require('../../middleware/authenticate');
const { customerOnly } = require('../../middleware/customer-only');
const { prisma } = require('../../lib/prisma');
const human = require('./human-support.service');
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const humanLimiter = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'SUPPORT_RATE_LIMIT', message: 'Bạn gửi quá nhanh. Vui lòng chờ một phút.' } } });

supportRouter.get('/companies', authenticate, customerOnly, wrap(async (_req, res) => res.json(await prisma.busCompany.findMany({
  where: { members: { some: { isActive: true, role: { in: ['owner', 'manager', 'staff'] }, user: { isLocked: false } } } },
  select: { id: true, name: true }, orderBy: { name: 'asc' },
}))));
for (const [prefix, staff] of [['conversations', false], ['staff/conversations', true]]) {
  const audience = staff ? (_req, _res, next) => next() : customerOnly;
  supportRouter.get(`/${prefix}`, authenticate, audience, wrap(async (req, res) => res.json(await human.list(req.auth, staff))));
  supportRouter.get(`/${prefix}/:id`, authenticate, audience, wrap(async (req, res) => res.json(await human.detail(req.auth, req.params.id, staff))));
  supportRouter.post(`/${prefix}/:id/messages`, authenticate, audience, humanLimiter, wrap(async (req, res) => res.status(201).json(await human.reply(req.auth, req.params.id, staff, req.body))));
  supportRouter.patch(`/${prefix}/:id/close`, authenticate, audience, humanLimiter, wrap(async (req, res) => res.json(await human.close(req.auth, req.params.id, staff))));
}
supportRouter.post('/conversations', authenticate, customerOnly, rateLimit({ windowMs: 60000, limit: 3,
  message: { error: { code: 'SUPPORT_RATE_LIMIT', message: 'Bạn đã tạo nhiều yêu cầu. Vui lòng tiếp tục hội thoại đang mở.' } } }),
  wrap(async (req, res) => res.status(201).json(await human.create(req.auth, req.body))));

supportRouter.get('/guides', (_req, res) => res.json({
  guides: knowledge,
  supportEmail: env.CHAT_SUPPORT_EMAIL || null,
}));
supportRouter.post('/chat', authenticate, customerOnly, rateLimit({
  windowMs: 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'CHAT_RATE_LIMIT', message: 'Bạn đã gửi nhiều câu hỏi. Vui lòng đợi một phút rồi thử lại.' } },
}), async (req, res, next) => {
  try { res.json(await answerQuestion(req.body, env)); }
  catch (error) { next(error); }
});

module.exports = { supportRouter };
