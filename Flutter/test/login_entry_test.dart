import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/main.dart';
import 'package:datvexe/screens/login_screen.dart';
import 'package:datvexe/services/api_service.dart';

void main() {
  testWidgets(
    'App requires login at startup and returns to login when session ends',
    (tester) async {
      dotenv.loadFromString(envString: File('.env').readAsStringSync());
      api.clearSession();
      await tester.pumpWidget(const RightwayApp());
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(
        Navigator.of(tester.element(find.byType(LoginScreen))).canPop(),
        false,
      );

      api.user = {
        'id': 'customer',
        'fullName': 'Khách hàng',
        'permissions': ['booking.create'],
      };
      api.sessionChanges.value++;
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.byType(NavigationBar), findsOneWidget);

      api.clearSession();
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
