import 'package:flutter/material.dart';

const red = Color(0xFFDC2626);
const navy = Color(0xFF1E3A5F);
final appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: red,
    primary: red,
    secondary: navy,
  ),
  scaffoldBackgroundColor: const Color(0xFFF9FAFB),
  visualDensity: VisualDensity.standard,
  dialogTheme: DialogThemeData(
    backgroundColor: Colors.white,
    surfaceTintColor: Colors.transparent,
    insetPadding: const EdgeInsets.all(16),
    constraints: const BoxConstraints(minWidth: 480, maxWidth: 480),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  ),
  cardTheme: CardThemeData(
    color: Colors.white,
    surfaceTintColor: Colors.transparent,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: Color(0xFFE5E7EB)),
    ),
  ),
  drawerTheme: const DrawerThemeData(backgroundColor: Colors.white),
  navigationBarTheme: NavigationBarThemeData(
    backgroundColor: Colors.white,
    indicatorColor: const Color(0xFFFEF2F2),
    labelTextStyle: WidgetStateProperty.resolveWith(
      (s) => TextStyle(
        fontSize: 11,
        color: s.contains(WidgetState.selected) ? red : navy,
      ),
    ),
  ),
  listTileTheme: const ListTileThemeData(
    selectedColor: red,
    selectedTileColor: Color(0xFFFEF2F2),
  ),
  dividerTheme: const DividerThemeData(color: Color(0xFFE5E7EB)),
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: navy,
    centerTitle: false,
  ),
  inputDecorationTheme: InputDecorationTheme(
    errorMaxLines: 3,
    helperMaxLines: 3,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(0, 50),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(0, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
  ),
);
