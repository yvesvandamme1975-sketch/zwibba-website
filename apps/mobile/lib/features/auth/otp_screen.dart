import 'package:flutter/material.dart';

class OtpScreen extends StatelessWidget {
  const OtpScreen({
    required this.onBack,
    required this.onVerify,
    required this.phoneNumber,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onVerify;
  final String phoneNumber;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(alignment: Alignment.centerLeft),
          child: const Text('Retour'),
        ),
        const SizedBox(height: 12),
        Text('Code OTP', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'Code envoyé vers $phoneNumber',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        const TextField(
          decoration: InputDecoration(labelText: 'Code reçu'),
        ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: onVerify,
          child: const Text('Vérifier et continuer'),
        ),
      ],
    );
  }
}
