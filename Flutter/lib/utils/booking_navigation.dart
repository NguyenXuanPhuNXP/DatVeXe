import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../screens/login_screen.dart';
import '../screens/seat_selection_screen.dart';
import 'app_access.dart';

Future<void> chooseCustomerSeats(
  BuildContext context,
  Map<String, dynamic> trip,
  String date,
  int passengers,
) async {
  if (api.user == null) {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }
  if (!context.mounted || api.user == null) return;
  if (!AppAccess(api.user).customer) {
    Navigator.popUntil(context, (r) => r.isFirst);
    return;
  }
  await Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) =>
          SeatSelectionScreen(trip: trip, date: date, passengers: passengers),
    ),
  );
}
