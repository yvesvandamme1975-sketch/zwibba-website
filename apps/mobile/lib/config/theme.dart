import 'package:flutter/material.dart';

ThemeData buildZwibbaTheme() {
  const background = Color(0xFF111214);
  const surface = Color(0xFF1E2320);
  const primary = Color(0xFF6BE66B);
  const outline = Color(0x22FFFFFF);

  final colorScheme = const ColorScheme.dark(
    primary: primary,
    secondary: primary,
    onSurfaceVariant: Color(0xFFAAB1AE),
    outline: outline,
    surface: surface,
  );

  return ThemeData(
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: background,
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: const Color(0xFF101610),
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0x0FFFFFFF),
      labelStyle: const TextStyle(color: Color(0xFFAAB1AE)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: primary),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: outline),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF1E2320),
      contentTextStyle: const TextStyle(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: const Color(0xFFAAB1AE),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textTheme: const TextTheme(
      headlineLarge:
          TextStyle(fontSize: 36, fontWeight: FontWeight.w800, height: 1.05),
      headlineMedium:
          TextStyle(fontSize: 28, fontWeight: FontWeight.w800, height: 1.1),
      headlineSmall:
          TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.15),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(fontSize: 14, height: 1.5),
      bodySmall: TextStyle(fontSize: 12, height: 1.4),
      labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
    ),
    useMaterial3: true,
  );
}
