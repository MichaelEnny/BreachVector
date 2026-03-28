export function hasDatabase() {
  const value = process.env.DATABASE_URL;

  return Boolean(value && !value.includes("YOUR_"));
}

export function hasOpenAI() {
  const value = process.env.OPENAI_API_KEY;

  return Boolean(value && !value.includes("YOUR_"));
}

export function hasClerkAuth() {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secret = process.env.CLERK_SECRET_KEY;

  return Boolean(
    publishable &&
      !publishable.includes("YOUR_") &&
      secret &&
      !secret.includes("YOUR_")
  );
}

export function getWorkerSecret() {
  const configured = process.env.JOB_WORKER_SECRET || process.env.CRON_SECRET || null;

  if (!configured || configured.includes("YOUR_")) {
    return null;
  }

  return configured;
}

export function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export function getAppCapabilities() {
  return {
    database: hasDatabase(),
    openai: hasOpenAI(),
    auth: hasClerkAuth(),
    workerSecret: Boolean(getWorkerSecret()),
    openAiModel: process.env.OPENAI_MODEL || "gpt-5-mini"
  };
}
