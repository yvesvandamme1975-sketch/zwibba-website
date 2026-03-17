type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

export type ZwibbaEnv = {
  appBaseUrl: string;
  databaseUrl: string;
  nodeEnv: string;
  port: number;
  r2: {
    accessKeyId: string;
    accountId: string;
    bucket: string;
    publicBaseUrl: string;
    s3Endpoint: string;
    secretAccessKey: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    verifyServiceSid: string;
  };
};

const defaultEnvValues = {
  APP_BASE_URL: 'http://127.0.0.1:3003',
  DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
  NODE_ENV: 'development',
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
} as const;

function readRequiredString(source: EnvSource, key: keyof typeof defaultEnvValues) {
  const isProduction = source.NODE_ENV?.trim() === 'production';
  const value = isProduction ? source[key] : (source[key] ?? defaultEnvValues[key]);

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env value: ${key}`);
  }

  return value.trim();
}

function readPort(source: EnvSource) {
  const isProduction = source.NODE_ENV?.trim() === 'production';
  const rawValue = isProduction ? source.PORT : (source.PORT ?? defaultEnvValues.PORT);
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  return parsedValue;
}

export function loadEnv(source: EnvSource = process.env): ZwibbaEnv {
  return {
    appBaseUrl: readRequiredString(source, 'APP_BASE_URL'),
    databaseUrl: readRequiredString(source, 'DATABASE_URL'),
    nodeEnv: readRequiredString(source, 'NODE_ENV'),
    port: readPort(source),
    r2: {
      accessKeyId: readRequiredString(source, 'R2_ACCESS_KEY_ID'),
      accountId: readRequiredString(source, 'R2_ACCOUNT_ID'),
      bucket: readRequiredString(source, 'R2_BUCKET'),
      publicBaseUrl: readRequiredString(source, 'R2_PUBLIC_BASE_URL'),
      s3Endpoint: readRequiredString(source, 'R2_S3_ENDPOINT'),
      secretAccessKey: readRequiredString(source, 'R2_SECRET_ACCESS_KEY'),
    },
    twilio: {
      accountSid: readRequiredString(source, 'TWILIO_ACCOUNT_SID'),
      authToken: readRequiredString(source, 'TWILIO_AUTH_TOKEN'),
      verifyServiceSid: readRequiredString(source, 'TWILIO_VERIFY_SERVICE_SID'),
    },
  };
}
