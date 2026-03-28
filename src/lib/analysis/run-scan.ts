import { runPassiveChecks } from "@/lib/analysis/passive-checks";
import { generateReport } from "@/lib/analysis/report-generator";
import { deriveFindings } from "@/lib/analysis/scoring";
import { createStoredScan } from "@/lib/data/scans";
import { normalizeTarget, type NormalizedTarget } from "@/lib/domain";
import type { FindingRecord, ReportRecord, SignalSnapshot } from "@/lib/types";

const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;
const globalForAnalysisCache = globalThis as typeof globalThis & {
  breachVectorAnalysisCache?: Map<
    string,
    {
      signalSnapshot: SignalSnapshot;
      findings: FindingRecord[];
      overallScore: number;
      executiveSummary: string;
      report: ReportRecord;
      createdAt: number;
    }
  >;
};

const analysisCache = globalForAnalysisCache.breachVectorAnalysisCache ?? new Map();

if (!globalForAnalysisCache.breachVectorAnalysisCache) {
  globalForAnalysisCache.breachVectorAnalysisCache = analysisCache;
}

async function getAnalysisBundle(normalized: NormalizedTarget, onProgress?: (label: string) => Promise<void> | void) {
  const cacheKey = normalized.normalizedUrl.toLowerCase();
  const existing = analysisCache.get(cacheKey);

  if (existing && Date.now() - existing.createdAt < ANALYSIS_CACHE_TTL_MS) {
    await onProgress?.("Reusing cached passive analysis");
    return existing;
  }

  await onProgress?.("Collecting passive signals");
  const signalSnapshot = await runPassiveChecks(normalized);
  await onProgress?.("Scoring findings");
  const { findings, overallScore } = deriveFindings(signalSnapshot);
  await onProgress?.("Generating narrative report");
  const reportResult = await generateReport({
    hostname: normalized.hostname,
    overallScore,
    signalSnapshot,
    findings
  });

  const bundle = {
    signalSnapshot,
    findings,
    overallScore,
    executiveSummary: reportResult.executiveSummary,
    report: reportResult.report,
    createdAt: Date.now()
  };

  analysisCache.set(cacheKey, bundle);
  return bundle;
}

export async function runWebsiteSecurityReview(
  rawTarget: string,
  ownerUserId: string,
  organizationId: string,
  options?: {
    onProgress?: (label: string) => Promise<void> | void;
  }
) {
  const normalized = normalizeTarget(rawTarget);
  const bundle = await getAnalysisBundle(normalized, options?.onProgress);

  await options?.onProgress?.("Saving report to workspace history");
  return createStoredScan({
    ownerUserId,
    organizationId,
    targetInput: normalized.targetInput,
    normalizedUrl: bundle.signalSnapshot.normalizedUrl,
    hostname: bundle.signalSnapshot.hostname,
    overallScore: bundle.overallScore,
    executiveSummary: bundle.executiveSummary,
    signalSnapshot: bundle.signalSnapshot,
    findings: bundle.findings,
    report: bundle.report
  });
}
