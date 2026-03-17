import 'package:flutter/material.dart';

import '../../services/auth_api_service.dart';
import '../../services/wallet_api_service.dart';

class BoostOfferSheet extends StatefulWidget {
  const BoostOfferSheet({
    required this.listingId,
    required this.session,
    required this.walletApiService,
    super.key,
  });

  final String listingId;
  final SellerSession session;
  final WalletApiService walletApiService;

  @override
  State<BoostOfferSheet> createState() => _BoostOfferSheetState();
}

class _BoostOfferSheetState extends State<BoostOfferSheet> {
  bool _isBusy = false;
  BoostResult? _result;

  Future<void> _activateBoost() async {
    setState(() {
      _isBusy = true;
    });

    final result = await widget.walletApiService.activateBoost(
      listingId: widget.listingId,
      session: widget.session,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _isBusy = false;
      _result = result;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Boost annonce', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 12),
            Text(
              'Booster pendant 24 h pour 15 000 CDF',
              style: theme.textTheme.bodyLarge,
            ),
            if (_result != null) ...[
              const SizedBox(height: 16),
              Text(
                _result!.statusLabel,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: const Color(0xFF6BE66B),
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _isBusy ? null : _activateBoost,
              child: Text(_isBusy ? 'Activation...' : 'Activer le boost'),
            ),
          ],
        ),
      ),
    );
  }
}
