import type { StoredScan } from "@/lib/types";

const now = new Date("2026-03-27T17:00:00.000Z");

export const demoScans: StoredScan[] = [
  {
    id: "demo-northstar-finance",
    ownerUserId: null,
    organizationId: null,
    workspace: null,
    targetInput: "northstar-finance.demo",
    normalizedUrl: "https://northstar-finance.demo",
    hostname: "northstar-finance.demo",
    origin: "DEMO",
    status: "COMPLETED",
    overallScore: 88,
    executiveSummary:
      "Northstar Finance presents a mature external security baseline with HTTPS, redirect enforcement, and most critical hardening controls in place. The largest gap is the absence of a content security policy, which leaves browser-side protections weaker than the rest of the stack.",
    signalSnapshot: {
      normalizedUrl: "https://northstar-finance.demo",
      hostname: "northstar-finance.demo",
      httpsReachable: true,
      httpRedirectToHttps: true,
      httpStatus: 301,
      httpsStatus: 200,
      headers: {
        "content-security-policy": null,
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin"
      },
      cookieSnapshot: {
        totalVisible: 2,
        secureCount: 2,
        httpOnlyCount: 2,
        sameSiteCount: 2,
        insecureCookies: [],
        sampleCookies: ["sessionid", "csrftoken"]
      },
      tls: {
        reachable: true,
        validTo: "2026-11-14T12:00:00.000Z",
        daysRemaining: 232,
        expired: false,
        error: null
      },
      dnsAuth: {
        spf: true,
        dmarc: true,
        spfRecord: "v=spf1 include:_spf.google.com ~all",
        dmarcRecord: "v=DMARC1; p=quarantine; rua=mailto:dmarc@northstar-finance.demo",
        mtaSts: true,
        mtaStsRecord: "v=STSv1; id=20260301",
        caaPresent: true,
        caaRecords: ["issue letsencrypt.org", "iodef mailto:security@northstar-finance.demo"]
      },
      discovery: {
        robotsTxt: {
          reachable: true,
          status: 200,
          location: "https://northstar-finance.demo/robots.txt"
        },
        securityTxt: {
          reachable: true,
          status: 200,
          location: "https://northstar-finance.demo/.well-known/security.txt",
          canonicalUrl: "https://northstar-finance.demo/.well-known/security.txt",
          contactLines: ["mailto:security@northstar-finance.demo"],
          expires: "2026-12-31T00:00:00.000Z",
          source: "well-known"
        }
      },
      responseNotes: ["Demo sample seeded for showcase mode."]
    },
    errorMessage: null,
    createdAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
    completedAt: new Date(now.getTime() - 1000 * 60 * 89).toISOString(),
    findings: [
      {
        title: "Content Security Policy is missing",
        severity: "MEDIUM",
        category: "Browser hardening",
        summary:
          "The site does not publish a Content-Security-Policy header, so browsers have fewer constraints on where scripts, frames, and other resources can load from.",
        evidence: "No Content-Security-Policy header was visible in the HTTPS response.",
        recommendation:
          "Add a baseline Content-Security-Policy and tighten it over time, starting with default-src 'self' and explicit script/frame allowlists.",
        displayOrder: 0
      },
      {
        title: "Cookie posture is strong",
        severity: "INFO",
        category: "Session security",
        summary:
          "Visible cookies include Secure, HttpOnly, and SameSite flags, which reduces exposure to common session handling mistakes.",
        evidence: "2 visible cookies were marked Secure, HttpOnly, and SameSite.",
        recommendation:
          "Keep these flags enforced across new session and preference cookies.",
        displayOrder: 1
      }
    ],
    report: {
      technicalNarrative:
        "Transport security is well configured: HTTPS is reachable, HTTP redirects to HTTPS, and TLS validity looks healthy. The site would benefit most from client-side browser hardening via a Content-Security-Policy, while its current header, discovery, and DNS posture already cover several common baselines.",
      remediationPlan: [
        {
          priority: "Immediate",
          title: "Introduce a baseline CSP",
          detail:
            "Start with a conservative policy, test in report-only mode if needed, then enforce once third-party resources are explicitly allowlisted."
        },
        {
          priority: "Next sprint",
          title: "Tune CSP for third-party tools",
          detail:
            "Audit analytics, payment, and support widgets so the policy stays specific and maintainable."
        }
      ],
      plainEnglish: [
        {
          term: "HTTPS",
          explanation:
            "HTTPS encrypts the connection between a visitor and your site so traffic cannot be read or altered in transit as easily."
        },
        {
          term: "Content Security Policy",
          explanation:
            "A content security policy tells the browser which scripts, frames, and external resources are allowed to run on the page."
        }
      ],
      generatedByAi: false
    }
  },
  {
    id: "demo-civic-portal",
    ownerUserId: null,
    organizationId: null,
    workspace: null,
    targetInput: "civic-portal.demo",
    normalizedUrl: "https://civic-portal.demo",
    hostname: "civic-portal.demo",
    origin: "DEMO",
    status: "COMPLETED",
    overallScore: 54,
    executiveSummary:
      "Civic Portal is publicly reachable over HTTPS, but several foundational controls are absent or inconsistent. The site would benefit from transport hardening, stronger browser headers, and clearer cookie protections before it would present as security-mature to a stakeholder or procurement team.",
    signalSnapshot: {
      normalizedUrl: "https://civic-portal.demo",
      hostname: "civic-portal.demo",
      httpsReachable: true,
      httpRedirectToHttps: false,
      httpStatus: 200,
      httpsStatus: 200,
      headers: {
        "content-security-policy": null,
        "strict-transport-security": null,
        "x-frame-options": "SAMEORIGIN",
        "x-content-type-options": null,
        "referrer-policy": null
      },
      cookieSnapshot: {
        totalVisible: 3,
        secureCount: 1,
        httpOnlyCount: 1,
        sameSiteCount: 0,
        insecureCookies: ["visitor_id", "theme"],
        sampleCookies: ["visitor_id", "theme", "session"]
      },
      tls: {
        reachable: true,
        validTo: "2026-04-10T12:00:00.000Z",
        daysRemaining: 14,
        expired: false,
        error: null
      },
      dnsAuth: {
        spf: true,
        dmarc: false,
        spfRecord: "v=spf1 include:mailgun.org ~all",
        dmarcRecord: null,
        mtaSts: false,
        mtaStsRecord: null,
        caaPresent: false,
        caaRecords: []
      },
      discovery: {
        robotsTxt: {
          reachable: false,
          status: 404,
          location: null
        },
        securityTxt: {
          reachable: false,
          status: 404,
          location: null,
          canonicalUrl: null,
          contactLines: [],
          expires: null,
          source: null
        }
      },
      responseNotes: ["Demo sample seeded for showcase mode."]
    },
    errorMessage: null,
    createdAt: new Date(now.getTime() - 1000 * 60 * 340).toISOString(),
    completedAt: new Date(now.getTime() - 1000 * 60 * 338).toISOString(),
    findings: [
      {
        title: "HTTP does not force users onto HTTPS",
        severity: "HIGH",
        category: "Transport security",
        summary:
          "The HTTP endpoint answered directly instead of redirecting to HTTPS, leaving room for users and old links to hit a weaker channel first.",
        evidence: "HTTP responded with status 200 and no redirect to an HTTPS location.",
        recommendation: "Configure a site-wide 301 or 308 redirect from HTTP to HTTPS.",
        displayOrder: 0
      },
      {
        title: "HSTS is not enabled",
        severity: "MEDIUM",
        category: "Transport security",
        summary:
          "Strict-Transport-Security was not visible, so browsers are not instructed to keep using HTTPS after the first secure visit.",
        evidence: "No Strict-Transport-Security header was visible in the HTTPS response.",
        recommendation:
          "Add a Strict-Transport-Security header with a meaningful max-age once HTTPS redirection is stable.",
        displayOrder: 1
      },
      {
        title: "Visible cookies are missing security flags",
        severity: "MEDIUM",
        category: "Session security",
        summary:
          "Two visible cookies did not include the full set of expected Secure, HttpOnly, or SameSite protections.",
        evidence: "Cookies lacking full protection: visitor_id, theme.",
        recommendation:
          "Mark session-related cookies Secure, HttpOnly, and SameSite=Lax or Strict where possible.",
        displayOrder: 2
      }
    ],
    report: {
      technicalNarrative:
        "This surface is good enough for a live demo but not for a confident security posture story. HTTPS exists, yet transport controls are incomplete because HTTP remains open, HSTS is absent, certificate renewal should be monitored closely due to the short remaining lifetime, and the domain lacks basic disclosure and DNS governance signals such as security.txt and CAA.",
      remediationPlan: [
        {
          priority: "Immediate",
          title: "Force HTTPS everywhere",
          detail:
            "Add a permanent redirect from every HTTP request to the equivalent HTTPS URL and verify legacy paths behave consistently."
        },
        {
          priority: "Immediate",
          title: "Enable HSTS after redirect validation",
          detail:
            "Once HTTP redirect behavior is stable, instruct browsers to prefer HTTPS automatically."
        },
        {
          priority: "Next sprint",
          title: "Harden visible cookies and publish contact metadata",
          detail:
            "Review application and marketing cookies, then add security.txt and certificate governance records to round out the public-facing posture."
        }
      ],
      plainEnglish: [
        {
          term: "HSTS",
          explanation:
            "HSTS tells the browser to keep using HTTPS so a visitor is less likely to land on an insecure version of the site later."
        },
        {
          term: "SameSite cookie",
          explanation:
            "SameSite limits when browsers send cookies with cross-site requests, which helps reduce some account abuse and request forgery scenarios."
        }
      ],
      generatedByAi: false
    }
  },
  {
    id: "demo-velocity-commerce",
    ownerUserId: null,
    organizationId: null,
    workspace: null,
    targetInput: "velocity-commerce.demo",
    normalizedUrl: "https://velocity-commerce.demo",
    hostname: "velocity-commerce.demo",
    origin: "DEMO",
    status: "COMPLETED",
    overallScore: 72,
    executiveSummary:
      "Velocity Commerce has the essentials of a modern HTTPS setup, but the security story is uneven. The biggest opportunity is to add a stronger browser policy layer and close smaller hygiene gaps before scaling traffic and integrations further.",
    signalSnapshot: {
      normalizedUrl: "https://velocity-commerce.demo",
      hostname: "velocity-commerce.demo",
      httpsReachable: true,
      httpRedirectToHttps: true,
      httpStatus: 308,
      httpsStatus: 200,
      headers: {
        "content-security-policy": "default-src 'self'; img-src 'self' https: data:;",
        "strict-transport-security": null,
        "x-frame-options": null,
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin"
      },
      cookieSnapshot: {
        totalVisible: 2,
        secureCount: 2,
        httpOnlyCount: 1,
        sameSiteCount: 2,
        insecureCookies: ["cart_state"],
        sampleCookies: ["cart_state", "session_id"]
      },
      tls: {
        reachable: true,
        validTo: "2026-08-02T12:00:00.000Z",
        daysRemaining: 128,
        expired: false,
        error: null
      },
      dnsAuth: {
        spf: null,
        dmarc: null,
        spfRecord: null,
        dmarcRecord: null,
        mtaSts: false,
        mtaStsRecord: null,
        caaPresent: true,
        caaRecords: ["issue letsencrypt.org"]
      },
      discovery: {
        robotsTxt: {
          reachable: true,
          status: 200,
          location: "https://velocity-commerce.demo/robots.txt"
        },
        securityTxt: {
          reachable: false,
          status: 404,
          location: null,
          canonicalUrl: null,
          contactLines: [],
          expires: null,
          source: null
        }
      },
      responseNotes: ["Demo sample seeded for showcase mode."]
    },
    errorMessage: null,
    createdAt: new Date(now.getTime() - 1000 * 60 * 610).toISOString(),
    completedAt: new Date(now.getTime() - 1000 * 60 * 608).toISOString(),
    findings: [
      {
        title: "HSTS header is missing",
        severity: "MEDIUM",
        category: "Transport security",
        summary:
          "The application redirects to HTTPS but does not instruct browsers to keep using it automatically in future visits.",
        evidence: "No Strict-Transport-Security header was visible in the HTTPS response.",
        recommendation:
          "Add Strict-Transport-Security with a staged rollout and includeSubDomains where appropriate.",
        displayOrder: 0
      },
      {
        title: "Frame embedding protection is absent",
        severity: "LOW",
        category: "Browser hardening",
        summary:
          "No X-Frame-Options header was visible, which makes clickjacking protections less explicit for older browsers and simpler deployments.",
        evidence: "No X-Frame-Options header was visible in the HTTPS response.",
        recommendation: "Add X-Frame-Options: DENY or SAMEORIGIN unless framing is required.",
        displayOrder: 1
      }
    ],
    report: {
      technicalNarrative:
        "The site already demonstrates good transport basics and a starter CSP, which makes it a strong foundation. Remaining work is mostly about consistency: HSTS, frame protections, security.txt publication, and cookie flag standardization would tighten the public-facing posture without changing application behavior dramatically.",
      remediationPlan: [
        {
          priority: "Immediate",
          title: "Enable HSTS",
          detail:
            "Pair the existing redirect with an HSTS header so browsers automatically keep subsequent sessions on HTTPS."
        },
        {
          priority: "Next sprint",
          title: "Add explicit anti-framing rules",
          detail:
            "Use X-Frame-Options or a CSP frame-ancestors directive, depending on whether legitimate framing is required."
        }
      ],
      plainEnglish: [
        {
          term: "X-Frame-Options",
          explanation:
            "This header tells browsers whether another site is allowed to load your pages inside an iframe."
        }
      ],
      generatedByAi: false
    }
  }
];
