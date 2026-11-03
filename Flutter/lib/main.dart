import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'config/config_api.dart';

import 'config/app_theme.dart';
import 'screens/dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  ApiConfig.validate();
  runApp(const RightwayApp());
}

class RightwayApp extends StatelessWidget {
  const RightwayApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: ApiConfig.appName,
    debugShowCheckedModeBanner: false,
    theme: appTheme,
    builder: (context, child) => Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: child!,
      ),
    ),
    home: const DashboardScreen(),
  );
}
