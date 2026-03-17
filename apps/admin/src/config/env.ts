type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

export type ZwibbaAdminEnv = {
  apiBaseUrl: string;
  port: number;
  sharedSecret: string;
};

const defaultEnvValues = {
  PORT: '3300',
  ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
  ZWIBBA_API_BASE_URL: 'http://127.0.0.1:3200',
} as const;

function readRequiredString(
  source: EnvSource,
  key: keyof typeof defaultEnvValues,
) {
  const value = source[key] ?? defaultEnvValues[key];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required admin env value: ${key}`);
  }

  return value.trim();
}

function readPort(source: EnvSource) {
  const rawValue = source.PORT ?? defaultEnvValues.PORT;
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('Admin PORT must be a positive integer.');
  }

  return parsedValue;
}

export function loadAdminEnv(source: EnvSource = process.env): ZwibbaAdminEnv {
  return {
    apiBaseUrl: readRequiredString(source, 'ZWIBBA_API_BASE_URL'),
    port: readPort(source),
    sharedSecret: readRequiredString(source, 'ZWIBBA_ADMIN_SHARED_SECRET'),
  };
}
