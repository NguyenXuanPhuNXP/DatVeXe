import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../widgets/app_widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail = '', this.client});
  final String initialEmail;
  final ApiService? client;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  ApiService get client => widget.client ?? api;
  final form = GlobalKey<FormState>();
  late final email = TextEditingController(text: widget.initialEmail);
  final code = TextEditingController();
  final password = TextEditingController();
  final confirmation = TextEditingController();
  bool sent = false, busy = false, obscure = true;
  DateTime? resendAfter;
  String? feedback;

  @override
  void dispose() {
    email.dispose();
    code.dispose();
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  Future<void> sendCode() async {
    if (!sent && !form.currentState!.validate()) return;
    if (resendAfter != null && DateTime.now().isBefore(resendAfter!)) {
      notify(context, 'Vui lòng chờ 60 giây giữa hai lần yêu cầu mã.');
      return;
    }
    setState(() => busy = true);
    try {
      final result = await client.request(
        '/auth/forgot-password',
        method: 'POST',
        body: {'email': email.text.trim()},
      );
      if (!mounted) return;
      setState(() {
        sent = true;
        feedback = result['message'] as String;
        resendAfter = DateTime.now().add(const Duration(seconds: 60));
      });
    } catch (e) {
      if (mounted) notify(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> reset() async {
    if (!form.currentState!.validate()) return;
    setState(() => busy = true);
    try {
      await client.request(
        '/auth/reset-password',
        method: 'POST',
        body: {
          'email': email.text.trim(),
          'code': code.text.trim(),
          'password': password.text,
        },
      );
      client.clearSession();
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) notify(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Quên mật khẩu')),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Form(
          key: form,
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              heading(sent ? 'Đặt mật khẩu mới' : 'Khôi phục tài khoản'),
              Text(
                sent
                    ? 'Nhập mã 8 chữ số từ email. Mã có hiệu lực 10 phút và tối đa 5 lần thử.'
                    : 'Nhập email đã đăng ký Rightway để nhận mã đặt lại mật khẩu.',
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: email,
                readOnly: sent,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                maxLength: 254,
                decoration: const InputDecoration(labelText: 'Email đăng ký'),
                validator: (v) =>
                    RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                        .hasMatch(v?.trim() ?? '')
                    ? null
                    : 'Nhập email hợp lệ',
              ),
              if (feedback != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Semantics(liveRegion: true, child: Text(feedback!)),
                ),
              if (sent) ...[
                TextFormField(
                  controller: code,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  autofillHints: const [AutofillHints.oneTimeCode],
                  maxLength: 8,
                  decoration: const InputDecoration(labelText: 'Mã xác nhận'),
                  validator: (v) => RegExp(r'^\d{8}$').hasMatch(v ?? '')
                      ? null
                      : 'Nhập đủ 8 chữ số',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: password,
                  obscureText: obscure,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu mới',
                    helperText: 'Sử dụng ít nhất 8 ký tự',
                    suffixIcon: IconButton(
                      tooltip: obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                      onPressed: () => setState(() => obscure = !obscure),
                      icon: Icon(
                        obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (v) =>
                      v == null ||
                          v.length < 8 ||
                          v.length > 72 ||
                          utf8.encode(v).length > 72
                      ? 'Mật khẩu quá ngắn hoặc quá dài. Vui lòng chọn mật khẩu khác.'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: confirmation,
                  obscureText: obscure,
                  decoration: const InputDecoration(
                    labelText: 'Nhập lại mật khẩu mới',
                  ),
                  validator: (v) =>
                      v == password.text ? null : 'Mật khẩu nhập lại chưa khớp',
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: busy
                    ? null
                    : sent
                    ? reset
                    : sendCode,
                child: Text(
                  busy
                      ? 'Đang xử lý…'
                      : sent
                      ? 'Lưu mật khẩu mới'
                      : 'Gửi mã xác nhận',
                ),
              ),
              if (sent)
                TextButton(
                  onPressed: busy ? null : sendCode,
                  child: const Text('Gửi lại mã'),
                ),
              if (sent)
                TextButton(
                  onPressed: busy
                      ? null
                      : () => setState(() {
                          sent = false;
                          feedback = null;
                          code.clear();
                          password.clear();
                          confirmation.clear();
                          form.currentState!.reset();
                        }),
                  child: const Text('Dùng email khác'),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}
