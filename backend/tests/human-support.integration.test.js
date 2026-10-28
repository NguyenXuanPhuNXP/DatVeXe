const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');

test('Human support: authenticated HTTP flow, company isolation, persistence and closed conversations',
  { skip: process.env.RUN_DB_TESTS !== '1', timeout: 60000 }, async () => {
    const { prisma } = require('../src/lib/prisma');
    const { app } = require('../src/app');
    const { createAccessToken } = require('../src/utils/tokens');
    const tag = 'support_' + randomUUID().slice(0, 8);
    const userIds = [], companyIds = [], conversationIds = [];
    let server;
    async function user(role, companyId) {
      const record = await prisma.user.create({ data: { email: `${tag}_${userIds.length}@example.test`,
        fullName: tag, passwordHash: 'unused-test-hash',
        roles: { create: { role: { connectOrCreate: { where: { name: 'USER' }, create: { name: 'USER' } } } } },
        ...(companyId ? { companyMembership: { create: { companyId, role } } } : {}) } });
      userIds.push(record.id);
      const session = await prisma.session.create({ data: { userId: record.id, refreshTokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 600000) } });
      return { id: record.id, token: createAccessToken(record.id, session.id) };
    }
    try {
      for (const suffix of ['a', 'b']) { const company = await prisma.busCompany.create({ data: { name: `${tag}_${suffix}` } }); companyIds.push(company.id); }
      const customer = await user(), otherCustomer = await user();
      const staff = await user('staff', companyIds[0]), manager = await user('manager', companyIds[0]);
      const foreignStaff = await user('staff', companyIds[1]);
      server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      const base = `http://127.0.0.1:${server.address().port}/api/support`;
      async function request(method, path, who, body, expected = 200) {
        const response = await fetch(base + path, { method, headers: { ...(who ? { Authorization: `Bearer ${who.token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const data = await response.json();
        assert.equal(response.status, expected, JSON.stringify(data));
        return data;
      }
      await request('GET', '/conversations', null, null, 401);
      await request('POST', '/chat', null, { message: 'Xin chào' }, 401);
      await request('POST', '/chat', staff, { message: 'Xin chào' }, 403);
      await request('GET', '/conversations', staff, null, 403);
      await request('POST', '/conversations', manager, { companyId: companyIds[0], content: 'Không được tạo' }, 403);
      await request('POST', '/../bookings', staff, { tripId: 'anything' }, 403);
      const companies = await request('GET', '/companies', customer);
      assert.ok(companies.some(c => c.id === companyIds[0]));
      const created = await request('POST', '/conversations', customer, { companyId: companyIds[0], content: 'Tôi cần kiểm tra thanh toán.' }, 201);
      conversationIds.push(created.id);
      const path = `/conversations/${created.id}`, staffPath = `/staff/conversations/${created.id}`;
      await request('GET', path, otherCustomer, null, 404);
      await request('GET', staffPath, foreignStaff, null, 404);
      await request('GET', staffPath, customer, null, 403);
      await request('POST', `${staffPath}/messages`, foreignStaff, { content: 'Không được gửi' }, 404);
      await request('PATCH', `${path}/close`, otherCustomer, null, 404);
      const inbox = await request('GET', '/staff/conversations', manager);
      assert.ok(inbox.some(c => c.id === created.id));
      const foreignInbox = await request('GET', '/staff/conversations', foreignStaff);
      assert.ok(!foreignInbox.some(c => c.id === created.id));
      await request('POST', `${staffPath}/messages`, staff, { content: 'Nhân viên đã tiếp nhận yêu cầu.' }, 201);
      await request('POST', `${path}/messages`, customer, { content: 'Cảm ơn.' }, 201);
      const detail = await request('GET', path, customer);
      assert.equal(detail.messages.length, 3);
      assert.deepEqual(detail.messages.map(m => m.senderRole), ['customer', 'staff', 'customer']);
      await request('POST', `${path}/messages`, customer, { content: 'Giả danh', senderRole: 'staff' }, 400);
      await request('PATCH', `${staffPath}/close`, manager);
      await request('POST', `${path}/messages`, customer, { content: 'Đã đóng' }, 409);
      assert.equal((await request('GET', path, customer)).status, 'closed');
      await prisma.companyMembership.updateMany({ where: { userId: staff.id }, data: { isActive: false } });
      await request('GET', staffPath, staff, null, 403);
    } finally {
      if (server) await new Promise(resolve => server.close(resolve));
      await prisma.supportMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.supportConversation.deleteMany({ where: { id: { in: conversationIds } } });
      await prisma.companyMembership.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.busCompany.deleteMany({ where: { id: { in: companyIds } } });
      await prisma.$disconnect();
    }
  });
