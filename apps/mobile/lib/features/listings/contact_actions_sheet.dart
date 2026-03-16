import 'package:flutter/material.dart';

class ContactActionsSheet extends StatelessWidget {
  const ContactActionsSheet({
    required this.actions,
    super.key,
  });

  final List<String> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Contacter le vendeur', style: theme.textTheme.titleLarge),
            const SizedBox(height: 14),
            for (final action in actions) ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_labelForAction(action)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _labelForAction(String action) {
  return switch (action) {
    'whatsapp' => 'WhatsApp',
    'sms' => 'SMS',
    'call' => 'Appeler',
    _ => action,
  };
}
