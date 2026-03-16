import 'package:flutter/material.dart';

class PhoneInputScreen extends StatelessWidget {
  const PhoneInputScreen({
    required this.isBusy,
    required this.onBack,
    required this.onContinue,
    required this.onPhoneNumberChanged,
    required this.phoneNumber,
    super.key,
  });

  final bool isBusy;
  final VoidCallback onBack;
  final Future<void> Function() onContinue;
  final ValueChanged<String> onPhoneNumberChanged;
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
        Text('Entrez votre numéro', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'Le brouillon restera local tant que cette étape n’est pas validée.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        TextFormField(
          enabled: !isBusy,
          initialValue: phoneNumber,
          keyboardType: TextInputType.phone,
          onChanged: onPhoneNumberChanged,
          decoration: const InputDecoration(labelText: 'Numéro'),
        ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: isBusy
              ? null
              : () async {
                  await onContinue();
                },
          child: Text(isBusy ? 'Connexion...' : 'Recevoir le code'),
        ),
      ],
    );
  }
}
