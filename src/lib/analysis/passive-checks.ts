import { resolveCaa, resolveTxt } from "node:dns/promises";
import tls from "node:tls";

import { toHttpUrl, toHttpsUrl, type NormalizedTarget } from "@/lib/domain";
import type {
  CookieSnapshot,
  DiscoverySnapshot,
  DnsAuthSnapshot,
  HeaderSnapshot,
  SignalSnapshot,
  TlsSnapshot
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

type HeaderProbe = {
  status: number | null;
  headers: Headers | null;
  location: string | null;
  error: string | null;
};

type TextProbe = {
  status: number | null;
  location: string | null;
  body: string | null;
  error: string | null;
};

const SECURITY_HEADERS: Array<keyof HeaderSnapshot> = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy"
];

async function probeHeaders(url: string, redirect: RequestRedirect): Promise<HeaderProbe> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect,
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "BreachVector/1.0 (+passive-security-review)",
        accept: "text/html,application/xhtml+xml"
      }
    });

    response.body?.cancel().catch(() => undefined);

    return {
      status: response.status,
      headers: response.headers,
      location: response.headers.get("location"),
      error: null
    };
  } catch (error) {
    return {
      status: null,
      headers: null,
      location: null,
      error: getErrorMessage(error)
    };
  }
}

async function probeTextResource(url: string): Promise<TextProbe> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "BreachVector/1.0 (+passive-security-review)",
        accept: "text/plain,text/*;q=0.9,*/*;q=0.1"
      }
    });

    const body = response.ok ? (await response.text()).slice(0, 8192) : null;

    return {
      status: response.status,
      location: response.url || null,
      body,
      error: null
    };
  } catch (error) {
    return {
      status: null,
      location: null,
      body: null,
      error: getErrorMessage(error)
    };
  }
}

function extractHeaderSnapshot(headers: Headers | null): HeaderSnapshot {
  return SECURITY_HEADERS.reduce<HeaderSnapshot>(
    (accumulator, headerName) => {
      accumulator[headerName] = headers?.get(headerName) ?? null;
      return accumulator;
    },
    {
      "content-security-policy": null,
      "strict-transport-security": null,
      "x-frame-options": null,
      "x-content-type-options": null,
      "referrer-policy": null
    }
  );
}

function extractCookieSnapshot(headers: Headers | null): CookieSnapshot {
  const nodeHeaders = headers as (Headers & { getSetCookie?: () => string[] }) | null;
  const getSetCookie = nodeHeaders?.getSetCookie?.bind(nodeHeaders);
  const rawCookies = getSetCookie
    ? getSetCookie()
    : headers?.get("set-cookie")
      ? [headers.get("set-cookie") as string]
      : [];

  const parsed = rawCookies.map((cookie) => {
    const [namePart, ...flagParts] = cookie.split(";").map((item) => item.trim());
    const name = namePart.split("=")[0] || "cookie";
    const flags = flagParts.map((flag) => flag.toLowerCase());

    return {
      name,
      secure: flags.includes("secure"),
      httpOnly: flags.includes("httponly"),
      sameSite: flags.some((flag) => flag.startsWith("samesite"))
    };
  });

  return {
    totalVisible: parsed.length,
    secureCount: parsed.filter((item) => item.secure).length,
    httpOnlyCount: parsed.filter((item) => item.httpOnly).length,
    sameSiteCount: parsed.filter((item) => item.sameSite).length,
    insecureCookies: parsed
      .filter((item) => !item.secure || !item.httpOnly || !item.sameSite)
      .map((item) => item.name),
    sampleCookies: parsed.map((item) => item.name).slice(0, 5)
  };
}

async function inspectTls(hostname: string): Promise<TlsSnapshot> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 6000
      },
      () => {
        const certificate = socket.getPeerCertificate();
        socket.end();

        if (!certificate || !certificate.valid_to) {
          resolve({
            reachable: false,
            validTo: null,
            daysRemaining: null,
            expired: false,
            error: "TLS certificate details were not available."
          });
          return;
        }

        const validTo = new Date(certificate.valid_to);
        const daysRemaining = Math.ceil((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        resolve({
          reachable: true,
          validTo: validTo.toISOString(),
          daysRemaining,
          expired: daysRemaining < 0,
          error: null
        });
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        reachable: false,
        validTo: null,
        daysRemaining: null,
        expired: false,
        error: "TLS handshake timed out."
      });
    });

    socket.on("error", (error) => {
      socket.destroy();
      resolve({
        reachable: false,
        validTo: null,
        daysRemaining: null,
        expired: false,
        error: getErrorMessage(error)
      });
    });
  });
}

async function inspectDnsAuth(hostname: string): Promise<DnsAuthSnapshot> {
  const result: DnsAuthSnapshot = {
    spf: null,
    dmarc: null,
    spfRecord: null,
    dmarcRecord: null,
    mtaSts: null,
    mtaStsRecord: null,
    caaPresent: null,
    caaRecords: []
  };

  try {
    const txt = await resolveTxt(hostname);
    const records = txt.map((entry) => entry.join(""));
    const spfRecord = records.find((record) => record.toLowerCase().startsWith("v=spf1")) ?? null;
    result.spf = Boolean(spfRecord);
    result.spfRecord = spfRecord;
  } catch {
    result.spf = false;
  }

  try {
    const txt = await resolveTxt(`_dmarc.${hostname}`);
    const records = txt.map((entry) => entry.join(""));
    const dmarcRecord = records.find((record) => record.toLowerCase().startsWith("v=dmarc1")) ?? null;
    result.dmarc = Boolean(dmarcRecord);
    result.dmarcRecord = dmarcRecord;
  } catch {
    result.dmarc = false;
  }

  try {
    const txt = await resolveTxt(`_mta-sts.${hostname}`);
    const records = txt.map((entry) => entry.join(""));
    const mtaStsRecord = records.find((record) => record.toLowerCase().startsWith("v=stsv1")) ?? null;
    result.mtaSts = Boolean(mtaStsRecord);
    result.mtaStsRecord = mtaStsRecord;
  } catch {
    result.mtaSts = false;
  }

  try {
    const records = await resolveCaa(hostname);
    const caaRecords = records
      .map((record) => {
        if (record.issue) {
          return `issue ${record.issue}`;
        }

        if (record.issuewild) {
          return `issuewild ${record.issuewild}`;
        }

        if (record.iodef) {
          return `iodef ${record.iodef}`;
        }

        return null;
      })
      .filter((record): record is string => Boolean(record));

    result.caaPresent = caaRecords.length > 0;
    result.caaRecords = caaRecords;
  } catch {
    result.caaPresent = false;
    result.caaRecords = [];
  }

  return result;
}

async function inspectDiscovery(hostname: string): Promise<{ discovery: DiscoverySnapshot; notes: string[] }> {
  const notes: string[] = [];
  const [robotsProbe, securityWellKnownProbe] = await Promise.all([
    probeTextResource(`${toHttpsUrl(hostname)}/robots.txt`),
    probeTextResource(`${toHttpsUrl(hostname)}/.well-known/security.txt`)
  ]);

  if (robotsProbe.error) {
    notes.push(`robots.txt: ${robotsProbe.error}`);
  }

  let securityProbe = securityWellKnownProbe;
  let source: "well-known" | "root" | null = securityWellKnownProbe.status === 200 ? "well-known" : null;

  if (!source) {
    const rootProbe = await probeTextResource(`${toHttpsUrl(hostname)}/security.txt`);
    if (rootProbe.error) {
      notes.push(`security.txt: ${rootProbe.error}`);
    }
    if (rootProbe.status === 200) {
      securityProbe = rootProbe;
      source = "root";
    }
  }

  const lines = securityProbe.body
    ? securityProbe.body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    : [];

  const contactLines = lines
    .filter((line) => /^contact:/i.test(line))
    .map((line) => line.replace(/^contact:/i, "").trim())
    .slice(0, 3);

  const canonicalUrl = lines
    .find((line) => /^canonical:/i.test(line))
    ?.replace(/^canonical:/i, "")
    .trim() ?? null;
  const expires = lines
    .find((line) => /^expires:/i.test(line))
    ?.replace(/^expires:/i, "")
    .trim() ?? null;

  return {
    discovery: {
      robotsTxt: {
        reachable: robotsProbe.status === 200,
        status: robotsProbe.status,
        location: robotsProbe.location
      },
      securityTxt: {
        reachable: securityProbe.status === 200,
        status: securityProbe.status,
        location: securityProbe.location,
        canonicalUrl,
        contactLines,
        expires,
        source
      }
    },
    notes
  };
}

export async function runPassiveChecks(target: NormalizedTarget): Promise<SignalSnapshot> {
  const [httpProbe, httpsProbe, tlsSnapshot, dnsAuth, discoveryResult] = await Promise.all([
    probeHeaders(toHttpUrl(target.hostname), "manual"),
    probeHeaders(toHttpsUrl(target.hostname), "manual"),
    inspectTls(target.hostname),
    inspectDnsAuth(target.hostname),
    inspectDiscovery(target.hostname)
  ]);

  const responseNotes: string[] = [];

  if (httpProbe.error) {
    responseNotes.push(`HTTP probe: ${httpProbe.error}`);
  }

  if (httpsProbe.error) {
    responseNotes.push(`HTTPS probe: ${httpsProbe.error}`);
  }

  if (tlsSnapshot.error) {
    responseNotes.push(`TLS: ${tlsSnapshot.error}`);
  }

  responseNotes.push(...discoveryResult.notes);

  const httpRedirectToHttps = Boolean(httpProbe.location && /^https:\/\//i.test(httpProbe.location));

  return {
    normalizedUrl: target.normalizedUrl,
    hostname: target.hostname,
    httpsReachable: httpsProbe.status !== null && !httpsProbe.error,
    httpRedirectToHttps,
    httpStatus: httpProbe.status,
    httpsStatus: httpsProbe.status,
    headers: extractHeaderSnapshot(httpsProbe.headers),
    cookieSnapshot: extractCookieSnapshot(httpsProbe.headers),
    tls: tlsSnapshot,
    dnsAuth,
    discovery: discoveryResult.discovery,
    responseNotes
  };
}
