import { Prisma, PrismaClient } from "@prisma/client";

import { demoScans } from "../src/lib/demo-data";

const prisma = new PrismaClient();

function asJsonValue<T>(value: T) {
  return value as unknown as Prisma.InputJsonValue;
}

async function main() {
  for (const scan of demoScans) {
    await prisma.finding.deleteMany({
      where: {
        scanId: scan.id
      }
    });

    await prisma.report.deleteMany({
      where: {
        scanId: scan.id
      }
    });

    await prisma.scan.upsert({
      where: {
        id: scan.id
      },
      update: {
        ownerUserId: null,
        targetInput: scan.targetInput,
        normalizedUrl: scan.normalizedUrl,
        hostname: scan.hostname,
        origin: scan.origin,
        status: scan.status,
        overallScore: scan.overallScore,
        executiveSummary: scan.executiveSummary,
        signalSnapshot: asJsonValue(scan.signalSnapshot),
        errorMessage: scan.errorMessage,
        createdAt: new Date(scan.createdAt),
        completedAt: scan.completedAt ? new Date(scan.completedAt) : null
      },
      create: {
        id: scan.id,
        ownerUserId: null,
        targetInput: scan.targetInput,
        normalizedUrl: scan.normalizedUrl,
        hostname: scan.hostname,
        origin: scan.origin,
        status: scan.status,
        overallScore: scan.overallScore,
        executiveSummary: scan.executiveSummary,
        signalSnapshot: asJsonValue(scan.signalSnapshot),
        errorMessage: scan.errorMessage,
        createdAt: new Date(scan.createdAt),
        completedAt: scan.completedAt ? new Date(scan.completedAt) : null
      }
    });

    await prisma.finding.createMany({
      data: scan.findings.map((finding) => ({
        scanId: scan.id,
        title: finding.title,
        severity: finding.severity,
        category: finding.category,
        summary: finding.summary,
        evidence: finding.evidence ?? null,
        recommendation: finding.recommendation,
        displayOrder: finding.displayOrder
      }))
    });

    await prisma.report.create({
      data: {
        scanId: scan.id,
        technicalNarrative: scan.report.technicalNarrative,
        remediationPlan: asJsonValue(scan.report.remediationPlan),
        plainEnglish: asJsonValue(scan.report.plainEnglish),
        generatedByAi: scan.report.generatedByAi
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
