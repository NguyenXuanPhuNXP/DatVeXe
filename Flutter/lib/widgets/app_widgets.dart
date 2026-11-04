import 'package:flutter/material.dart';

import '../config/app_theme.dart';

void notify(BuildContext context, Object e) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
Future<T?> open<T>(BuildContext context, Widget page) =>
    Navigator.of(context).push<T>(MaterialPageRoute(builder: (_) => page));
Widget heading(String title) => Padding(
  padding: const EdgeInsets.only(top: 20, bottom: 12),
  child: Text(
    title,
    style: const TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.bold,
      color: navy,
    ),
  ),
);
Widget panel(Widget child) => SizedBox(
  width: double.infinity,
  child: Card(
    margin: const EdgeInsets.only(bottom: 12),
    elevation: 0,
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: Color(0xFFE5E7EB)),
    ),
    child: Padding(padding: const EdgeInsets.all(16), child: child),
  ),
);
String? requiredValue(String? v) =>
    v == null || v.trim().isEmpty ? 'Vui lòng nhập thông tin' : null;
