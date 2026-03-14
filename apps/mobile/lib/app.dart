import 'package:flutter/material.dart';

import 'config/routes.dart';
import 'config/theme.dart';

class ZwibbaApp extends StatelessWidget {
  const ZwibbaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildZwibbaTheme(),
      routes: buildZwibbaRoutes(),
      initialRoute: '/',
    );
  }
}
