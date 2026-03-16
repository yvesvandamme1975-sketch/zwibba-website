import 'package:flutter/material.dart';

class AuthWelcomeScreen extends StatelessWidget {
  const AuthWelcomeScreen({
    required this.onBack,
    required this.onContinue,
    super.key,
  });

  final VoidCallback onBack;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        TextButton(
          onPressed: onBack,
          style: TextButton.styleFrom(alignment: Alignment.centerLeft),
          child: const Text('Retour au brouillon'),
        ),
        const SizedBox(height: 12),
        Text('Publiez seulement après vérification',
            style: theme.textTheme.headlineMedium),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: const Color(0x0FFFFFFF),
            border: Border.all(color: const Color(0x14FFFFFF)),
          ),
          child: Text(
            'Le numéro n’est demandé qu’au moment de publier pour synchroniser le brouillon et limiter le spam.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: onContinue,
          child: const Text('Continuer avec mon numéro'),
        ),
      ],
    );
  }
}
