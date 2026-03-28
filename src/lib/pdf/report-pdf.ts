import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { StoredScan } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const TOP_Y = 742;
const LINE_HEIGHT = 16;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

export async function buildScanPdf(scan: StoredScan) {
  const pdf = await PDFDocument.create();
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = TOP_Y;

  const ensureSpace = (lines = 1) => {
    const required = lines * LINE_HEIGHT + 28;
    if (y - required <= 54) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = TOP_Y;
    }
  };

  const drawLine = (text: string, size = 11, color = rgb(0.18, 0.2, 0.25)) => {
    page.drawText(text, {
      x: MARGIN_X,
      y,
      size,
      font: bodyFont,
      color
    });
    y -= LINE_HEIGHT;
  };

  const drawWrapped = (text: string, size = 11, color = rgb(0.18, 0.2, 0.25)) => {
    const lines = wrapText(text, bodyFont, size, PAGE_WIDTH - MARGIN_X * 2);
    ensureSpace(lines.length + 1);
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size,
        font: bodyFont,
        color
      });
      y -= LINE_HEIGHT;
    }
  };

  const drawSection = (title: string) => {
    ensureSpace(2);
    page.drawText(title, {
      x: MARGIN_X,
      y,
      size: 15,
      font: headingFont,
      color: rgb(0.04, 0.16, 0.27)
    });
    y -= 22;
  };

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 108,
    width: PAGE_WIDTH,
    height: 108,
    color: rgb(0.06, 0.11, 0.18)
  });

  page.drawText("BreachVector", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 54,
    size: 24,
    font: headingFont,
    color: rgb(0.78, 0.96, 0.93)
  });

  page.drawText("Website Security Review", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 78,
    size: 11,
    font: bodyFont,
    color: rgb(0.75, 0.86, 0.92)
  });

  page.drawText(String(scan.overallScore), {
    x: PAGE_WIDTH - 112,
    y: PAGE_HEIGHT - 66,
    size: 34,
    font: headingFont,
    color: rgb(0.96, 0.99, 1)
  });

  y = PAGE_HEIGHT - 142;
  drawLine(`Target: ${scan.hostname}`, 12, rgb(0.05, 0.12, 0.2));
  drawLine(`Normalized URL: ${scan.normalizedUrl}`);
  drawLine(`Completed: ${formatDateTime(scan.completedAt ?? scan.createdAt)}`);
  drawLine(`Origin: ${scan.origin === "DEMO" ? "Seeded showcase" : "Live owned scan"}`);
  y -= 8;

  drawSection("Executive summary");
  drawWrapped(scan.executiveSummary, 11.5, rgb(0.2, 0.22, 0.28));
  y -= 6;

  drawSection("Top findings");
  for (const finding of scan.findings.slice(0, 6)) {
    drawLine(`${finding.severity} - ${finding.title}`, 11.5, rgb(0.04, 0.16, 0.27));
    drawWrapped(finding.summary, 10.5);
    drawWrapped(`Remediation: ${finding.recommendation}`, 10.5, rgb(0.1, 0.14, 0.2));
    y -= 6;
  }

  drawSection("Technical narrative");
  drawWrapped(scan.report.technicalNarrative, 10.75);
  y -= 6;

  drawSection("Remediation plan");
  for (const step of scan.report.remediationPlan) {
    drawLine(`${step.priority} - ${step.title}`, 11.5, rgb(0.04, 0.16, 0.27));
    drawWrapped(step.detail, 10.5);
    y -= 6;
  }

  drawSection("Signal breakdown");
  drawLine(`HTTPS reachable: ${scan.signalSnapshot.httpsReachable ? "Yes" : "No"}`);
  drawLine(`HTTP redirects to HTTPS: ${scan.signalSnapshot.httpRedirectToHttps ? "Yes" : "No"}`);
  drawLine(`HTTPS status: ${scan.signalSnapshot.httpsStatus ?? "Unavailable"}`);
  drawLine(`HTTP status: ${scan.signalSnapshot.httpStatus ?? "Unavailable"}`);
  drawLine(`TLS expiration: ${scan.signalSnapshot.tls.validTo ? formatDateTime(scan.signalSnapshot.tls.validTo) : "Unknown"}`);
  drawLine(`SPF: ${scan.signalSnapshot.dnsAuth.spf === null ? "Not checked" : scan.signalSnapshot.dnsAuth.spf ? "Present" : "Missing"}`);
  drawLine(`DMARC: ${scan.signalSnapshot.dnsAuth.dmarc === null ? "Not checked" : scan.signalSnapshot.dnsAuth.dmarc ? "Present" : "Missing"}`);
  drawLine(`MTA-STS: ${scan.signalSnapshot.dnsAuth.mtaSts === null ? "Not checked" : scan.signalSnapshot.dnsAuth.mtaSts ? "Present" : "Missing"}`);
  drawLine(`CAA: ${scan.signalSnapshot.dnsAuth.caaPresent === null ? "Not checked" : scan.signalSnapshot.dnsAuth.caaPresent ? "Present" : "Missing"}`);
  drawLine(`robots.txt: ${scan.signalSnapshot.discovery.robotsTxt.reachable ? "Reachable" : "Not detected"}`);
  drawLine(`security.txt: ${scan.signalSnapshot.discovery.securityTxt.reachable ? "Reachable" : "Not detected"}`);

  if (scan.report.plainEnglish.length > 0) {
    y -= 8;
    drawSection("Plain-English notes");
    for (const item of scan.report.plainEnglish) {
      drawLine(item.term, 11.5, rgb(0.04, 0.16, 0.27));
      drawWrapped(item.explanation, 10.5);
      y -= 6;
    }
  }

  return pdf.save();
}
