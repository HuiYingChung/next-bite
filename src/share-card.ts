import type { Locale } from "./types";

// Deliberately accepts public catalog copy only. Never pass a profile, log, or key.
export type MealCardCopy = {
  title: string;
  cuisine: string;
  tip: string;
  locale: Locale;
};

const fontStack =
  'system-ui, -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif';
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

const drawBowl = (context: CanvasRenderingContext2D) => {
  context.save();
  context.translate(1003, 492);
  context.rotate(-0.08);
  context.lineCap = "round";
  context.strokeStyle = "#16634b";
  context.lineWidth = 9;
  [-46, 0, 46].forEach((offset) => {
    context.beginPath();
    context.moveTo(offset, -85);
    context.bezierCurveTo(
      offset - 23,
      -111,
      offset + 25,
      -127,
      offset + 5,
      -153,
    );
    context.stroke();
  });
  context.fillStyle = "#f7b17b";
  context.beginPath();
  context.ellipse(0, 7, 116, 42, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#4f9665";
  [
    [-64, -2],
    [-12, -11],
    [42, 4],
    [74, -7],
  ].forEach(([x, y]) => {
    context.beginPath();
    context.ellipse(x, y, 22, 13, -0.4, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(-116, 14);
  context.bezierCurveTo(-104, 150, 104, 150, 116, 14);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.ellipse(0, 14, 116, 37, 0, 0, Math.PI);
  context.stroke();
  context.strokeStyle = "#e4b770";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(16, -36);
  context.lineTo(131, -140);
  context.moveTo(34, -30);
  context.lineTo(147, -130);
  context.stroke();
  context.restore();
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

  context.fillStyle = "#f7f3e9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e2eddd";
  context.beginPath();
  context.arc(1140, 355, 330, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#176349";
  context.font = `750 39px ${fontStack}`;
  context.fillText("MealHatch", 76, 99);
  context.font = `500 23px ${fontStack}`;
  context.fillStyle = "#526453";
  context.fillText(
    locale === "zh"
      ? "下一餐，從這道開始。"
      : "A little inspiration for your next meal.",
    76,
    143,
  );

  context.fillStyle = "#a4512d";
  context.font = `650 23px ${fontStack}`;
  const cuisineLines = fitLines(
    context,
    wrapText(context, clean(cuisine, 90), 700),
    2,
    700,
  );
  cuisineLines.forEach((line, index) =>
    context.fillText(line, 76, 224 + index * 30),
  );

  const safeTitle =
    clean(title, 220) ||
    (locale === "zh" ? "下一餐靈感" : "Your next meal inspiration");
  let size = 68;
  context.font = `750 ${size}px ${fontStack}`;
  let titleLines = wrapText(context, safeTitle, 710);
  while (titleLines.length > 4 && size > 44) {
    size -= 4;
    context.font = `750 ${size}px ${fontStack}`;
    titleLines = wrapText(context, safeTitle, 710);
  }
  context.fillStyle = "#183d30";
  fitLines(context, titleLines, 5, 710).forEach((line, index) =>
    context.fillText(line, 76, 313 + index * (size * 1.22)),
  );
  drawBowl(context);

  context.strokeStyle = "#d0d6c7";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(76, 656);
  context.lineTo(1124, 656);
  context.stroke();
  context.fillStyle = "#526453";
  context.font = `500 25px ${fontStack}`;
  fitLines(context, wrapText(context, clean(tip, 300), 1025), 3, 1025).forEach(
    (line, index) => context.fillText(line, 76, 706 + index * 35),
  );

  context.fillStyle = "#176349";
  context.font = `650 22px ${fontStack}`;
  context.fillText("mealhatch.vercel.app", 76, 847);
  context.textAlign = "right";
  context.fillStyle = "#71806d";
  context.font = `450 19px ${fontStack}`;
  context.fillText(
    locale === "zh"
      ? "整理餐點靈感 · 日常飲食選擇"
      : "Curated meal inspiration · Everyday choices",
    1124,
    847,
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
