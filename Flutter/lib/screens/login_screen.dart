import 'dart:convert';

import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';
import '../widgets/app_widgets.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController();
  bool register = false, busy = false, obscure = true;
  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    setState(() => busy = true);
    try {
      await api.authenticate({
        'email': email.text.trim(),
        'password': password.text,
        if (register) 'fullName': name.text.trim(),
      }, register: register);
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) notify(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  String? validateEmail(String? v) {
    if (v == null || v.trim().isEmpty) return 'Vui lòng nhập thông tin';
    return v.trim().length > 254 ||
            !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
        ? 'Nhập email hợp lệ'
        : null;
  }

  String? validatePassword(String? v) {
    if (v == null || v.length < (register ? 8 : 1)) {
      return register
          ? 'Mật khẩu tối thiểu 8 ký tự'
          : 'Mật khẩu không được trống';
    }
    return utf8.encode(v).length > 72 ? 'Mật khẩu tối đa 72 byte UTF-8' : null;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(register ? 'Đăng ký' : 'Đăng nhập')),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Form(
          key: form,
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              const Icon(Icons.directions_bus, color: red, size: 64),
              heading('Chào mừng đến Rightway'),
              const Text('Đăng nhập để đặt vé và quản lý hành trình.'),
              const SizedBox(height: 24),
              if (register) ...[
                TextFormField(
                  controller: name,
                  maxLength: 120,
                  decoration: const InputDecoration(labelText: 'Họ tên'),
                  validator: requiredValue,
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: password,
                obscureText: obscure,
                decoration: InputDecoration(
                  labelText: 'Mật khẩu',
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => obscure = !obscure),
                    icon: Icon(
                      obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
                validator: validatePassword,
              ),
              if (!register)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: busy
                        ? null
                        : () async {
                            final changed = await open<bool>(
                              context,
                              ForgotPasswordScreen(
                                initialEmail: email.text.trim(),
                              ),
                            );
                            if (changed == true && mounted) {
                              password.clear();
                              if (context.mounted) {
                                notify(
                                  context,
                                  'Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.',
                                );
                              }
                            }
                          },
                    child: const Text('Quên mật khẩu?'),
                  ),
                ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: busy ? null : submit,
                child: Text(
                  busy
                      ? 'Đang xử lý…'
                      : register
                      ? 'Tạo tài khoản'
                      : 'Đăng nhập',
                ),
              ),
              TextButton(
                onPressed: busy
                    ? null
                    : () => setState(() => register = !register),
                child: Text(
                  register
                      ? 'Đã có tài khoản? Đăng nhập'
                      : 'Chưa có tài khoản? Đăng ký',
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
