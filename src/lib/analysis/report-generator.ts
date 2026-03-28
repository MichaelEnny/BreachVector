import { getAppCapabilities } from "@/lib/env";
import type { FindingRecord, ReportRecord, SignalSnapshot } from "@/lib/types";
import {
  buildFallbackExecutiveSummary,
  buildFallbackPlainEnglish,
  buildFallbackRemediationPlan,
  buildFallbackTechnicalNarrative
} from "@/lib/analysis/scoring";
import { getErrorMessage } from "@/lib/utils";

interface OpenAIReportShape {
  executiveSummary: string;
  technicalNarrative: string;
  remediationPlan: Array<{
    priority: "Immediate" | "Next sprint" | "Backlog";
    title: string;
    detail: string;
  }>;
  plainEnglish: Array<{
    term: string;
    explanation: string;
  }>;
}

async function createOpenAIReport(input: {
  hostname: string;
  overallScore: number;
  signalSnapshot: SignalSnapshot;
  findings: FindingRecord[];
}): Promise<OpenAIReportShape> {
  const capabilities = getAppCapabilities();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: capabilities.openAiModel,
      instructions:
        "You are BreachVector, an AI website security review assistant. Use only the supplied passive observations. Do not claim vulnerabilities or active exploitation. Write concise, executive-friendly content with credible technical language.",
      input: `Create a website security review report from the following JSON:\n${JSON.stringify(input)}`,
      text: {
        format: {
          type: "json_schema",
          name: "breachvector_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["executiveSummary", "technicalNarrative", "remediationPlan", "plainEnglish"],
            properties: {
              executiveSummary: {
                type: "string"
              },
              technicalNarrative: {
                type: "string"
              },
              remediationPlan: {
                type: "array",
                minItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["priority", "title", "detail"],
                  properties: {
                    priority: {
                      type: "string",
                      enum: ["Immediate", "Next sprint", "Backlog"]
                    },
                    title: {
                      type: "string"
                    },
                    detail: {
                      type: "string"
                    }
                  }
                }
              },
              plainEnglish: {
                type: "array",
                minItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["term", "explanation"],
                  properties: {
                    term: {
                      type: "string"
                    },
                    explanation: {
                      type: "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: string };

  if (!payload.output_text) {
    throw new Error("OpenAI response did not include output_text.");
  }

  return JSON.parse(payload.output_text) as OpenAIReportShape;
}

export async function generateReport(input: {
  hostname: string;
  overallScore: number;
  signalSnapshot: SignalSnapshot;
  findings: FindingRecord[];
}): Promise<{ executiveSummary: string; report: ReportRecord }> {
  const fallback = {
    executiveSummary: buildFallbackExecutiveSummary(input.overallScore, input.findings),
    report: {
      technicalNarrative: buildFallbackTechnicalNarrative(input.signalSnapshot, input.findings),
      remediationPlan: buildFallbackRemediationPlan(input.findings),
      plainEnglish: buildFallbackPlainEnglish(input.signalSnapshot),
      generatedByAi: false
    } satisfies ReportRecord
  };

  if (!getAppCapabilities().openai) {
    return fallback;
  }

  try {
    const generated = await createOpenAIReport(input);

    return {
      executiveSummary: generated.executiveSummary,
      report: {
        technicalNarrative: generated.technicalNarrative,
        remediationPlan: generated.remediationPlan,
        plainEnglish: generated.plainEnglish,
        generatedByAi: true
      }
    };
  } catch (error) {
    console.error("Falling back to template report:", getErrorMessage(error));
    return fallback;
  }
}
