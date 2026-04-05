import { runSellerFlow } from './internal-beta-seller-flow.mjs';

const devices = ['desktop', 'iphone', 'android'];

export async function runDeviceMatrix() {
  const results = [];

  for (const deviceName of devices) {
    const result = await runSellerFlow({
      deviceName,
      stopAt: 'capture-result',
      titlePrefix: `Zwibba ${deviceName}`,
    });
    results.push(result);
  }

  return results;
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  runDeviceMatrix()
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exitCode = 1;
    });
}
