import 'package:flutter/material.dart';

class ReviewFormScreen extends StatelessWidget {
  const ReviewFormScreen({
    required this.areaOptions,
    required this.areaValue,
    required this.descriptionValue,
    required this.isDraftSynced,
    required this.onAreaChanged,
    required this.onBack,
    required this.onDescriptionChanged,
    required this.onPriceChanged,
    required this.onPublish,
    required this.onTitleChanged,
    required this.priceValue,
    this.syncSummary,
    required this.titleValue,
    super.key,
  });

  final List<String> areaOptions;
  final String areaValue;
  final String descriptionValue;
  final bool isDraftSynced;
  final ValueChanged<String?> onAreaChanged;
  final VoidCallback onBack;
  final ValueChanged<String> onDescriptionChanged;
  final ValueChanged<String> onPriceChanged;
  final Future<void> Function() onPublish;
  final ValueChanged<String> onTitleChanged;
  final String priceValue;
  final String? syncSummary;
  final String titleValue;

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
        Text('Corrigez le brouillon', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 10),
        Text(
          'La version Flutter reprend le flux validé dans le prototype navigateur.',
          style: theme.textTheme.bodyLarge
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        if (isDraftSynced) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: const Color(0x126BE66B),
              border: Border.all(color: const Color(0x336BE66B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Brouillon synchronisé',
                  style: theme.textTheme.titleMedium,
                ),
                if (syncSummary != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    syncSummary!,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 18),
        TextFormField(
          initialValue: titleValue,
          onChanged: onTitleChanged,
          decoration: const InputDecoration(labelText: 'Titre'),
        ),
        const SizedBox(height: 14),
        TextFormField(
          initialValue: priceValue,
          keyboardType: TextInputType.number,
          onChanged: onPriceChanged,
          decoration: const InputDecoration(labelText: 'Prix final (CDF)'),
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          value: areaValue.isEmpty ? null : areaValue,
          items: areaOptions
              .map((option) => DropdownMenuItem<String>(
                    value: option,
                    child: Text(option),
                  ))
              .toList(),
          onChanged: onAreaChanged,
          decoration: const InputDecoration(labelText: 'Zone'),
        ),
        const SizedBox(height: 14),
        TextFormField(
          initialValue: descriptionValue,
          minLines: 3,
          maxLines: 5,
          onChanged: onDescriptionChanged,
          decoration: const InputDecoration(labelText: 'Description'),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: isDraftSynced
              ? null
              : () async {
                  await onPublish();
                },
          child: const Text("Publier l'annonce"),
        ),
      ],
    );
  }
}
