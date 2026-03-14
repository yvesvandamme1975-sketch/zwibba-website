import 'package:flutter/material.dart';

Map<String, WidgetBuilder> buildZwibbaRoutes() {
  return {
    '/': (_) => const _ScaffoldScreen(),
  };
}

class _ScaffoldScreen extends StatelessWidget {
  const _ScaffoldScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Zwibba Mobile Scaffold'),
      ),
    );
  }
}
