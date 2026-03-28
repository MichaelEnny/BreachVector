import type { FindingRecord, RemediationStep, SignalSnapshot } from "@/lib/types";
import { clamp } from "@/lib/utils";

const severityWeight = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
} as const;

export function deriveFindings(signalSnapshot: SignalSnapshot) {
  const findings: FindingRecord[] = [];
  let penalty = 0;

  if (!signalSnapshot.httpsReachable) {
    findings.push({
      title: "HTTPS is not reachable",
      severity: "CRITICAL",
      category: "Transport security",
      summary:
        "The site did not present a reachable HTTPS endpoint during the passive check, which is a major trust and confidentiality issue for visitors.",
      evidence: "HTTPS connection could not be established from the public-facing check.",
      recommendation:
        "Provision a valid TLS certificate and serve the site over HTTPS before directing user traffic to it.",
      displayOrder: 0
    });
    penalty += 30;
  }

  if (signalSnapshot.httpsReachable && !signalSnapshot.httpRedirectToHttps) {
    findings.push({
      title: "HTTP does not redirect cleanly to HTTPS",
      severity: "HIGH",
      category: "Transport security",
      summary:
        "The HTTP endpoint did not visibly issue an HTTPS redirect, so users can still start on a weaker path.",
      evidence: `HTTP status: ${signalSnapshot.httpStatus ?? "unknown"}; Location: no HTTPS redirect observed.`,
      recommendation:
        "Add a permanent 301 or 308 redirect from HTTP to HTTPS across the full domain surface.",
      displayOrder: 0
    });
    penalty += 12;
  }

  if (signalSnapshot.tls.expired) {
    findings.push({
      title: "TLS certificate appears expired",
      severity: "HIGH",
      category: "Certificate management",
      summary:
        "The detected certificate date appears to be in the past, which can trigger browser errors and loss of trust.",
      evidence: `Certificate valid-to date: ${signalSnapshot.tls.validTo ?? "unknown"}.`,
      recommendation:
        "Renew the certificate immediately and verify automated renewal is functioning correctly.",
      displayOrder: 0
    });
    penalty += 20;
  } else if ((signalSnapshot.tls.daysRemaining ?? 999) < 30) {
    findings.push({
      title: "TLS certificate renewal window is tight",
      severity: "MEDIUM",
      category: "Certificate management",
      summary:
        "The current certificate appears to expire soon, which increases the risk of an avoidable availability or trust incident.",
      evidence: `Estimated certificate lifetime remaining: ${signalSnapshot.tls.daysRemaining} days.`,
      recommendation:
        "Confirm auto-renewal or rotate the certificate before the remaining lifetime becomes critical.",
      displayOrder: 0
    });
    penalty += 8;
  }

  const headerRules: Array<{
    key: keyof SignalSnapshot["headers"];
    title: string;
    severity: FindingRecord["severity"];
    penalty: number;
    summary: string;
    recommendation: string;
  }> = [
    {
      key: "content-security-policy",
      title: "Content Security Policy is missing",
      severity: "MEDIUM",
      penalty: 10,
      summary:
        "Without a Content-Security-Policy header, browsers have fewer restrictions on which scripts and frames can execute on the page.",
      recommendation:
        "Add a baseline Content-Security-Policy and refine it over time with explicit source allowlists."
    },
    {
      key: "strict-transport-security",
      title: "HSTS header is missing",
      severity: "MEDIUM",
      penalty: 10,
      summary:
        "Browsers are not being instructed to prefer HTTPS automatically after the first secure visit.",
      recommendation:
        "Add a Strict-Transport-Security header once HTTPS redirect behavior is validated."
    },
    {
      key: "x-frame-options",
      title: "Frame embedding protection is absent",
      severity: "LOW",
      penalty: 6,
      summary:
        "The response does not publish an X-Frame-Options header, leaving clickjacking protections less explicit.",
      recommendation:
        "Add X-Frame-Options: DENY or SAMEORIGIN unless deliberate framing is required."
    },
    {
      key: "x-content-type-options",
      title: "MIME sniffing protection is absent",
      severity: "LOW",
      penalty: 6,
      summary:
        "X-Content-Type-Options was not visible, so browsers may rely more heavily on content sniffing behavior.",
      recommendation:
        "Add X-Content-Type-Options: nosniff to reduce content-type ambiguity."
    },
    {
      key: "referrer-policy",
      title: "Referrer policy is not explicitly defined",
      severity: "LOW",
      penalty: 4,
      summary:
        "No Referrer-Policy header was visible, so browser defaults may disclose more URL context than intended.",
      recommendation:
        "Add a Referrer-Policy such as strict-origin-when-cross-origin."
    }
  ];

  for (const rule of headerRules) {
    if (!signalSnapshot.headers[rule.key]) {
      findings.push({
        title: rule.title,
        severity: rule.severity,
        category: "Browser hardening",
        summary: rule.summary,
        evidence: `No ${rule.key} header was visible in the HTTPS response.`,
        recommendation: rule.recommendation,
        displayOrder: 0
      });
      penalty += rule.penalty;
    }
  }

  if (signalSnapshot.cookieSnapshot.insecureCookies.length > 0) {
    findings.push({
      title: "Visible cookies are missing one or more security flags",
      severity: "MEDIUM",
      category: "Session security",
      summary:
        "At least one visible cookie lacks Secure, HttpOnly, or SameSite protections, which weakens baseline session hygiene.",
      evidence: `Cookies needing review: ${signalSnapshot.cookieSnapshot.insecureCookies.join(", ")}.`,
      recommendation:
        "Review visible cookies and apply Secure, HttpOnly, and SameSite where the application flow permits.",
      displayOrder: 0
    });
    penalty += 9;
  }

  if (signalSnapshot.discovery.securityTxt.status === 404 || !signalSnapshot.discovery.securityTxt.reachable) {
    findings.push({
      title: "security.txt contact file is missing",
      severity: "LOW",
      category: "Security coordination",
      summary:
        "A public security.txt file was not detected, which makes it harder for researchers or partners to find the right reporting path.",
      evidence: "No reachable security.txt file was found at /.well-known/security.txt or /security.txt.",
      recommendation:
        "Publish a security.txt file with contact and disclosure guidance to make external reporting clearer.",
      displayOrder: 0
    });
    penalty += 3;
  }

  if (signalSnapshot.dnsAuth.spf === false) {
    findings.push({
      title: "No SPF record was detected",
      severity: "LOW",
      category: "Email authentication",
      summary:
        "A visible SPF record was not found for the analyzed hostname, which can make email spoofing controls less explicit.",
      evidence: "No TXT record beginning with v=spf1 was found.",
      recommendation:
        "Publish an SPF policy for the sending domain if this hostname participates in email delivery.",
      displayOrder: 0
    });
    penalty += 4;
  }

  if (signalSnapshot.dnsAuth.dmarc === false) {
    findings.push({
      title: "No DMARC policy was detected",
      severity: "LOW",
      category: "Email authentication",
      summary:
        "A DMARC policy was not visible for the analyzed hostname, reducing reporting and enforcement clarity for email spoofing defenses.",
      evidence: "No TXT record beginning with v=DMARC1 was found at the _dmarc subdomain.",
      recommendation:
        "Publish a DMARC record with reporting enabled and strengthen enforcement over time.",
      displayOrder: 0
    });
    penalty += 4;
  }

  if (signalSnapshot.dnsAuth.mtaSts === false) {
    findings.push({
      title: "MTA-STS policy was not detected",
      severity: "LOW",
      category: "Email transport security",
      summary:
        "No visible MTA-STS TXT record was found, so the domain does not advertise stronger SMTP TLS expectations to supporting mail systems.",
      evidence: "No TXT record beginning with v=STSv1 was found at the _mta-sts subdomain.",
      recommendation:
        "If the domain sends or receives email, publish an MTA-STS policy and monitor rollout with mail telemetry.",
      displayOrder: 0
    });
    penalty += 3;
  }

  if (signalSnapshot.dnsAuth.caaPresent === false) {
    findings.push({
      title: "CAA records were not detected",
      severity: "LOW",
      category: "Certificate governance",
      summary:
        "Certificate Authority Authorization records were not visible, which means certificate issuance is not explicitly constrained at the DNS layer.",
      evidence: "No CAA records were returned for the analyzed hostname.",
      recommendation:
        "Consider publishing CAA records to narrow which certificate authorities are authorized for this domain.",
      displayOrder: 0
    });
    penalty += 2;
  }

  if (signalSnapshot.discovery.robotsTxt.reachable === false) {
    findings.push({
      title: "robots.txt was not detected",
      severity: "INFO",
      category: "Operational hygiene",
      summary:
        "A robots.txt file was not visible. This is not a security control by itself, but it is often part of a more complete public-facing operations posture.",
      evidence: "No reachable robots.txt file was found at the site root.",
      recommendation:
        "Publish a simple robots.txt file if you want a clearer crawl and indexing posture for external observers.",
      displayOrder: 0
    });
  }

  if (findings.length === 0) {
    findings.push({
      title: "Baseline public-facing controls look healthy",
      severity: "INFO",
      category: "Overall posture",
      summary:
        "The passive review did not find a major gap in the analyzed surface, which is a strong starting point for an external security posture story.",
      evidence: "HTTPS, redirects, common headers, and cookie flags all presented cleanly during the passive check.",
      recommendation:
        "Keep these controls under automated regression checks and review them when infrastructure changes.",
      displayOrder: 0
    });
  }

  const sorted = findings
    .sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity])
    .map((finding, index) => ({
      ...finding,
      displayOrder: index
    }));

  return {
    findings: sorted,
    overallScore: clamp(100 - penalty, 0, 100)
  };
}

export function buildFallbackExecutiveSummary(score: number, findings: FindingRecord[]) {
  const topFinding = findings[0];

  if (score >= 85) {
    return "The site shows a strong public-facing security baseline with only a small number of hardening opportunities remaining.";
  }

  if (score >= 70) {
    return `The site has a credible security foundation, but ${topFinding?.title.toLowerCase() ?? "a few visible control gaps"} should be addressed to make the posture feel consistently mature.`;
  }

  if (score >= 50) {
    return `The site is usable for a demo or early-stage launch, but visible hardening gaps such as ${topFinding?.title.toLowerCase() ?? "transport and header controls"} make the security story feel incomplete.`;
  }

  return `The site shows several foundational gaps, led by ${topFinding?.title.toLowerCase() ?? "missing baseline controls"}, and would benefit from immediate transport and browser-hardening work.`;
}

export function buildFallbackTechnicalNarrative(
  signalSnapshot: SignalSnapshot,
  findings: FindingRecord[]
) {
  const headerCoverage = Object.values(signalSnapshot.headers).filter(Boolean).length;

  return `Passive checks completed against ${signalSnapshot.hostname}. HTTPS ${
    signalSnapshot.httpsReachable ? "was reachable" : "was not reachable"
  }, HTTP ${signalSnapshot.httpRedirectToHttps ? "redirected to HTTPS" : "did not show an HTTPS redirect"}, and ${headerCoverage}/5 common security headers were visible. security.txt ${
    signalSnapshot.discovery.securityTxt.reachable ? "was published" : "was not detected"
  }, while DNS posture checks ${
    signalSnapshot.dnsAuth.caaPresent ? "included visible CAA controls" : "did not surface CAA governance records"
  }. ${findings[0]?.summary ?? "No major finding was produced."}`;
}

export function buildFallbackRemediationPlan(findings: FindingRecord[]): RemediationStep[] {
  return findings.slice(0, 4).map((finding, index) => ({
    priority: index === 0 ? "Immediate" : index === 1 ? "Next sprint" : "Backlog",
    title: finding.title,
    detail: finding.recommendation
  }));
}

export function buildFallbackPlainEnglish(signalSnapshot: SignalSnapshot) {
  const explanations = [
    {
      term: "HTTPS",
      explanation:
        "HTTPS encrypts the connection between a visitor and your site so traffic is harder to read or tamper with on the network."
    },
    {
      term: "Security headers",
      explanation:
        "Security headers are browser instructions that reduce risk from framing, content sniffing, and overly broad resource loading."
    }
  ];

  if (signalSnapshot.cookieSnapshot.totalVisible > 0) {
    explanations.push({
      term: "Cookie flags",
      explanation:
        "Cookie flags such as Secure, HttpOnly, and SameSite help keep session cookies away from weaker transport paths and some browser-based attacks."
    });
  }

  if (!signalSnapshot.discovery.securityTxt.reachable) {
    explanations.push({
      term: "security.txt",
      explanation:
        "security.txt is a small file that tells researchers or partners how to report a security issue responsibly."
    });
  }

  return explanations;
}
