type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;
type OtpProvider = 'demo' | 'twilio';
type AiProvider = 'stub' | 'multi' | 'mistral';

export type ZwibbaEnv = {
  admin: {
    sharedSecret: string;
  };
  ai: {
    anthropic?: {
      apiKey: string;
      model: string;
    };
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
  port: number;
  r2: {
    accessKeyId: string;
    accountId: string;
    bucket: string;
    publicBaseUrl: string;
    s3Endpoint: string;
    secretAccessKey: string;
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    verifyServiceSid: string;
  };
};

const defaultEnvValues = {
  AI_PROVIDER: 'stub',
  ANTHROPIC_API_KEY: 'anthropic-api-key',
  ANTHROPIC_MODEL: 'claude-3-5-haiku-latest',
  APP_BASE_URL: 'http://127.0.0.1:3003',
  DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
  DEMO_OTP_ALLOWLIST: '+243990000001',
  DEMO_OTP_CODE: '123456',
  GOOGLE_CLOUD_PROJECT_ID: 'zwibba-dev',
  GOOGLE_CLOUD_VISION_API_KEY: 'google-cloud-vision-api-key',
  GEMINI_API_KEY: 'gemini-api-key',
  GEMINI_MODEL: 'gemini-2.5-flash-lite',
  AI_GOOGLE_VISION_ENRICHMENT_ENABLED: 'false',
  MISTRAL_API_KEY: 'mistral-api-key',
  MISTRAL_MODEL: 'pixtral-12b-2409',
  NODE_ENV: 'development',
  OTP_PROVIDER: 'twilio',
  PORT: '3200',
  R2_ACCESS_KEY_ID: 'r2-access-key',
  R2_ACCOUNT_ID: 'r2-account-id',
  R2_BUCKET: 'zwibba-media',
  R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
  R2_S3_ENDPOINT: 'https://r2.zwibba.example',
  R2_SECRET_ACCESS_KEY: 'r2-secret-access-key',
  TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
  TWILIO_AUTH_TOKEN: 'twilio-auth-token',
  TWILIO_VERIFY_SERVICE_SID: 'VA00000000000000000000000000000000',
  ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
} as const;

function isProductionEnv(source: EnvSource) {
  return (source.NODE_ENV ?? defaultEnvValues.NODE_ENV).trim() === 'production';
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

function readOtpProvider(source: EnvSource): OtpProvider {
  const isProduction = isProductionEnv(source);
  const rawValue = isProduction
    ? source.OTP_PROVIDER
    : (source.OTP_PROVIDER ?? defaultEnvValues.OTP_PROVIDER);

  if (rawValue === 'demo' || rawValue === 'twilio') {
    return rawValue;
  }

  throw new Error('OTP_PROVIDER must be either "demo" or "twilio".');
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
    ai: {
      anthropic: aiProvider === 'multi'
        ? readOptionalProviderConfig(source, {
            apiKey: 'ANTHROPIC_API_KEY',
            model: 'ANTHROPIC_MODEL',
          })
        : undefined,
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
    port: readPort(source),
    r2: {
      accessKeyId: readRequiredString(source, 'R2_ACCESS_KEY_ID'),
      accountId: readRequiredString(source, 'R2_ACCOUNT_ID'),
      bucket: readRequiredString(source, 'R2_BUCKET'),
      publicBaseUrl: readRequiredString(source, 'R2_PUBLIC_BASE_URL'),
      s3Endpoint: readRequiredString(source, 'R2_S3_ENDPOINT'),
      secretAccessKey: readRequiredString(source, 'R2_SECRET_ACCESS_KEY'),
    },
    twilio: otpProvider === 'twilio'
      ? {
          accountSid: readRequiredString(source, 'TWILIO_ACCOUNT_SID'),
          authToken: readRequiredString(source, 'TWILIO_AUTH_TOKEN'),
          verifyServiceSid: readRequiredString(source, 'TWILIO_VERIFY_SERVICE_SID'),
        }
      : undefined,
  };
}
