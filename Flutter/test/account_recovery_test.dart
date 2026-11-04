import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/config/app_theme.dart';
import 'package:datvexe/screens/account_screen.dart';
import 'package:datvexe/screens/forgot_password_screen.dart';
import 'package:datvexe/screens/login_screen.dart';
import 'package:datvexe/services/api_service.dart';

class RecoveryApi extends ApiService {
  RecoveryApi() : super(baseUrl: 'http://127.0.0.1/api');
  final calls = <Map<String, dynamic>>[];
  bool cleared = false;
  @override
  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
    bool retry = true,
    bool binary = false,
    Uint8List? uploadBytes,
    String? fileName,
  }) async {
    calls.add({'path': path, 'method': method, 'body': body});
    return {
      'message':
          'Nếu email có tài khoản đang hoạt động, mã xác nhận sẽ được gửi.',
    };
  }

  @override
  void clearSession() {
    cleared = true;
  }
}

void main() {
  setUpAll(() async {
    final fonts =
        '${File(Platform.resolvedExecutable).parent.parent.parent.path}/material_fonts';
    for (final entry in {
      'Roboto': 'roboto-regular.ttf',
      'MaterialIcons': 'materialicons-regular.otf',
    }.entries) {
      final loader = FontLoader(entry.key)
        ..addFont(
          Future.value(
            ByteData.sublistView(
              await File('$fonts/${entry.value}').readAsBytes(),
            ),
          ),
        );
      await loader.load();
    }
  });
  setUp(() {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
    api.clearSession();
  });

  Future<void> capture(WidgetTester tester, GlobalKey key, String name) async {
    await tester.runAsync(() async {
      final boundary =
          key.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage();
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory('build/ui').create(recursive: true);
      await File('build/ui/$name.png')
          .writeAsBytes(bytes!.buffer.asUint8List());
      image.dispose();
    });
  }

  testWidgets('Login opens recovery with the entered email', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
    await tester.enterText(
      find.byType(TextFormField).first,
      'customer@example.test',
    );
    await tester.tap(find.text('Quên mật khẩu?'));
    await tester.pumpAndSettle();
    expect(find.byType(ForgotPasswordScreen), findsOneWidget);
    expect(find.text('customer@example.test'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Recovery validates code/password, throttles resend, submits and clears session',
    (tester) async {
      final client = RecoveryApi();
      addTearDown(client.close);
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final key = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: appTheme,
            home: ForgotPasswordScreen(
              client: client,
              initialEmail: 'customer@example.test',
            ),
          ),
        ),
      );
      await tester.tap(find.text('Gửi mã xác nhận'));
      await tester.pumpAndSettle();
      expect(client.calls.single['path'], '/auth/forgot-password');
      expect(client.calls.single['body'], {'email': 'customer@example.test'});
      await capture(tester, key, 'password-recovery');
      await tester.ensureVisible(find.text('Gửi lại mã'));
      await tester.tap(find.text('Gửi lại mã'));
      await tester.pumpAndSettle();
      expect(client.calls.length, 1);
      await tester.tap(find.text('Lưu mật khẩu mới'));
      await tester.pumpAndSettle();
      expect(find.text('Nhập đủ 8 chữ số'), findsOneWidget);
      expect(client.calls.length, 1);
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(1), '01234567');
      await tester.enterText(fields.at(2), 'NewPassword123');
      await tester.enterText(fields.at(3), 'different');
      await tester.ensureVisible(find.text('Lưu mật khẩu mới'));
      await tester.tap(find.text('Lưu mật khẩu mới'));
      await tester.pumpAndSettle();
      expect(find.text('Mật khẩu nhập lại chưa khớp'), findsOneWidget);
      expect(client.calls.length, 1);
      await tester.enterText(fields.at(3), 'NewPassword123');
      await tester.ensureVisible(find.text('Lưu mật khẩu mới'));
      await tester.tap(find.text('Lưu mật khẩu mới'));
      await tester.pumpAndSettle();
      expect(client.calls.last, {
        'path': '/auth/reset-password',
        'method': 'POST',
        'body': {
          'email': 'customer@example.test',
          'code': '01234567',
          'password': 'NewPassword123',
        },
      });
      expect(client.cleared, true);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Account shows labelled personal data and fits small phones with large text',
    (tester) async {
      api.user = {
        'fullName': 'Nguyễn Thị Minh Anh',
        'email': 'minhanh.nguyen@example.test',
        'permissions': ['booking.create'],
      };
      for (final width in [390.0, 320.0]) {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1;
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: MaterialApp(
              debugShowCheckedModeBanner: false,
              theme: appTheme,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: TextScaler.linear(width == 320 ? 1.4 : 1),
                ),
                child: child!,
              ),
              home: const Scaffold(body: AccountScreen()),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Họ và tên'), findsOneWidget);
        expect(find.text('Nguyễn Thị Minh Anh'), findsOneWidget);
        expect(find.text('Email đăng nhập'), findsOneWidget);
        expect(find.text('Loại tài khoản'), findsOneWidget);
        expect(find.text('Khách hàng'), findsOneWidget);
        expect(find.text('Bảo mật tài khoản'), findsOneWidget);
        expect(find.text('Đặt lại mật khẩu qua email'), findsOneWidget);
        expect(find.text('Thông tin kết nối'), findsNothing);
        expect(find.text(api.baseUrl), findsNothing);
        expect(tester.takeException(), isNull);
        await capture(tester, key, 'account-${width.toInt()}');
      }
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
      api.clearSession();
    },
  );
}
