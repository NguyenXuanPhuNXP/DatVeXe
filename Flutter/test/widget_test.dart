import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/screens/login_screen.dart';
import 'package:datvexe/screens/my_bookings_screen.dart';
import 'package:datvexe/services/api_service.dart';

void main() {
  setUp(() {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
  });
  testWidgets('Login validates fields and switches to registration', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
    await tester.tap(find.widgetWithText(FilledButton, 'Đăng nhập'));
    await tester.pumpAndSettle();
    expect(find.text('Vui lòng nhập thông tin'), findsOneWidget);
    expect(find.text('Mật khẩu không được trống'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pumpAndSettle();
    expect(find.text('Họ tên'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Tạo tài khoản'), findsOneWidget);
  });
  testWidgets('Guest bookings prompt for authentication', (tester) async {
    api.user = null;
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: MyBookingsScreen())),
    );
    expect(find.text('Đăng nhập để xem các vé đã đặt.'), findsOneWidget);
  });
}
