import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/services.dart';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/config/app_theme.dart';
import 'package:datvexe/screens/home_screen.dart';
import 'package:datvexe/screens/passenger_info_screen.dart';
import 'package:datvexe/screens/payment_screen.dart';
import 'package:datvexe/services/customer_service.dart';
import 'package:datvexe/services/api_service.dart';

class PreviewData extends CustomerService {
  PreviewData() : super(api);
  @override
  Future<List<dynamic>> cities() async => [
    'Hà Nội',
    'Đà Nẵng',
    'TP. Hồ Chí Minh',
  ];
  @override
  Future<List<dynamic>> popularRoutes() async => [
    {
      'origin': 'Hà Nội',
      'destination': 'Đà Nẵng',
      'minPrice': 350000,
      'topCompany': 'Rightway',
    },
  ];
  @override
  Future<List<dynamic>> promotions() async => [
    {
      'title': 'Ưu đãi hành trình',
      'description': 'Khám phá các tuyến xe chất lượng.',
      'code': 'RIGHTWAY',
    },
  ];
  @override
  Future<List<dynamic>> news() async => [
    {
      'id': 'n1',
      'title': 'Đồng hành trên từng chuyến đi',
      'summary': 'Cập nhật thông tin hành trình.',
    },
  ];
}

void main() {
  testWidgets(
    'Develops home layout fits a phone and preserves passenger selection',
    (tester) async {
      dotenv.loadFromString(envString: File('.env').readAsStringSync());
      dotenv.env['HERO_IMAGE_URL'] = '';
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fonts =
          '${File(Platform.resolvedExecutable).parent.parent.parent.path}/material_fonts';
      if (File('$fonts/roboto-regular.ttf').existsSync()) {
        await tester.runAsync(() async {
          final text = FontLoader('PreviewRoboto')
            ..addFont(
              Future.value(
                ByteData.sublistView(
                  File('$fonts/roboto-regular.ttf').readAsBytesSync(),
                ),
              ),
            )
            ..addFont(
              Future.value(
                ByteData.sublistView(
                  File('$fonts/roboto-bold.ttf').readAsBytesSync(),
                ),
              ),
            );
          final icons = FontLoader('MaterialIcons')
            ..addFont(
              Future.value(
                ByteData.sublistView(
                  File('$fonts/materialicons-regular.otf').readAsBytesSync(),
                ),
              ),
            );
          await text.load();
          await icons.load();
        });
      }
      final capture = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: capture,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: appTheme.copyWith(
              textTheme: appTheme.textTheme.apply(fontFamily: 'PreviewRoboto'),
            ),
            home: Scaffold(
              appBar: AppBar(title: const Text('Rightway')),
              body: HomeScreen(dataSource: PreviewData()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Hành trình đẹp hơn\ncùng Rightway'), findsOneWidget);
      expect(find.text('Số hành khách'), findsOneWidget);
      await tester.tap(find.byType(DropdownButtonFormField<int>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('3 người').last);
      await tester.pumpAndSettle();
      expect(find.text('3 người'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.runAsync(() async {
        final boundary =
            capture.currentContext!.findRenderObject() as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 1.5);
        final png = await image.toByteData(format: ui.ImageByteFormat.png);
        await Directory('build/ui').create(recursive: true);
        await File('build/ui/develops-home.png')
            .writeAsBytes(png!.buffer.asUint8List());
        image.dispose();
      });
      await tester.scrollUntilVisible(
        find.text('Tuyến xe phổ biến'),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'Passenger can review payment and return without losing contact data',
    (tester) async {
      dotenv.loadFromString(envString: File('.env').readAsStringSync());
      api.user = {
        'id': 'u1',
        'fullName': 'Khách kiểm thử',
        'email': 'customer@example.com',
        'permissions': ['booking.create'],
      };
      addTearDown(() => api.user = null);
      await tester.pumpWidget(
        MaterialApp(
          theme: appTheme,
          home: PassengerInfoScreen(
            trip: const {
              'id': 't1',
              'price': 250000,
              'departureTime': '08:00',
              'route': {'origin': 'Hà Nội', 'destination': 'Đà Nẵng'},
            },
            date: '2026-11-02',
            seats: const ['A1', 'B1'],
          ),
        ),
      );
      await tester.enterText(find.byType(TextFormField).at(1), '0901234567');
      final next = find.widgetWithText(FilledButton, 'Tiếp tục thanh toán');
      tester.testTextInput.hide();
      await tester.scrollUntilVisible(
        next,
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(next);
      await tester.pumpAndSettle();
      expect(find.byType(PaymentScreen), findsOneWidget);
      expect(find.text('0901234567', findRichText: true), findsNothing);
      expect(
        find.textContaining('Khách kiểm thử • 0901234567'),
        findsOneWidget,
      );
      expect(find.text('500.000 đ'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(PassengerInfoScreen), findsOneWidget);
      await tester.scrollUntilVisible(
        find.widgetWithText(TextFormField, 'Số điện thoại'),
        -250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        tester
            .widget<TextFormField>(
              find.widgetWithText(TextFormField, 'Số điện thoại'),
            )
            .controller!
            .text,
        '0901234567',
      );
    },
  );
}
