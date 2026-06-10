import { ObiTextConfig } from "../types";

/**
 * Renders a high-resolution professional real estate Obi (帯) banner on a canvas.
 * Returns a base64 encoded PNG string.
 */
export function drawObiToCanvas(config: ObiTextConfig, scale: number = 1): string {
  const canvas = document.createElement("canvas");
  // Large scale 1200x240 * scale for high print quality
  canvas.width = 1200 * scale;
  canvas.height = 240 * scale;
  const ctx = canvas.getContext("2d")!;

  const bg = config.primaryColor;
  const textColor = config.textColor;

  // Background Fill
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Double thin borders
  if (config.showBorders) {
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 8 * scale;
    ctx.strokeRect(10 * scale, 10 * scale, canvas.width - 20 * scale, canvas.height - 20 * scale);
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(18 * scale, 18 * scale, canvas.width - 36 * scale, canvas.height - 36 * scale);
  }

  // Primary font definition
  const fontSans = '"Plus Jakarta Sans", "Noto Sans JP", -apple-system, sans-serif';

  // Section Dividers
  ctx.strokeStyle = textColor === "#FFFFFF" || textColor === "#FFFAF0" 
    ? "rgba(255,255,255,0.22)" 
    : "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1.5 * scale;

  // Draw Row 1: Company Name (株式会社Ambitious) at the top, alone and elegant
  ctx.fillStyle = textColor;
  const compName = config.companyName || "株式会社Ambitious";
  ctx.font = `bold ${28 * scale}px ${fontSans}`;
  ctx.fillText(compName, 50 * scale, 62 * scale);

  // Horizontal Sleek Divider Line under Row 1
  ctx.beginPath();
  ctx.moveTo(40 * scale, 82 * scale);
  ctx.lineTo(1160 * scale, 82 * scale);
  ctx.stroke();

  // Draw Column Dividers below the horizontal line
  // Column 1 is wider (x=50 to 520) than Columns 2 & 3 to accommodate address
  const div1X = 520 * scale;
  const div2X = 860 * scale;

  ctx.beginPath();
  ctx.moveTo(div1X, 96 * scale);
  ctx.lineTo(div1X, 212 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(div2X, 96 * scale);
  ctx.lineTo(div2X, 212 * scale);
  ctx.stroke();

  // Common font for all column details - equal size as requested
  const colFont = `600 ${13.5 * scale}px ${fontSans}`;
  ctx.font = colFont;

  // Line coordinates
  const line1Y = 122 * scale;
  const line2Y = 158 * scale;
  const line3Y = 194 * scale;

  // COLUMN 1: Address, Business Hours, License Identifier
  // Line 1: Address
  const fullAddress = config.address || "〒063-0863 北海道札幌市西区八軒三条東４丁目１−１";
  ctx.fillText(fullAddress, 50 * scale, line1Y);

  // Line 2: 営業時間
  ctx.fillText("営業時間 ： 09:00 〜 17:00", 50 * scale, line2Y);

  // Line 3: 北海道知事
  const license = config.licenseNumber || "北海道知事石狩(1)第9451号";
  ctx.fillText(license, 50 * scale, line3Y);

  // COLUMN 2: TEL, FAX, Website URL
  // Line 1: TEL
  const phoneVal = config.phone || "011-600-6863";
  ctx.fillText(`TEL ： ${phoneVal}`, div1X + 25 * scale, line1Y);

  // Line 2: FAX
  const faxVal = config.fax || "011-351-5312";
  ctx.fillText(`FAX ： ${faxVal}`, div1X + 25 * scale, line2Y);

  // Line 3: Website URL
  const webVal = config.website || "https://ambitious-jp.com";
  ctx.fillText(`URL ： ${webVal}`, div1X + 25 * scale, line3Y);

  // COLUMN 3: Contact Person ("担当"), Email & Trade Aspect ("取引態様")
  // Line 1: 担当
  const contactVal = config.contactPerson || "孫 姍姍";
  ctx.fillText(`担当 ： ${contactVal}`, div2X + 25 * scale, line1Y);

  // Line 2: Email
  const emailVal = config.email || "sun_sun@ambitious-jp.com";
  ctx.fillText(`Email ： ${emailVal}`, div2X + 25 * scale, line2Y);

  // Line 3: 取引態様 / Commission
  const commVal = config.commission || "3%+6万円（税別）";
  ctx.fillText(`取引態様 ： 仲介  (手数料 : ${commVal})`, div2X + 25 * scale, line3Y);

  return canvas.toDataURL("image/png");
}
