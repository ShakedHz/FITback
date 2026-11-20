import { SPRING_HEX, type SpringColor } from '@/data/pilatesSetup';

export type ShareCardExercise = {
  name: string;
  repsLabel?: string;
  springs: SpringColor[];
};

export type ShareCardSection = {
  title: string;
  exercises: ShareCardExercise[];
};

export type ShareCardModel = {
  title: string;
  focus?: string;
  meta: string;
  description?: string;
  sections: ShareCardSection[];
};

const WIDTH = 390;
const SCALE = 3;
const PAGE = 14;
const CARD_PAD_X = 18;
const CARD_PAD_TOP = 22;

type Theme = {
  page: string;
  card: string;
  text: string;
  secondary: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  sectionFill: string;
  divider: string;
};

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const rgb = pick('--color-primary-rgb', '249, 168, 212');
  return {
    page: pick('--color-bg', '#f7f7f9'),
    card: pick('--color-card', '#ffffff'),
    text: pick('--color-text', '#18141f'),
    secondary: pick('--color-text-secondary', '#3a3548'),
    muted: pick('--color-text-muted', '#6b6578'),
    line: pick('--color-line', '#e6e4ec'),
    accent: pick('--color-primary-bright', '#ec4899'),
    accentSoft: `rgba(${rgb}, 0.16)`,
    accentBorder: `rgba(${rgb}, 0.42)`,
    sectionFill: `rgba(${rgb}, 0.05)`,
    divider: 'rgba(148, 163, 184, 0.22)',
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
}

/** PNG of the lesson card, drawn in the same pass as the share tap. */
export function renderLessonShareImage(model: ShareCardModel, filename: string): File {
  const theme = readTheme();
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canvas');
  measure.direction = 'rtl';
  measure.font = '400 15px Heebo, "Noto Sans Hebrew", sans-serif';

  const cardW = WIDTH - PAGE * 2;
  const innerW = cardW - CARD_PAD_X * 2;
  const right = PAGE + cardW - CARD_PAD_X;

  const titleFont = '700 26px Heebo, "Noto Sans Hebrew", sans-serif';
  const focusFont = '600 16px Heebo, "Noto Sans Hebrew", sans-serif';
  const metaFont = '400 13px Heebo, "Noto Sans Hebrew", sans-serif';
  const descFont = '400 15px Heebo, "Noto Sans Hebrew", sans-serif';
  const sectionFont = '700 17px Heebo, "Noto Sans Hebrew", sans-serif';
  const nameFont = '500 15px Heebo, "Noto Sans Hebrew", sans-serif';
  const pillFont = '700 12px Heebo, "Noto Sans Hebrew", sans-serif';

  measure.font = titleFont;
  const titleLines = wrapText(measure, model.title, innerW);
  measure.font = descFont;
  const descLines = model.description ? wrapText(measure, model.description, innerW) : [];

  let y = PAGE + CARD_PAD_TOP;
  y += titleLines.length * 32;
  if (model.focus) y += 26;
  y += 22;
  y += descLines.length ? 8 + descLines.length * 22 : 0;
  y += 16;

  const sectionTops: number[] = [];
  for (const section of model.sections) {
    sectionTops.push(y);
    const rows = section.exercises.length;
    y += rows > 0 ? 16 + 28 + rows * 48 + 14 : 64;
    y += 12;
  }
  y += 6;
  const height = y + PAGE;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.scale(SCALE, SCALE);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  ctx.fillStyle = theme.page;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.save();
  ctx.shadowColor = 'rgba(24, 20, 31, 0.06)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, PAGE, PAGE, cardW, height - PAGE * 2, 22);
  ctx.fillStyle = theme.card;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, PAGE, PAGE, cardW, height - PAGE * 2, 22);
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  let cursor = PAGE + CARD_PAD_TOP;
  ctx.fillStyle = theme.text;
  ctx.font = titleFont;
  for (const line of titleLines) {
    ctx.fillText(line, right, cursor);
    cursor += 32;
  }
  if (model.focus) {
    ctx.fillStyle = theme.accent;
    ctx.font = focusFont;
    ctx.fillText(model.focus, right, cursor);
    cursor += 26;
  }
  ctx.fillStyle = theme.muted;
  ctx.font = metaFont;
  ctx.fillText(model.meta, right, cursor + 2);
  cursor += 22;
  if (descLines.length) {
    cursor += 8;
    ctx.font = descFont;
    for (const line of descLines) {
      ctx.fillText(line, right, cursor);
      cursor += 22;
    }
  }
  cursor += 16;

  model.sections.forEach((section, index) => {
    const top = sectionTops[index] ?? cursor;
    const boxH = section.exercises.length > 0 ? 16 + 28 + section.exercises.length * 48 + 14 : 64;
    const boxX = PAGE + CARD_PAD_X;
    roundRect(ctx, boxX, top, innerW, boxH, 16);
    ctx.fillStyle = theme.sectionFill;
    ctx.fill();
    ctx.strokeStyle = theme.accentBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.font = sectionFont;
    ctx.textAlign = 'right';
    if (section.exercises.length === 0) {
      ctx.fillText(section.title, right, top + (boxH - 22) / 2);
    } else {
      ctx.fillText(section.title, right, top + 14);
      const listTop = top + 16 + 28;
      const listRight = boxX + innerW - 14;
      const listLeft = boxX + 14;
      const barTop = listTop + 4;
      const barH = Math.max(12, section.exercises.length * 48 - 8);
      ctx.fillStyle = theme.accent;
      roundRect(ctx, listRight - 2, barTop, 3, barH, 1.5);
      ctx.fill();

      section.exercises.forEach((ex, row) => {
        const rowTop = listTop + row * 48;
        if (row > 0) {
          ctx.strokeStyle = theme.divider;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(listLeft, rowTop);
          ctx.lineTo(listRight - 12, rowTop);
          ctx.stroke();
        }

        const springs = ex.springs.map((color) => SPRING_HEX[color]);
        ctx.save();
        ctx.direction = 'ltr';
        ctx.font = pillFont;
        const pillText = ex.repsLabel ?? '';
        const pillW = pillText ? ctx.measureText(pillText).width + 18 : 0;
        ctx.restore();
        const dotsW = springs.length ? springs.length * 9 + Math.max(0, springs.length - 1) * 3 : 0;
        const metaW = pillW + (pillW && dotsW ? 8 : 0) + dotsW;
        let metaX = listLeft;
        const midY = rowTop + 24;

        if (pillText) {
          const pillH = 24;
          const pillY = midY - pillH / 2;
          roundRect(ctx, metaX, pillY, pillW, pillH, 8);
          ctx.fillStyle = theme.accentSoft;
          ctx.fill();
          ctx.save();
          ctx.direction = 'ltr';
          ctx.fillStyle = theme.accent;
          ctx.font = pillFont;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pillText, metaX + pillW / 2, midY + 0.5);
          ctx.restore();
          metaX += pillW + 8;
        }
        springs.forEach((hex, dot) => {
          const cx = metaX + dot * 12 + 4.5;
          ctx.beginPath();
          ctx.arc(cx, midY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = hex;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        ctx.fillStyle = theme.secondary;
        ctx.font = nameFont;
        ctx.textBaseline = 'middle';
        const nameMax = listRight - 16 - listLeft - metaW - 12;
        ctx.fillText(ellipsis(ctx, ex.name, Math.max(40, nameMax)), listRight - 14, midY);
        ctx.textBaseline = 'top';
      });
    }
    cursor = top + boxH + 12;
  });

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const safe = filename.replace(/[\\/:*?"<>|]/g, '').trim() || 'lesson';
  return new File([bytes], `${safe}.png`, { type: 'image/png' });
}
