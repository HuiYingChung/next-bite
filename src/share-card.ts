import type { Locale } from "./types";

// Deliberately accepts public catalog copy only. Never pass a profile, log, or key.
export type MealCardCopy = {
  title: string;
  cuisine: string;
  tip: string;
  locale: Locale;
};

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const clean = (value: string, limit: number) =>
  value
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, limit);

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] => {
  const tokens = text.match(/[A-Za-z0-9’'/-]+|[^\s]|\s+/gu) ?? [];
  const lines: string[] = [];
  let line = "";
  for (const token of tokens) {
    if (context.measureText(`${line}${token}`).width <= width) {
      line += token;
      continue;
    }
    if (line.trim()) lines.push(line.trim());
    line = token.trimStart();
    if (context.measureText(line).width > width) {
      let fragment = "";
      for (const character of Array.from(line)) {
        if (
          fragment &&
          context.measureText(`${fragment}${character}`).width > width
        ) {
          lines.push(fragment);
          fragment = "";
        }
        fragment += character;
      }
      line = fragment;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
};

const fitLines = (
  context: CanvasRenderingContext2D,
  lines: string[],
  limit: number,
  width: number,
): string[] => {
  if (lines.length <= limit) return lines;
  const visible = lines.slice(0, limit);
  let last = visible[limit - 1];
  while (last && context.measureText(`${last}…`).width > width)
    last = Array.from(last).slice(0, -1).join("");
  visible[limit - 1] = `${last}…`;
  return visible;
};

const balanceTitle = (
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] => {
  const lines = wrapText(context, text, width);
  if (lines.length < 2) return lines;
  // Balance the available lines so a long Chinese name does not leave just
  // one character on its final line. Keep the existing readable type size.
  let lower = width / lines.length;
  let upper = width;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = (lower + upper) / 2;
    if (wrapText(context, text, candidate).length <= lines.length) upper = candidate;
    else lower = candidate;
  }
  return wrapText(context, text, upper);
};

export const downloadMealCard = async ({
  title,
  cuisine,
  tip,
  locale,
}: MealCardCopy): Promise<void> => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error(
      locale === "zh"
        ? "無法建立分享圖片，請再試一次。"
        : "The meal card could not be created. Please try again.",
    );

  await document.fonts.ready;
  context.fillStyle = "#f4f5f6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(32, 32, 1136, 836);
  context.strokeStyle = "#c4d0c9";
  context.lineWidth = 2;
  context.strokeRect(33, 33, 1134, 834);
  context.fillStyle = "#205641";
  context.font = `750 36px ${fontStack}`;
  context.fillText("MealHatch", 76, 108);
  context.font = `500 22px ${fontStack}`;
  context.textAlign = "right";
  context.fillStyle = "#52635c";
  context.fillText(
    locale === "zh"
      ? "下一餐，從這道開始。"
      : "One less thing to decide.",
    1124,
    106,
  );
  context.textAlign = "left";
  context.strokeStyle = "#c4d0c9";
  context.beginPath();
  context.moveTo(76, 148);
  context.lineTo(1124, 148);
  context.stroke();

  context.fillStyle = "#52635c";
  context.font = `550 24px ${fontStack}`;
  const cuisineLines = fitLines(
    context,
    wrapText(context, clean(cuisine, 90), 1048),
    2,
    1048,
  );
  cuisineLines.forEach((line, index) =>
    context.fillText(line, 76, 209 + index * 30),
  );

  const safeTitle =
    clean(title, 220) ||
    (locale === "zh" ? "下一餐靈感" : "Your next meal inspiration");
  let size = 76;
  context.font = `750 ${size}px ${fontStack}`;
  let titleLines = wrapText(context, safeTitle, 1048);
  while (titleLines.length > 3 && size > 48) {
    size -= 4;
    context.font = `750 ${size}px ${fontStack}`;
    titleLines = wrapText(context, safeTitle, 1048);
  }
  titleLines = balanceTitle(context, safeTitle, 1048);
  context.fillStyle = "#202925";
  fitLines(context, titleLines, 4, 1048).forEach((line, index) =>
    context.fillText(line, 76, 308 + index * (size * 1.16)),
  );

  context.strokeStyle = "#c4d0c9";
  context.beginPath();
  context.moveTo(76, 586);
  context.lineTo(1124, 586);
  context.stroke();
  context.fillStyle = "#205641";
  context.font = `650 22px ${fontStack}`;
  context.fillText(locale === "zh" ? "準備這一餐" : "Make it happen", 76, 633);
  context.fillStyle = "#52635c";
  context.font = `400 28px ${fontStack}`;
  fitLines(context, wrapText(context, clean(tip, 400), 1048), 3, 1048).forEach(
    (line, index) => context.fillText(line, 76, 680 + index * 37),
  );

  context.fillStyle = "#205641";
  context.font = `650 22px ${fontStack}`;
  context.fillText("mealhatch.vercel.app", 76, 823);
  context.textAlign = "right";
  context.fillStyle = "#52635c";
  context.font = `450 20px ${fontStack}`;
  context.fillText(
    locale === "zh"
      ? "選好下一餐・免註冊"
      : "Your next meal · No account needed",
    1124,
    823,
  );

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else
        reject(
          new Error(
            locale === "zh"
              ? "無法匯出分享圖片，請再試一次。"
              : "The meal card could not be downloaded. Please try again.",
          ),
        );
    }, "image/png"),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mealhatch-meal-${locale}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
