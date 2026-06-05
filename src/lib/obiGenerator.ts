import { ObiTextConfig } from "../types";

/**
 * Renders a high-resolution professional real estate Obi (帯) banner on a canvas.
 * Returns a base64 encoded PNG string.
 */
export function drawObiToCanvas(config: ObiTextConfig): string {
  const canvas = document.createElement("canvas");
  // Large scale 1200x240 for high print quality
  canvas.width = 1200;
  canvas.height = 240;
  const ctx = canvas.getContext("2d")!;

  const bg = config.primaryColor;
  const textColor = config.textColor;

  // Background Fill
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Double thin borders
  if (config.showBorders) {
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  }

  // Primary font definition
  const fontSans = '"Plus Jakarta Sans", "Noto Sans JP", -apple-system, sans-serif';

  // Section Dividers
  ctx.strokeStyle = textColor === "#FFFFFF" || textColor === "#FFFAF0" 
    ? "rgba(255,255,255,0.22)" 
    : "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1.5;
  
  // Left section divider at x=340
  ctx.beginPath();
  ctx.moveTo(340, 25);
  ctx.lineTo(340, 215);
  ctx.stroke();

  // Right section divider at x=830
  ctx.beginPath();
  ctx.moveTo(830, 25);
  ctx.lineTo(830, 215);
  ctx.stroke();

  // Draw Left Section (Tagline & License)
  ctx.fillStyle = textColor;
  ctx.font = `italic 600 15px ${fontSans}`;
  ctx.fillText(config.tagline || "あなたの住まい探しをパートナーに", 40, 58);

  ctx.font = `normal 500 13px ${fontSans}`;
  ctx.fillText("【宅地建物取引業者免許】", 40, 102);

  ctx.font = `bold 18px ${fontSans}`;
  ctx.fillText(config.licenseNumber || "北海道知事石狩(1)第9451号", 40, 134);

  // Split-split subtext
  ctx.font = `normal 12px ${fontSans}`;
  ctx.fillStyle = textColor === "#FFFFFF" || textColor === "#FFFAF0" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)";
  ctx.fillText(`※取引態様：仲介 (手数料: ${config.commission || "3%+6万円（税別）"})`, 40, 185);

  // Restore fillstyle
  ctx.fillStyle = textColor;

  // Draw Center Section (Company Name, Address, Website)
  // Dynamic font sizing depending on company name length
  const compName = config.companyName || "株式会社Ambitious";
  let compFontSize = 38;
  if (compName.length > 15) compFontSize = 32;
  if (compName.length > 22) compFontSize = 26;

  ctx.font = `bold ${compFontSize}px ${fontSans}`;
  ctx.fillText(compName, 370, 72);

  ctx.font = `normal 13px ${fontSans}`;
  ctx.fillStyle = textColor;
  ctx.fillText(`${config.address || "〒063-0863 北海道札幌市西区八軒三条東４丁目１−１"}`, 370, 118);

  // Small lines
  ctx.font = `normal 13px ${fontSans}`;
  ctx.fillText(`E-mail: ${config.email || "sun_sun@ambitious-jp.com"}`, 370, 158);
  ctx.fillText(`URL: ${config.website || "https://ambitious-jp.com"}`, 370, 190);

  // Draw Right Section (TEL/FAX and interactive contact CTA badge)
  ctx.fillStyle = textColor;
  ctx.font = `bold 13px ${fontSans}`;
  ctx.fillText("＼ お気軽にお問い合わせください ／", 860, 50);

  // Telephone - massive and chunky
  ctx.font = `bold 28px ${fontSans}`;
  ctx.fillText(`TEL ${config.phone || "011-600-6863"}`, 860, 94);

  ctx.font = `bold 16px ${fontSans}`;
  ctx.fillText(`FAX ${config.fax || "011-351-5312"}`, 860, 130);

  if (config.contactPerson) {
    ctx.font = `bold 14px ${fontSans}`;
    ctx.fillText(`担当窓口：${config.contactPerson}`, 860, 164);
  }

  ctx.font = `normal 11px ${fontSans}`;
  ctx.fillStyle = textColor === "#FFFFFF" || textColor === "#FFFAF0" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
  ctx.fillText("営業時間 : 09:30 〜 18:30 (水曜定休)", 860, 196);

  // Draw a decorative badge on the very right
  ctx.fillStyle = textColor === "#FFFFFF" || textColor === "#FFFAF0"
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.04)";
  ctx.beginPath();
  ctx.arc(1140, 180, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(1140, 180, 40, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = `bold 10px ${fontSans}`;
  ctx.textAlign = "center";
  ctx.fillText("AMBITIOUS", 1140, 172);
  ctx.font = `bold 11px ${fontSans}`;
  ctx.fillText("安心取引", 1140, 192);
  ctx.textAlign = "left"; // reset alignment

  return canvas.toDataURL("image/png");
}
