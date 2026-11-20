export interface EventColors {
  bg: string;
  border: string;
  text: string;
  /** "r, g, b" so cards can tint with rgba(). */
  rgb: string;
}

/** Peach-bloom pastel palette. */
function pastel(hex: string, rgb: string, border: string): EventColors {
  return { bg: hex, border, text: '#ffffff', rgb };
}

export const PASTEL_PALETTE = {
  rose: pastel('#BC9188', '188, 145, 136', '#A57C73'),
  sand: pastel('#B2A48C', '178, 164, 140', '#998C75'),
  peach: pastel('#BC9882', '188, 152, 130', '#A5826D'),
  cocoa: pastel('#957C62', '149, 124, 98', '#7D6750'),
  caramel: pastel('#A88564', '168, 133, 100', '#8F7053'),
} as const;

export type PastelKey = keyof typeof PASTEL_PALETTE;
