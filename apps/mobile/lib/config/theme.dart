import 'package:flutter/material.dart';

ThemeData buildZwibbaTheme() {
  const background = Color(0xFF1E1E20);
  const surface = Color(0xFF2A2A2C);
  const primary = Color(0xFF6BE66B);

  final colorScheme = const ColorScheme.dark(
    primary: primary,
    secondary: primary,
    surface: surface,
  );

  return ThemeData(
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: background,
    useMaterial3: true,
  );
}
