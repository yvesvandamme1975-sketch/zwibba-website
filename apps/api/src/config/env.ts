type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;
type OtpProvider = 'demo' | 'meta';
type AiProvider = 'stub' | 'multi' | 'mistral';

export type ZwibbaEnv = {
  admin: {
    sharedSecret: string;
  };
  boost: {
    enabled: boolean;
  };
  ai: {
    anthropic?: {
      apiKey: string;
      model: string;
    };
    draftDailyLimit: number;
    gemini?: {
      apiKey: string;
      model: string;
    };
    mistral?: {
      apiKey: string;
      model: string;
    };
    googleVision?: {
      apiKey: string;
      projectId: string;
    };
    googleVisionEnrichmentEnabled: boolean;
    provider: AiProvider;
  };
  appBaseUrl: string;
  databaseUrl: string;
  nodeEnv: string;
  otp: {
    demoAllowlist: string[];
    demoCode?: string;
    provider: OtpProvider;
  };
  meta?: {
    accessToken: string;
    graphApiVersion: string;
    phoneNumberId: string;
    templateLang: string;
    templateName: string;
  };
  port: number;
  r2: {
    accessKeyId: string;
    accountId: string;
    bucket: string;
    publicBaseUrl: string;
    s3Endpoint: string;
    secretAccessKey: string;
  };
  support: {
    whatsappVerifyToken?: string;
    metaAppSecret?: string;
    escalationEmail: string;
    emailProviderApiKey?: string;
    claudeApiKey?: string;
    claudeModel?: string;
  };
};

const defaultEnvValues = {
  AI_PROVIDER: 'stub',
  AI_DRAFT_DAILY_LIMIT: '500',
  ANTHROPIC_API_KEY: 'anthropic-api-key',
  ANTHROPIC_MODEL: 'claude-haiku-4-5-20251001',
  APP_BASE_URL: 'http://127.0.0.1:3003',
  DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
  DEMO_OTP_ALLOWLIST: '+243990000001',
  DEMO_OTP_CODE: '123456',
  GOOGLE_CLOUD_PROJECT_ID: 'zwibba-dev',
  GOOGLE_CLOUD_VISION_API_KEY: 'google-cloud-vision-api-key',
  GEMINI_API_KEY: 'gemini-api-key',
  GEMINI_MODEL: 'gemini-2.5-flash-lite',
  AI_GOOGLE_VISION_ENRICHMENT_ENABLED: 'false',
  META_GRAPH_API_VERSION: '20.0',
  META_WHATSAPP_ACCESS_TOKEN: 'meta-access-token',
  META_WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  META_WHATSAPP_TEMPLATE_LANG: 'fr',
  META_WHATSAPP_TEMPLATE_NAME: 'zwibba_auth_code',
  MISTRAL_API_KEY: 'mistral-api-key',
  MISTRAL_MODEL: 'pixtral-12b-2409',
  NODE_ENV: 'development',
  OTP_PROVIDER: 'demo',
  PORT: '3200',
  R2_ACCESS_KEY_ID: 'r2-access-key',
  R2_ACCOUNT_ID: 'r2-account-id',
  R2_BUCKET: 'zwibba-media',
  R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
  R2_S3_ENDPOINT: 'https://r2.zwibba.example',
  R2_SECRET_ACCESS_KEY: 'r2-secret-access-key',
  SUPPORT_EMAIL_API_KEY: 'support-email-api-key',
  SUPPORT_ESCALATION_EMAIL: 'hello@aivesconsulting.com',
  WHATSAPP_VERIFY_TOKEN: 'whatsapp-verify-token',
  META_APP_SECRET: 'meta-app-secret',
  ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
} as const;

function isProductionEnv(source: EnvSource) {
  return (
    (source.NODE_ENV ?? defaultEnvValues.NODE_ENV).trim() === 'production' ||
    (source.RAILWAY_ENVIRONMENT ?? '').trim() === 'production'
  );
}

function readRequiredString(source: EnvSource, key: keyof typeof defaultEnvValues) {
  const isProduction = isProductionEnv(source);
  const value = isProduction ? source[key] : (source[key] ?? defaultEnvValues[key]);

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env value: ${key}`);
  }

  return value.trim();
}

function readOptionalString(source: EnvSource, key: keyof typeof defaultEnvValues) {
  const isProduction = isProductionEnv(source);
  const value = isProduction ? source[key] : (source[key] ?? defaultEnvValues[key]);

  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function readPort(source: EnvSource) {
  const isProduction = isProductionEnv(source);
  const rawValue = isProduction ? source.PORT : (source.PORT ?? defaultEnvValues.PORT);
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  return parsedValue;
}

function readAiDraftDailyLimit(source: EnvSource) {
  const rawValue = readOptionalString(source, 'AI_DRAFT_DAILY_LIMIT');

  if (rawValue === undefined) {
    return 500;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('AI_DRAFT_DAILY_LIMIT must be a positive integer.');
  }

  return parsedValue;
}

function readOtpProvider(source: EnvSource): OtpProvider {
  const isProduction = isProductionEnv(source);
  const rawValue = isProduction
    ? source.OTP_PROVIDER
    : (source.OTP_PROVIDER ?? defaultEnvValues.OTP_PROVIDER);

  if (rawValue === 'demo' || rawValue === 'meta') {
    return rawValue;
  }

  throw new Error('OTP_PROVIDER must be either "demo" or "meta".');
}

function readAiProvider(source: EnvSource): AiProvider {
  const isProduction = isProductionEnv(source);
  const rawValue = isProduction
    ? source.AI_PROVIDER
    : (source.AI_PROVIDER ?? defaultEnvValues.AI_PROVIDER);

  if (rawValue === 'stub' || rawValue === 'multi' || rawValue === 'mistral') {
    return rawValue;
  }

  throw new Error('AI_PROVIDER must be either "stub", "mistral", or "multi".');
}

function readBooleanFlag(
  source: EnvSource,
  key: keyof typeof defaultEnvValues,
) {
  const isProduction = isProductionEnv(source);
  const rawValue = isProduction ? source[key] : (source[key] ?? defaultEnvValues[key]);

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false' || rawValue === undefined) {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false".`);
}

function readOptionalProviderConfig(
  source: EnvSource,
  {
    apiKey,
    model,
  }: {
    apiKey: keyof typeof defaultEnvValues;
    model: keyof typeof defaultEnvValues;
  },
) {
  const resolvedApiKey = readOptionalString(source, apiKey);
  const resolvedModel = readOptionalString(source, model);

  if (!resolvedApiKey && !resolvedModel) {
    return undefined;
  }

  if (!resolvedApiKey) {
    throw new Error(`Missing required env value: ${apiKey}`);
  }

  if (!resolvedModel) {
    throw new Error(`Missing required env value: ${model}`);
  }

  return {
    apiKey: resolvedApiKey,
    model: resolvedModel,
  };
}

export function loadEnv(source: EnvSource = process.env): ZwibbaEnv {
  const aiProvider = readAiProvider(source);
  const otpProvider = readOtpProvider(source);
  const googleVisionEnrichmentEnabled = readBooleanFlag(
    source,
    'AI_GOOGLE_VISION_ENRICHMENT_ENABLED',
  );

  return {
    admin: {
      sharedSecret: readRequiredString(source, 'ZWIBBA_ADMIN_SHARED_SECRET'),
    },
    boost: {
      enabled: (source.ZWIBBA_BOOST_ENABLED ?? 'true').trim() !== 'false',
    },
    ai: {
      anthropic: aiProvider === 'multi'
        ? readOptionalProviderConfig(source, {
            apiKey: 'ANTHROPIC_API_KEY',
            model: 'ANTHROPIC_MODEL',
          })
        : undefined,
      draftDailyLimit: readAiDraftDailyLimit(source),
      gemini: aiProvider === 'multi'
        ? {
            apiKey: readRequiredString(source, 'GEMINI_API_KEY'),
            model: readRequiredString(source, 'GEMINI_MODEL'),
          }
        : undefined,
      mistral: aiProvider === 'multi'
        ? readOptionalProviderConfig(source, {
            apiKey: 'MISTRAL_API_KEY',
            model: 'MISTRAL_MODEL',
          })
        : aiProvider === 'mistral'
          ? {
              apiKey: readRequiredString(source, 'MISTRAL_API_KEY'),
              model: readRequiredString(source, 'MISTRAL_MODEL'),
            }
          : undefined,
      googleVision: googleVisionEnrichmentEnabled
        ? {
            projectId: readRequiredString(source, 'GOOGLE_CLOUD_PROJECT_ID'),
            apiKey: readRequiredString(source, 'GOOGLE_CLOUD_VISION_API_KEY'),
          }
        : undefined,
      googleVisionEnrichmentEnabled,
      provider: aiProvider,
    },
    appBaseUrl: readRequiredString(source, 'APP_BASE_URL'),
    databaseUrl: readRequiredString(source, 'DATABASE_URL'),
    nodeEnv: readRequiredString(source, 'NODE_ENV'),
    otp: {
      demoAllowlist: otpProvider === 'demo'
        ? readRequiredString(source, 'DEMO_OTP_ALLOWLIST')
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        : [],
      demoCode: otpProvider === 'demo'
        ? readRequiredString(source, 'DEMO_OTP_CODE')
        : readOptionalString(source, 'DEMO_OTP_CODE'),
      provider: otpProvider,
    },
    meta: otpProvider === 'meta'
      ? {
          phoneNumberId: readRequiredString(source, 'META_WHATSAPP_PHONE_NUMBER_ID'),
          accessToken: readRequiredString(source, 'META_WHATSAPP_ACCESS_TOKEN'),
          templateName: readRequiredString(source, 'META_WHATSAPP_TEMPLATE_NAME'),
          templateLang: readRequiredString(source, 'META_WHATSAPP_TEMPLATE_LANG'),
          graphApiVersion: readRequiredString(source, 'META_GRAPH_API_VERSION'),
        }
      : undefined,
    port: readPort(source),
    r2: {
      accessKeyId: readRequiredString(source, 'R2_ACCESS_KEY_ID'),
      accountId: readRequiredString(source, 'R2_ACCOUNT_ID'),
      bucket: readRequiredString(source, 'R2_BUCKET'),
      publicBaseUrl: readRequiredString(source, 'R2_PUBLIC_BASE_URL'),
      s3Endpoint: readRequiredString(source, 'R2_S3_ENDPOINT'),
      secretAccessKey: readRequiredString(source, 'R2_SECRET_ACCESS_KEY'),
    },
    support: {
      whatsappVerifyToken: readOptionalString(source, 'WHATSAPP_VERIFY_TOKEN'),
      metaAppSecret: readOptionalString(source, 'META_APP_SECRET'),
      escalationEmail: (
        source.SUPPORT_ESCALATION_EMAIL ?? defaultEnvValues.SUPPORT_ESCALATION_EMAIL
      ).trim() || defaultEnvValues.SUPPORT_ESCALATION_EMAIL,
      emailProviderApiKey: readOptionalString(source, 'SUPPORT_EMAIL_API_KEY'),
      // Read unconditionally (unlike ai.anthropic, which is only populated
      // when AI_PROVIDER === 'multi'): the WhatsApp support agent always
      // needs Claude, regardless of which provider generates listing drafts.
      // Optional (not readRequiredString) so that booting the app — and
      // constructing the support module's SUPPORT_MODEL_CLIENT provider —
      // never fails at startup just because these are unset; the real
      // client instead throws when actually asked to generate a reply
      // without credentials, the same lazy-throw pattern SupportReplySender
      // already uses for its own (also-optional) `meta` config.
      claudeApiKey: readOptionalString(source, 'ANTHROPIC_API_KEY'),
      claudeModel: readOptionalString(source, 'ANTHROPIC_MODEL'),
    },
  };
}
