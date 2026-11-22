export const C = {
  RED: '#ef4444', ORA: '#f97316', AMB: '#fbbf24', YEL: '#fde047',
  LIM: '#a3e635', GRN: '#22c55e', DGR: '#15803d', TEA: '#14b8a6',
  SKY: '#38bdf8', BLU: '#3b82f6', NAV: '#1e40af', PUR: '#8b5cf6',
  VIO: '#c084fc', PNK: '#f472b6', LPK: '#fbcfe8', ROS: '#e11d48',
  BRN: '#92400e', TAN: '#d6a26b', PEA: '#fed7aa', CRM: '#fef3c7',
  WHT: '#ffffff', LGR: '#d1d5db', GRY: '#6b7280', BLK: '#1f2937',
} as const

/** 24 bright colors shown in the palette. */
export const PALETTE: string[] = Object.values(C)
export const BLANK = '#ffffff'
export const INK = '#2b2b2b'
