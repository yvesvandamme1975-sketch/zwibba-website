import 'package:flutter/material.dart';

import 'config/theme.dart';
import 'features/auth/otp_screen.dart';
import 'features/auth/phone_input_screen.dart';
import 'features/auth/welcome_screen.dart';
import 'features/home/home_screen.dart';
import 'features/post/camera_screen.dart';
import 'features/post/photo_guidance_screen.dart';
import 'features/post/review_form_screen.dart';

class ZwibbaApp extends StatelessWidget {
  const ZwibbaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildZwibbaTheme(),
      home: const _SellerFlowShell(),
    );
  }
}

enum _SellerStep {
  home,
  camera,
  guidance,
  review,
  authWelcome,
  phoneInput,
  otpInput,
}

class _SellerFlowShell extends StatefulWidget {
  const _SellerFlowShell();

  @override
  State<_SellerFlowShell> createState() => _SellerFlowShellState();
}

class _SellerFlowShellState extends State<_SellerFlowShell> {
  static const _capturePresets = <CameraPreset>[
    CameraPreset(
      id: 'phone-front',
      label: 'Téléphone premium',
      description:
          'Bon test pour déclencher une annonce téléphone avec aide IA.',
      defaultTitle: 'Samsung Galaxy A54 128 Go',
      defaultDescription: 'Téléphone propre, version 128 Go, prêt à l’emploi.',
      defaultArea: 'Lubumbashi Centre',
      defaultPriceCdf: '4256000',
      guidancePrompts: ['Face', 'Dos', 'Écran allumé'],
    ),
    CameraPreset(
      id: 'sofa-showroom',
      label: 'Canapé salon',
      description: 'Démo maison et jardin avec résumé vendeur plus visuel.',
      defaultTitle: 'Canapé trois places style contemporain',
      defaultDescription:
          'Canapé en bon état, mousse dense, disponible immédiatement.',
      defaultArea: 'Golf',
      defaultPriceCdf: '700000',
      guidancePrompts: ['Vue d’ensemble', 'Vue latérale', 'Détail'],
    ),
    CameraPreset(
      id: 'vehicle-front',
      label: 'SUV en vente',
      description: 'Déclenche le parcours véhicule avec photos guidées.',
      defaultTitle: 'Toyota Hilux 2019 4x4',
      defaultDescription:
          'SUV fiable avec papiers en ordre et entretien suivi.',
      defaultArea: 'Bel Air',
      defaultPriceCdf: '18500000',
      guidancePrompts: ['Avant', 'Vue latérale', 'Tableau de bord'],
    ),
  ];

  static const _areaOptions = <String>[
    'Bel Air',
    'Golf',
    'Lubumbashi Centre',
    'Q. Industriel',
    'Kamalondo',
    'Kenya',
  ];

  _SellerStep _step = _SellerStep.home;
  _ListingDraft? _draft;
  String _phoneNumber = '+243';
  bool _otpVerified = false;

  void _goHome() {
    setState(() {
      _step = _SellerStep.home;
    });
  }

  void _handlePrimaryAction() {
    setState(() {
      _step = _draft == null ? _SellerStep.camera : _SellerStep.review;
    });
  }

  void _handleCapture(CameraPreset preset) {
    setState(() {
      _draft = _ListingDraft.fromPreset(preset);
      _otpVerified = false;
      _step = _SellerStep.guidance;
    });
  }

  void _handlePublishAttempt() {
    setState(() {
      _step = _otpVerified ? _SellerStep.review : _SellerStep.authWelcome;
    });

    if (_otpVerified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'La publication réelle sera branchée à la prochaine tâche API.'),
        ),
      );
    }
  }

  Widget _buildCurrentScreen() {
    switch (_step) {
      case _SellerStep.camera:
        return CameraScreen(
          presets: _capturePresets,
          onBack: _goHome,
          onCapture: _handleCapture,
        );
      case _SellerStep.guidance:
        return PhotoGuidanceScreen(
          listingTitle: _draft?.title ?? 'Annonce en préparation',
          prompts: _draft?.guidancePrompts ?? const <String>[],
          onBackHome: _goHome,
          onContinue: () {
            setState(() {
              _step = _SellerStep.review;
            });
          },
        );
      case _SellerStep.review:
        return ReviewFormScreen(
          areaOptions: _areaOptions,
          areaValue: _draft?.area ?? '',
          descriptionValue: _draft?.description ?? '',
          isOtpVerified: _otpVerified,
          priceValue: _draft?.priceCdf ?? '',
          titleValue: _draft?.title ?? '',
          onAreaChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(area: value);
            });
          },
          onBack: () {
            setState(() {
              _step = _SellerStep.guidance;
            });
          },
          onDescriptionChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(description: value);
            });
          },
          onPriceChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(priceCdf: value);
            });
          },
          onPublish: _handlePublishAttempt,
          onTitleChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(title: value);
            });
          },
        );
      case _SellerStep.authWelcome:
        return AuthWelcomeScreen(
          onBack: () {
            setState(() {
              _step = _SellerStep.review;
            });
          },
          onContinue: () {
            setState(() {
              _step = _SellerStep.phoneInput;
            });
          },
        );
      case _SellerStep.phoneInput:
        return PhoneInputScreen(
          phoneNumber: _phoneNumber,
          onBack: () {
            setState(() {
              _step = _SellerStep.authWelcome;
            });
          },
          onContinue: () {
            setState(() {
              _step = _SellerStep.otpInput;
            });
          },
          onPhoneNumberChanged: (value) {
            setState(() {
              _phoneNumber = value;
            });
          },
        );
      case _SellerStep.otpInput:
        return OtpScreen(
          phoneNumber: _phoneNumber,
          onBack: () {
            setState(() {
              _step = _SellerStep.phoneInput;
            });
          },
          onVerify: () {
            setState(() {
              _otpVerified = true;
              _step = _SellerStep.review;
            });
          },
        );
      case _SellerStep.home:
        return HomeScreen(
          draftSubtitle: _draft?.title,
          hasDraft: _draft != null,
          onPrimaryAction: _handlePrimaryAction,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A1D1B), Color(0xFF111214)],
          ),
        ),
        child: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOut,
            switchOutCurve: Curves.easeIn,
            child: KeyedSubtree(
              key: ValueKey<_SellerStep>(_step),
              child: _buildCurrentScreen(),
            ),
          ),
        ),
      ),
    );
  }
}

class _ListingDraft {
  const _ListingDraft({
    required this.area,
    required this.description,
    required this.guidancePrompts,
    required this.priceCdf,
    required this.title,
  });

  factory _ListingDraft.fromPreset(CameraPreset preset) {
    return _ListingDraft(
      area: preset.defaultArea,
      description: preset.defaultDescription,
      guidancePrompts: preset.guidancePrompts,
      priceCdf: preset.defaultPriceCdf,
      title: preset.defaultTitle,
    );
  }

  final String area;
  final String description;
  final List<String> guidancePrompts;
  final String priceCdf;
  final String title;

  _ListingDraft copyWith({
    String? area,
    String? description,
    String? priceCdf,
    String? title,
  }) {
    return _ListingDraft(
      area: area ?? this.area,
      description: description ?? this.description,
      guidancePrompts: guidancePrompts,
      priceCdf: priceCdf ?? this.priceCdf,
      title: title ?? this.title,
    );
  }
}
