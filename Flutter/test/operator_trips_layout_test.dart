import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/config/app_theme.dart';
import 'package:datvexe/screens/operator/operator_trips_screen.dart';
import 'package:datvexe/screens/operator/operator_widgets.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/operator_service.dart';
import 'package:datvexe/utils/formatters.dart';

class BoardPreview extends OperatorService {
  BoardPreview() : super(api);
  final dates = <String>[];
  Map<String, dynamic> get trip => {
    'id': 'trip1',
    'isActive': true,
    'route': {
      'origin': 'Mũi Né – Phan Thiết',
      'destination': 'Nha Trang – Bến xe phía Nam',
    },
    'bus': {'name': 'Hạnh Cafe – Xe giường nằm cao cấp', 'totalSeats': 18},
    'departureTime': '08:00',
    'arrivalTime': '13:00',
  };
  @override
  Future<List<dynamic>> tripBoard(String date) async {
    dates.add(date);
    return [trip];
  }

  @override
  Future<Map<String, dynamic>> tripSeats(String tripId, String date) async => {
    'trip': trip,
    'date': date,
    'seats': [
      for (var i = 0; i < 18; i++)
        {
          'seatCode': '${['A', 'B', 'C'][i % 3]}${i ~/ 3 + 1}',
          'status': i == 0 ? 'booked' : 'available',
          'bookings': i == 0
              ? [
                  {
                    'bookingCode': 'RW2026110400001',
                    'passengerName':
                        'Nguyễn Thị Minh Anh – người liên hệ đặt vé',
                    'passengerPhone': '0912345678',
                    'status': 'confirmed',
                    'paymentStatus': 'paid',
                  },
                ]
              : [],
        },
    ],
  };
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
  setUp(
    () => dotenv.loadFromString(envString: File('.env').readAsStringSync()),
  );

  Future<void> capture(WidgetTester tester, GlobalKey key, String name) async {
    await tester.runAsync(() async {
      final image =
          await (key.currentContext!.findRenderObject()
                  as RenderRepaintBoundary)
              .toImage();
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory('build/ui').create(recursive: true);
      await File('build/ui/$name.png').writeAsBytes(png!.buffer.asUint8List());
      image.dispose();
    });
  }

  for (final width in [320.0, 390.0, 600.0]) {
    testWidgets(
      'Staff can open booked seat details without overflow at width $width',
      (tester) async {
        tester.view.physicalSize = Size(width, 760);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final service = BoardPreview();
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
              home: OperatorTripsScreen(service: service),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(service.dates.single, dateKey(vietnamToday()));
        expect(tester.takeException(), isNull);
        await capture(tester, key, 'staff-trips-${width.toInt()}');
        await tester.ensureVisible(find.text('Xem sơ đồ ghế'));
        await tester.tap(find.text('Xem sơ đồ ghế'));
        await tester.pumpAndSettle();
        expect(find.text('A1'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await capture(tester, key, 'staff-seats-${width.toInt()}');
        await tester.ensureVisible(find.text('A1'));
        await tester.tap(find.text('A1'));
        await tester.pumpAndSettle();
        expect(find.textContaining('Nguyễn Thị Minh Anh'), findsOneWidget);
        expect(tester.takeException(), isNull);
        final dialog = tester.getRect(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.byWidgetPredicate(
              (widget) =>
                  widget is Material && widget.type == MaterialType.card,
            ),
          ),
        );
        expect(dialog.left, greaterThanOrEqualTo(16));
        expect(dialog.right, lessThanOrEqualTo(width - 16));
        await capture(tester, key, 'staff-seat-dialog-${width.toInt()}');
      },
    );
  }

  testWidgets(
    'Long confirmation dialog scrolls on a small phone with keyboard and large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 200);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpWidget(
        MaterialApp(
          theme: appTheme,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.4)),
            child: child!,
          ),
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => opConfirm(
                  context,
                  'Xác nhận thay đổi thông tin đặt vé cho hành khách',
                  'Nội dung cần kiểm tra trước khi xác nhận. ' * 35,
                ),
                child: const Text('Mở'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Mở'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.text('Quay lại'));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
    },
  );
}
