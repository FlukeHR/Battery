export const APP_CONFIG = {
  apiBaseUrl: "https://battest.ccwu.cc",
  predictionPath: "/api/predict",
  webBaseUrl: "https://battest.ccwu.cc",
  requestTimeoutMs: 10_000,
} as const;

export const PREDICTION_ENDPOINT =
  `${APP_CONFIG.apiBaseUrl}${APP_CONFIG.predictionPath}`;
