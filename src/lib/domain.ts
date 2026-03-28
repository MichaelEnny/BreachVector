export interface NormalizedTarget {
  targetInput: string;
  normalizedUrl: string;
  hostname: string;
}

export function normalizeTarget(input: string): NormalizedTarget {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a domain or URL to analyze.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http:// and https:// targets are supported.");
  }

  url.hash = "";
  url.search = "";

  if (!url.hostname) {
    throw new Error("That target does not include a valid hostname.");
  }

  return {
    targetInput: trimmed,
    normalizedUrl: `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`,
    hostname: url.hostname
  };
}

export function toHttpUrl(hostname: string) {
  return `http://${hostname}`;
}

export function toHttpsUrl(hostname: string) {
  return `https://${hostname}`;
}
