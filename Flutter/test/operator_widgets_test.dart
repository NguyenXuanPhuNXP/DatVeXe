import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/screens/operator/operator_portal_screen.dart';
import 'package:datvexe/screens/operator/operator_widgets.dart';

void main() {
  setUp(
    () => dotenv.loadFromString(envString: File('.env').readAsStringSync()),
  );
  Future<void> portal(
    WidgetTester tester,
    String role, {
    bool active = true,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OperatorPortalScreen(
            loadMembership: () async => {
              'role': role,
              'isActive': active,
              'permissions': [
                'operator.access',
                'operator.work',
                'operator.support',
                if (role == 'staff') 'operator.board',
                if (role == 'manager') ...[
                  'operator.employees.manage',
                  'operator.payment-issues.read',
                ],
              ],
              'company': {'name': 'Nhà xe kiểm thử'},
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('Staff sees work tools and boarding, not manager tools', (
    tester,
  ) async {
    await portal(tester, 'staff');
    expect(find.text('Quản lý vé'), findsOneWidget);
    expect(find.text('Chuyến xe của nhà xe'), findsOneWidget);
    expect(find.text('Quét QR xem vé'), findsNothing);
    expect(find.text('Xác nhận lên xe'), findsOneWidget);
    expect(find.text('Quản lý nhân viên'), findsNothing);
    expect(find.text('Đối soát thanh toán'), findsNothing);
  });
  testWidgets(
    'Manager sees employees and reconciliation, not staff-only boarding',
    (tester) async {
      await portal(tester, 'manager');
      expect(find.text('Quản lý nhân viên'), findsOneWidget);
      expect(find.text('Đối soát thanh toán'), findsOneWidget);
      expect(find.text('Xác nhận lên xe'), findsNothing);
    },
  );
  testWidgets('Revoked membership hides work actions', (tester) async {
    await portal(tester, 'manager', active: false);
    expect(find.text('Quản lý vé'), findsNothing);
    expect(
      find.text('Tài khoản chưa có quyền làm việc tại nhà xe.'),
      findsOneWidget,
    );
  });
  testWidgets(
    'Receipt form requires explicit acknowledgement and transfer reference',
    (tester) async {
      var writes = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: OperatorForm(
            title: 'Ghi nhận thu tiền',
            fields: paymentFields,
            initial: const {'method': 'bank_transfer'},
            money: true,
            save: (v) async {
              writes++;
            },
          ),
        ),
      );
      final save = find.widgetWithText(FilledButton, 'Lưu thay đổi');
      expect(tester.widget<FilledButton>(save).onPressed, isNull);
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pump();
      await tester.tap(save);
      await tester.pumpAndSettle();
      expect(
        find.text('Chuyển khoản cần mã tham chiếu giao dịch.'),
        findsOneWidget,
      );
      expect(writes, 0);
    },
  );
}
