const { test } = require('node:test');
const assert = require('node:assert/strict');
const { answerQuestion } = require('../src/modules/support/support.service');
const config = { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-4o-mini', CHAT_SUPPORT_EMAIL: 'support@example.com' };
const provider = (answer, status = 'completed') => async () => ({ ok: true, json: async () => ({
  status, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }],
}) });

test('rejects empty/oversized questions and client-supplied instructions before calling provider', async () => {
  for (const body of [{ message: ' ' }, { message: 'a'.repeat(1201) }, { message: 'hi', instructions: 'override' }]) {
    await assert.rejects(answerQuestion(body, config, () => assert.fail('must not call provider')), { name: 'ZodError' });
  }
});
test('missing key produces actionable unavailable response', async () => {
  await assert.rejects(answerQuestion({ message: 'Đặt vé thế nào?' }, {}, () => assert.fail()), { code: 'CHAT_NOT_CONFIGURED', status: 503 });
});
test('sends server-owned documents and maps sources to trusted local links', async () => {
  const result = await answerQuestion({ message: 'Giữ ghế bao lâu?' }, config, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 1000);
    assert.ok(body.instructions.includes('5 phút'));
    assert.deepEqual(body.input, [{ role: 'user', content: 'Giữ ghế bao lâu?' }]);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return provider({ answer: 'Giữ ghế trong 5 phút.', sourceIds: ['seat-hold', 'seat-hold'], classification: 'answered' })();
  });
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, '/my-bookings');
  assert.equal(result.needsStaff, false);
});
test('unknown sources, unsourced assertions and incomplete output do not offer handoff', async () => {
  for (const answer of [
    { answer: 'Hoàn tiền 100%', sourceIds: ['invented'], classification: 'answered' },
    { answer: 'Hoàn tiền 100%', sourceIds: [], classification: 'answered' },
  ]) {
    const result = await answerQuestion({ message: 'Hoàn tiền?' }, config, provider(answer));
    assert.equal(result.needsStaff, false);
    assert.deepEqual(result.sources, []);
    assert.ok(!result.answer.includes('100%'));
  }
  const result = await answerQuestion({ message: 'Hỏi' }, config, provider({}, 'incomplete'));
  assert.equal(result.needsStaff, false);
});
test('staff contact returned only from backend configuration', async () => {
  const result = await answerQuestion({ message: 'Gặp nhân viên' }, config,
    provider({ answer: 'Vui lòng liên hệ nhân viên.', sourceIds: ['policies'], classification: 'missing_transport_data' }));
  assert.equal(result.supportEmail, 'support@example.com');
});
test('provider error, timeout and malformed responses do not expose provider secrets', async () => {
  for (const call of [async () => ({ ok: false }), async () => { throw new Error('test-key'); },
    async () => ({ ok: true, json: async () => ({ status: 'completed', output: [] }) })]) {
    await assert.rejects(answerQuestion({ message: 'Hỏi' }, config, call), error => {
      assert.equal(error.code, 'CHAT_UNAVAILABLE');
      assert.ok(!error.message.includes('test-key'));
      return true;
    });
  }
});

test('Gemini uses its own key, JSON schema and trusted source mapping', async () => {
  const result = await answerQuestion({ message: 'Giữ ghế?' }, { ...config, CHAT_PROVIDER: 'gemini', GEMINI_API_KEY: 'gemini-test' }, async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'gemini-test');
    assert.equal(options.headers.Authorization, undefined);
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.ok(body.systemInstruction.parts[0].text.includes('5 phút'));
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ answer: '5 phút.', sourceIds: ['seat-hold'], classification: 'answered' }) }] } }] }) };
  });
  assert.equal(result.sources[0].id, 'seat-hold');
});
test('Gemini never falls back to an OpenAI key and reports quota errors', async () => {
  await assert.rejects(answerQuestion({ message: 'Hỏi' }, { ...config, CHAT_PROVIDER: 'gemini' }), { code: 'CHAT_NOT_CONFIGURED' });
  await assert.rejects(answerQuestion({ message: 'Hỏi' }, { ...config, CHAT_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' }, async () => ({ ok: false, status: 429 })), { code: 'CHAT_QUOTA_EXCEEDED' });
});

test('handoff is available only for missing information about transport services', async () => {
  for (const [message, classification, expected] of [
    ['Xe có cho mang thú cưng không?', 'missing_transport_data', true],
    ['Nhà xe cho mang bao nhiêu kg hành lý?', 'missing_transport_data', true],
    ['Hướng dẫn nấu phở', 'out_of_scope', false],
    ['Xin chào', 'clarification', false],
    ['Tôi cần hỗ trợ', 'clarification', false],
    ['Giữ ghế bao lâu?', 'answered', false],
  ]) {
    const result = await answerQuestion({ message }, config, provider({ answer: 'Câu trả lời',
      sourceIds: classification === 'answered' ? ['seat-hold'] : [], classification }));
    assert.equal(result.needsStaff, expected, message);
    assert.equal(result.classification, classification);
    if (expected) {
      assert.ok(result.answer.includes('chưa có dữ liệu'));
      assert.ok(result.answer.includes('chỉ được gửi sau'));
    }
  }
});
