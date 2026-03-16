import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';

import 'config/api_base_url.dart';
import 'config/theme.dart';
import 'features/auth/otp_screen.dart';
import 'features/auth/phone_input_screen.dart';
import 'features/auth/welcome_screen.dart';
import 'features/browse/browse_screen.dart';
import 'features/boost/boost_offer_sheet.dart';
import 'features/chat/inbox_screen.dart';
import 'features/chat/thread_screen.dart';
import 'features/home/home_screen.dart';
import 'features/listings/contact_actions_sheet.dart';
import 'features/listings/listing_detail_screen.dart';
import 'features/post/camera_screen.dart';
import 'features/post/photo_guidance_screen.dart';
import 'features/post/publish_blocked_screen.dart';
import 'features/post/publish_pending_screen.dart';
import 'features/post/publish_success_screen.dart';
import 'features/post/review_form_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/wallet/wallet_screen.dart';
import 'models/listing_draft.dart';
import 'services/ai_draft_api_service.dart';
import 'services/api_client.dart';
import 'services/auth_api_service.dart';
import 'services/chat_api_service.dart';
import 'services/draft_api_service.dart';
import 'services/listings_api_service.dart';
import 'services/local_draft_cache_service.dart';
import 'services/media_api_service.dart';
import 'services/session_storage_service.dart';
import 'services/wallet_api_service.dart';

class ZwibbaApp extends StatelessWidget {
  const ZwibbaApp({
    super.key,
    this.aiDraftApiService,
    this.apiClient,
    this.authApiService,
    this.chatApiService,
    this.draftApiService,
    this.listingsApiService,
    this.localDraftCacheService,
    this.mediaApiService,
    this.sessionStorageService,
    this.walletApiService,
  });

  final AiDraftApiService? aiDraftApiService;
  final ApiClient? apiClient;
  final AuthApiService? authApiService;
  final ChatApiService? chatApiService;
  final DraftApiService? draftApiService;
  final ListingsApiService? listingsApiService;
  final LocalDraftCacheService? localDraftCacheService;
  final MediaApiService? mediaApiService;
  final SessionStorageService? sessionStorageService;
  final WalletApiService? walletApiService;

  @override
  Widget build(BuildContext context) {
    final resolvedApiClient = apiClient ?? HttpApiClient(baseUrl: apiBaseUrl);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildZwibbaTheme(),
      home: _RootAppShell(
        aiDraftApiService: aiDraftApiService ??
            HttpAiDraftApiService(apiClient: resolvedApiClient),
        authApiService:
            authApiService ?? HttpAuthApiService(apiClient: resolvedApiClient),
        chatApiService:
            chatApiService ?? HttpChatApiService(apiClient: resolvedApiClient),
        draftApiService: draftApiService ??
            HttpDraftApiService(apiClient: resolvedApiClient),
        listingsApiService: listingsApiService ??
            HttpListingsApiService(apiClient: resolvedApiClient),
        localDraftCacheService:
            localDraftCacheService ?? LocalDraftCacheService(),
        mediaApiService: mediaApiService ??
            HttpMediaApiService(apiClient: resolvedApiClient),
        sessionStorageService: sessionStorageService ?? SessionStorageService(),
        walletApiService: walletApiService ??
            HttpWalletApiService(apiClient: resolvedApiClient),
      ),
    );
  }
}

enum _AppSection {
  seller,
  buyer,
  messages,
  wallet,
  profile,
}

class _RootAppShell extends StatefulWidget {
  const _RootAppShell({
    required this.aiDraftApiService,
    required this.authApiService,
    required this.chatApiService,
    required this.draftApiService,
    required this.listingsApiService,
    required this.localDraftCacheService,
    required this.mediaApiService,
    required this.sessionStorageService,
    required this.walletApiService,
  });

  final AiDraftApiService aiDraftApiService;
  final AuthApiService authApiService;
  final ChatApiService chatApiService;
  final DraftApiService draftApiService;
  final ListingsApiService listingsApiService;
  final LocalDraftCacheService localDraftCacheService;
  final MediaApiService mediaApiService;
  final SessionStorageService sessionStorageService;
  final WalletApiService walletApiService;

  @override
  State<_RootAppShell> createState() => _RootAppShellState();
}

class _RootAppShellState extends State<_RootAppShell> {
  SellerSession? _activeSession;
  _AppSection _section = _AppSection.seller;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _handleSessionChanged(SellerSession session) async {
    setState(() {
      _activeSession = session;
    });

    unawaited(widget.sessionStorageService.writeSession(session));
  }

  Future<void> _restoreSession() async {
    final session = await widget.sessionStorageService.readSession();

    if (!mounted) {
      return;
    }

    setState(() {
      _activeSession = session;
    });
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
          child: switch (_section) {
            _AppSection.seller => _SellerFlowShell(
                activeSession: _activeSession,
                aiDraftApiService: widget.aiDraftApiService,
                authApiService: widget.authApiService,
                draftApiService: widget.draftApiService,
                localDraftCacheService: widget.localDraftCacheService,
                mediaApiService: widget.mediaApiService,
                onSessionChanged: _handleSessionChanged,
                walletApiService: widget.walletApiService,
              ),
            _AppSection.buyer => _BuyerFlowShell(
                listingsApiService: widget.listingsApiService,
              ),
            _AppSection.messages => _MessagesFlowShell(
                chatApiService: widget.chatApiService,
              ),
            _AppSection.wallet => _WalletFlowShell(
                walletApiService: widget.walletApiService,
              ),
            _AppSection.profile => ProfileScreen(
                session: _activeSession,
              ),
          },
        ),
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF17191A),
        indicatorColor: const Color(0x336BE66B),
        selectedIndex: _section.index,
        onDestinationSelected: (index) {
          setState(() {
            _section = _AppSection.values[index];
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_a_photo_outlined),
            selectedIcon: Icon(Icons.add_a_photo),
            label: 'Vendre',
          ),
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'Acheter',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Messages',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Portefeuille',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

class _MessagesFlowShell extends StatefulWidget {
  const _MessagesFlowShell({
    required this.chatApiService,
  });

  final ChatApiService chatApiService;

  @override
  State<_MessagesFlowShell> createState() => _MessagesFlowShellState();
}

class _MessagesFlowShellState extends State<_MessagesFlowShell> {
  String _draftMessage = '';
  bool _isLoading = true;
  bool _isSending = false;
  ChatThread? _selectedThread;
  List<ChatThreadSummary> _threads = const [];

  @override
  void initState() {
    super.initState();
    _loadInbox();
  }

  Future<void> _loadInbox() async {
    final threads = await widget.chatApiService.fetchInbox();

    if (!mounted) {
      return;
    }

    setState(() {
      _isLoading = false;
      _threads = threads;
    });
  }

  Future<void> _openThread(ChatThreadSummary thread) async {
    final detail = await widget.chatApiService.fetchThread(thread.id);

    if (!mounted) {
      return;
    }

    setState(() {
      _draftMessage = '';
      _selectedThread = detail;
    });
  }

  Future<void> _sendMessage() async {
    final selectedThread = _selectedThread;
    final messageBody = _draftMessage.trim();

    if (selectedThread == null || messageBody.isEmpty) {
      return;
    }

    setState(() {
      _isSending = true;
    });

    final updatedThread = await widget.chatApiService.sendMessage(
      body: messageBody,
      threadId: selectedThread.id,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _draftMessage = '';
      _isSending = false;
      _selectedThread = updatedThread;
      _threads = _threads
          .map(
            (thread) => thread.id == updatedThread.id
                ? ChatThreadSummary(
                    id: thread.id,
                    lastMessagePreview: updatedThread.messages.last.body,
                    listingSlug: thread.listingSlug,
                    listingTitle: thread.listingTitle,
                    participantName: thread.participantName,
                    unreadCount: 0,
                  )
                : thread,
          )
          .toList(growable: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedThread != null) {
      return ThreadScreen(
        draftMessage: _draftMessage,
        isSending: _isSending,
        onBack: () {
          setState(() {
            _draftMessage = '';
            _selectedThread = null;
          });
        },
        onDraftMessageChanged: (value) {
          setState(() {
            _draftMessage = value;
          });
        },
        onSend: _sendMessage,
        thread: _selectedThread!,
      );
    }

    return InboxScreen(
      isLoading: _isLoading,
      onOpenThread: _openThread,
      threads: _threads,
    );
  }
}

class _BuyerFlowShell extends StatefulWidget {
  const _BuyerFlowShell({
    required this.listingsApiService,
  });

  final ListingsApiService listingsApiService;

  @override
  State<_BuyerFlowShell> createState() => _BuyerFlowShellState();
}

class _BuyerFlowShellState extends State<_BuyerFlowShell> {
  List<ListingSummary> _listings = const [];
  ListingDetail? _selectedDetail;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadListings();
  }

  Future<void> _loadListings() async {
    final listings = await widget.listingsApiService.fetchBrowseListings();

    if (!mounted) {
      return;
    }

    setState(() {
      _isLoading = false;
      _listings = listings;
    });
  }

  Future<void> _openListing(ListingSummary listing) async {
    final detail = await widget.listingsApiService.fetchListingDetail(
      listing.slug,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _selectedDetail = detail;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedDetail != null) {
      return ListingDetailScreen(
        detail: _selectedDetail!,
        onBack: () {
          setState(() {
            _selectedDetail = null;
          });
        },
        onContact: () {
          showModalBottomSheet<void>(
            context: context,
            backgroundColor: const Color(0xFF17191A),
            builder: (context) => ContactActionsSheet(
              actions: _selectedDetail!.contactActions,
            ),
          );
        },
      );
    }

    return BrowseScreen(
      isLoading: _isLoading,
      listings: _listings,
      onOpenListing: _openListing,
    );
  }
}

class _WalletFlowShell extends StatefulWidget {
  const _WalletFlowShell({
    required this.walletApiService,
  });

  final WalletApiService walletApiService;

  @override
  State<_WalletFlowShell> createState() => _WalletFlowShellState();
}

class _WalletFlowShellState extends State<_WalletFlowShell> {
  bool _isLoading = true;
  WalletOverview? _wallet;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    final wallet = await widget.walletApiService.fetchWallet();

    if (!mounted) {
      return;
    }

    setState(() {
      _isLoading = false;
      _wallet = wallet;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    final wallet = _wallet;

    if (wallet == null) {
      return const SizedBox.shrink();
    }

    return WalletScreen(
      balanceCdf: wallet.balanceCdf,
      transactions: wallet.transactions,
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
  publishBlocked,
  publishPending,
  publishSuccess,
  review,
}

class _SellerFlowShell extends StatefulWidget {
  const _SellerFlowShell({
    required this.activeSession,
    required this.aiDraftApiService,
    required this.authApiService,
    required this.draftApiService,
    required this.localDraftCacheService,
    required this.mediaApiService,
    required this.onSessionChanged,
    required this.walletApiService,
  });

  final SellerSession? activeSession;
  final AiDraftApiService aiDraftApiService;
  final AuthApiService authApiService;
  final DraftApiService draftApiService;
  final LocalDraftCacheService localDraftCacheService;
  final MediaApiService mediaApiService;
  final Future<void> Function(SellerSession session) onSessionChanged;
  final WalletApiService walletApiService;

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
  PublishOutcome? _publishOutcome;
  SellerSession? _session;
  _SellerStep _step = _SellerStep.home;

  @override
  void initState() {
    super.initState();
    _session = widget.activeSession;
    _restoreDraft();
  }

  @override
  void didUpdateWidget(covariant _SellerFlowShell oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.activeSession?.sessionToken != _session?.sessionToken) {
      _session = widget.activeSession;
    }
  }

  void _goHome() {
    setState(() {
      _publishOutcome = null;
      _step = _SellerStep.home;
    });
  }

  Future<void> _cacheDraft(ListingDraft draft) {
    return widget.localDraftCacheService.writeDraft(draft);
  }

  Future<void> _clearCachedDraft() {
    return widget.localDraftCacheService.clearDraft();
  }

  List<int> _buildPresetPhotoBytes(CameraPreset preset) {
    return utf8.encode(
      '${preset.id}|${preset.label}|${preset.description}|${preset.defaultTitle}',
    );
  }

  Future<void> _restoreDraft() async {
    final cachedDraft = await widget.localDraftCacheService.readDraft();

    if (!mounted || cachedDraft == null) {
      return;
    }

    setState(() {
      _draft = cachedDraft;
    });
  }

  void _handlePrimaryAction() {
    setState(() {
      _step = _draft == null ? _SellerStep.camera : _SellerStep.review;
    });
  }

  Future<void> _handleCapture(CameraPreset preset) async {
    ListingDraft? localDraft;

    setState(() {
      _isBusy = true;
      _publishOutcome = null;
    });

    try {
      final uploadSlot = await widget.mediaApiService.requestUploadSlot(
        contentType: 'image/jpeg',
        fileName: '${preset.id}.jpg',
        sourcePresetId: preset.id,
      );
      await widget.mediaApiService.uploadBytes(
        bytes: _buildPresetPhotoBytes(preset),
        contentType: 'image/jpeg',
        uploadUrl: uploadSlot.uploadUrl,
      );
      final uploadedPhoto = DraftPhoto(
        objectKey: uploadSlot.objectKey,
        photoId: uploadSlot.photoId,
        publicUrl: uploadSlot.publicUrl,
        sourcePresetId: uploadSlot.sourcePresetId,
        uploadStatus: 'uploaded',
      );
      localDraft = ListingDraft.fromCapturePreset(
        area: preset.defaultArea,
        description: preset.defaultDescription,
        guidancePrompts: preset.guidancePrompts,
        photos: [uploadedPhoto],
        priceCdf: preset.defaultPriceCdf,
        title: preset.defaultTitle,
      );
      final preparedDraft = await widget.aiDraftApiService.prepareDraft(
        draft: localDraft,
        photoPresetId: preset.id,
      );
      await _cacheDraft(preparedDraft);

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = preparedDraft;
        _isBusy = false;
        _publishOutcome = null;
        _step = _SellerStep.guidance;
      });
    } catch (_) {
      final fallbackDraft = localDraft ??
          ListingDraft.fromCapturePreset(
            area: preset.defaultArea,
            description: preset.defaultDescription,
            guidancePrompts: preset.guidancePrompts,
            photos: const [],
            priceCdf: preset.defaultPriceCdf,
            title: preset.defaultTitle,
          );
      await _cacheDraft(fallbackDraft);

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = fallbackDraft;
        _isBusy = false;
        _publishOutcome = null;
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
      await _cacheDraft(syncedDraft);

      if (!mounted) {
        return;
      }

      await widget.onSessionChanged(session);

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = syncedDraft;
        _isBusy = false;
        _publishOutcome = null;
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

  Future<void> _handleSyncDraftWithActiveSession() async {
    final draft = _draft;
    final session = _session;

    if (draft == null || session == null) {
      return;
    }

    setState(() {
      _isBusy = true;
    });

    try {
      final syncedDraft = await widget.draftApiService.syncDraft(
        draft: draft,
        session: session,
      );
      await _cacheDraft(syncedDraft);

      if (!mounted) {
        return;
      }

      setState(() {
        _draft = syncedDraft;
        _isBusy = false;
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

  Future<void> _handlePublishAttempt() async {
    if (_draft?.isSynced ?? false) {
      await _handlePublishNow();
      return;
    }

    if (_session != null) {
      await _handleSyncDraftWithActiveSession();
      return;
    }

    setState(() {
      _step = _SellerStep.authWelcome;
    });
  }

  Future<void> _handlePublishNow() async {
    final draft = _draft;
    final session = _session;

    if (draft == null || session == null) {
      return;
    }

    setState(() {
      _isBusy = true;
    });

    try {
      final publishOutcome = await widget.draftApiService.publishDraft(
        draft: draft,
        session: session,
      );
      if (publishOutcome.status == 'approved' ||
          publishOutcome.status == 'pending_manual_review') {
        await _clearCachedDraft();
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _isBusy = false;
        _publishOutcome = publishOutcome;
        _step = switch (publishOutcome.status) {
          'approved' => _SellerStep.publishSuccess,
          'pending_manual_review' => _SellerStep.publishPending,
          _ => _SellerStep.publishBlocked,
        };
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
          photoCount: _draft?.photos.length ?? 0,
          prompts: _draft?.guidancePrompts ?? const <String>[],
        );
      case _SellerStep.review:
        return ReviewFormScreen(
          areaOptions: _areaOptions,
          areaValue: _draft?.area ?? '',
          descriptionValue: _draft?.description ?? '',
          isBusy: _isBusy,
          isDraftSynced: _draft?.isSynced ?? false,
          photoSummary:
              '${_draft?.photos.length ?? 0} photo${(_draft?.photos.length ?? 0) > 1 ? 's' : ''} prête${(_draft?.photos.length ?? 0) > 1 ? 's' : ''}',
          onAreaChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(area: value ?? '');
            });
            final nextDraft = _draft;
            if (nextDraft != null) {
              unawaited(_cacheDraft(nextDraft));
            }
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
            final nextDraft = _draft;
            if (nextDraft != null) {
              unawaited(_cacheDraft(nextDraft));
            }
          },
          onPriceChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(priceCdf: value);
            });
            final nextDraft = _draft;
            if (nextDraft != null) {
              unawaited(_cacheDraft(nextDraft));
            }
          },
          onPublish: () async {
            await _handlePublishAttempt();
          },
          onTitleChanged: (value) {
            setState(() {
              _draft = _draft?.copyWith(title: value);
            });
            final nextDraft = _draft;
            if (nextDraft != null) {
              unawaited(_cacheDraft(nextDraft));
            }
          },
          priceValue: _draft?.priceCdf ?? '',
          syncSummary: _draft?.isSynced ?? false
              ? 'Brouillon synchronisé pour ${_draft?.ownerPhoneNumber ?? _session?.phoneNumber ?? _phoneNumber}.'
              : null,
          titleValue: _draft?.title ?? '',
        );
      case _SellerStep.publishSuccess:
        return PublishSuccessScreen(
          listingTitle: _draft?.title ?? 'Annonce Zwibba',
          onBackHome: _goHome,
          onBoost: () {
            final listingId =
                _publishOutcome?.id ?? _draft?.syncedDraftId ?? '';

            showModalBottomSheet<void>(
              context: context,
              backgroundColor: const Color(0xFF17191A),
              builder: (context) => BoostOfferSheet(
                listingId: listingId,
                walletApiService: widget.walletApiService,
              ),
            );
          },
          onViewListing: _goHome,
          reasonSummary: _publishOutcome?.reasonSummary ??
              'Annonce approuvée et prête à partager.',
          statusLabel: _publishOutcome?.statusLabel ??
              'Annonce approuvée et prête à partager',
        );
      case _SellerStep.publishPending:
        return PublishPendingScreen(
          onBackHome: _goHome,
          reasonSummary: _publishOutcome?.reasonSummary ??
              'Votre annonce passe en revue manuelle.',
          statusLabel: _publishOutcome?.statusLabel ??
              'Annonce envoyée en revue manuelle',
        );
      case _SellerStep.publishBlocked:
        return PublishBlockedScreen(
          onEditDraft: () {
            setState(() {
              _step = _SellerStep.review;
            });
          },
          reasonSummary: _publishOutcome?.reasonSummary ??
              'Complétez les informations manquantes avant de republier.',
          statusLabel: _publishOutcome?.statusLabel ??
              'Annonce bloquée: informations à corriger',
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
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: KeyedSubtree(
        key: ValueKey<_SellerStep>(_step),
        child: _buildCurrentScreen(),
      ),
    );
  }
}
