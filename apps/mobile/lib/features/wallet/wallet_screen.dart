import 'package:flutter/material.dart';

import '../../services/wallet_api_service.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({
    required this.balanceCdf,
    required this.transactions,
    super.key,
  });

  final int balanceCdf;
  final List<WalletTransaction> transactions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text('Mon portefeuille', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: const Color(0x126BE66B),
            border: Border.all(color: const Color(0x336BE66B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Solde disponible',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${_formatCdf(balanceCdf)} CDF',
                style: theme.textTheme.headlineMedium,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('Transactions récentes', style: theme.textTheme.titleLarge),
        const SizedBox(height: 12),
        for (final transaction in transactions)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: const Color(0xFF17191A),
                border: Border.all(color: const Color(0x1FFFFFFF)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(transaction.label,
                            style: theme.textTheme.titleMedium),
                        const SizedBox(height: 6),
                        Text(
                          transaction.createdAtLabel,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${transaction.amountCdf > 0 ? '+' : '-'}${_formatCdf(transaction.amountCdf.abs())} CDF',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: transaction.kind == 'credit'
                          ? const Color(0xFF6BE66B)
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

String _formatCdf(int value) {
  final digits = value.toString();
  final buffer = StringBuffer();

  for (var index = 0; index < digits.length; index += 1) {
    final reverseIndex = digits.length - index;
    buffer.write(digits[index]);

    if (reverseIndex > 1 && reverseIndex % 3 == 1) {
      buffer.write(' ');
    }
  }

  return buffer.toString();
}
