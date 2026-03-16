import 'package:flutter/material.dart';

import 'config/api_base_url.dart';
import 'config/theme.dart';
import 'features/auth/otp_screen.dart';
import 'features/auth/phone_input_screen.dart';
import 'features/auth/welcome_screen.dart';
import 'features/home/home_screen.dart';
import 'features/post/camera_screen.dart';
import 'features/post/photo_guidance_screen.dart';
import 'features/post/review_form_screen.dart';
import 'models/listing_draft.dart';
import 'services/ai_draft_api_service.dart';
import 'services/api_client.dart';
import 'services/auth_api_service.dart';
import 'services/draft_api_service.dart';

class ZwibbaApp extends StatelessWidget {
  const ZwibbaApp({
    super.key,
    this.aiDraftApiService,
    this.apiClient,
    this.authApiService,
    this.draftApiService,
  });

  final AiDraftApiService? aiDraftApiService;
  final ApiClient? apiClient;
  final AuthApiService? authApiService;
  final DraftApiService? draftApiService;

  @override
  Widget build(BuildContext context) {
    final resolvedApiClient = apiClient ?? HttpApiClient(baseUrl: apiBaseUrl);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildZwibbaTheme(),
      home: _SellerFlowShell(
        aiDraftApiService: aiDraftApiService ??
            HttpAiDraftApiService(apiClient: resolvedApiClient),
        authApiService:
            authApiService ?? HttpAuthApiService(apiClient: resolvedApiClient),
        draftApiService: draftApiService ??
            HttpDraftApiService(apiClient: resolvedApiClient),
      ),
    );
  }
}

enum _SellerStep {
  authWelcome,
  camera,
  guidance,
  home,
  otpInput,
  phoneInput,
  review,
}

class _SellerFlowShell extends StatefulWidget {
  const _SellerFlowShell({
    required this.aiDraftApiService,
    required this.authApiService,
    required this.draftApiService,
  });

  final AiDraftApiService aiDraftApiService;
  final AuthApiService authApiService;
  final DraftApiService draftApiService;

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

  ListingDraft? _draft;
  bool _isBusy = false;
  String _otpCode = '123456';
  String _phoneNumber = '+243990000001';
  SellerSession? _session;
  _SellerStep _step = _SellerStep.home;

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

  Future<void> _handleCapture(CameraPreset preset) async {
    final localDraft = ListingDraft.fromCapturePreset(
      area: preset.defaultArea,
      description: preset.defaultDescription,
      guidancePrompts: preset.guidancePrompts,
      priceCdf: preset.defaultPriceCdf,
      title: preset.defaultTitle,
    );

    setState(() {
      _draft = localDraft;
      _isBusy = true;
      _session = null;
    });

    try {
      final preparedDraft = await widget.aiDraftApiService.prepareDraft(
        draft: localDraft,
        photoPresetId: preset.id,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = preparedDraft;
        _isBusy = false;
        _step = _SellerStep.guidance;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _draft = localDraft;
        _isBusy = false;
        _step = _SellerStep.guidance;
      });
    }
  }

  Future<void> _handleOtpRequest() async {
    setState(() {
      _isBusy = true;
    });

    try {
      final challenge = await widget.authApiService.requestOtp(
        phoneNumber: _phoneNumber,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _phoneNumber = challenge.phoneNumber;
        _isBusy = false;
        _step = _SellerStep.otpInput;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isBusy = false;
      });
    }
  }

  Future<void> _handleOtpVerify() async {
    final draft = _draft;

    if (draft == null) {
      return;
    }

    setState(() {
      _isBusy = true;
    });

    try {
      final session = await widget.authApiService.verifyOtp(
        code: _otpCode,
        phoneNumber: _phoneNumber,
      );
      final syncedDraft = await widget.draftApiService.syncDraft(
        draft: draft,
        session: session,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = syncedDraft;
        _isBusy = false;
        _session = session;
        _step = _SellerStep.review;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isBusy = false;
      });
    }
  }

  void _handlePublishAttempt() {
    if (_draft?.isSynced ?? false) {
      return;
    }

    setState(() {
      _step = _SellerStep.authWelcome;
    });
  }

  Widget _buildCurrentScreen() {
    switch (_step) {
      case _SellerStep.camera:
        return CameraScreen(
          busyLabel: _isBusy ? 'Connexion à l’IA Zwibba...' : null,
          onBack: _goHome,
          onCapture: _handleCapture,
          presets: _capturePresets,
        );
      case _SellerStep.guidance:
        return PhotoGuidanceScreen(
          listingTitle: _draft?.title ?? 'Annonce en préparation',
          onBackHome: _goHome,
          onContinue: () {
            setState(() {
              _step = _SellerStep.review;
            });
          },
          prompts: _draft?.guidancePrompts ?? const <String>[],
        );
      case _SellerStep.review:
        return ReviewFormScreen(
          areaOptions: _areaOptions,
          areaValue: _draft?.area ?? '',
          descriptionValue: _draft?.description ?? '',
          isDraftSynced: _draft?.isSynced ?? false,
          onAreaChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(area: value ?? '');
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
          onPublish: () async {
            _handlePublishAttempt();
          },
          onTitleChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(title: value);
            });
          },
          priceValue: _draft?.priceCdf ?? '',
          syncSummary: _draft?.isSynced ?? false
              ? 'Brouillon synchronisé pour ${_draft?.ownerPhoneNumber ?? _session?.phoneNumber ?? _phoneNumber}.'
              : null,
          titleValue: _draft?.title ?? '',
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
          isBusy: _isBusy,
          onBack: () {
            setState(() {
              _step = _SellerStep.authWelcome;
            });
          },
          onContinue: _handleOtpRequest,
          onPhoneNumberChanged: (value) {
            setState(() {
              _phoneNumber = value;
            });
          },
          phoneNumber: _phoneNumber,
        );
      case _SellerStep.otpInput:
        return OtpScreen(
          isBusy: _isBusy,
          onBack: () {
            setState(() {
              _step = _SellerStep.phoneInput;
            });
          },
          onOtpCodeChanged: (value) {
            setState(() {
              _otpCode = value;
            });
          },
          onVerify: _handleOtpVerify,
          otpCode: _otpCode,
          phoneNumber: _phoneNumber,
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
