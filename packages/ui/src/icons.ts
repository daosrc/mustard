/**
 * 线性图标库（24×24 网格，stroke=currentColor）。
 * 与 design/prototype/index.html 的图标保持一致，供 MIcon 按名称渲染。
 */

export type IconShape
  = | { t: 'path', d: string }
    | { t: 'circle', cx: number, cy: number, r: number }
    | { t: 'rect', x: number, y: number, w: number, h: number, rx?: number }
    | { t: 'line', x1: number, y1: number, x2: number, y2: number }

function p(...ds: string[]): IconShape[] {
  return ds.map(d => ({ t: 'path', d }))
}

const GEAR = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'

export const ICONS: Record<string, IconShape[]> = {
  'globe': [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    ...p('M3 12h18', 'M12 3a15 15 0 0 1 0 18', 'M12 3a15 15 0 0 0 0 18'),
  ],
  'message': p('M4 4h16v12H7l-3 4V4z', 'M9 9h6', 'M9 12h4'),
  'translate': p(
    'M3.6 5.6h7.2',
    'M7.2 3.3v2.3',
    'M3.5 8.7 10.9 14',
    'M10.9 8.7 3.5 14',
    'M13.6 19.6 17.5 10.4 21.4 19.6',
    'M14.9 16.4h5.2',
  ),
  'book': p('M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5z', 'M8 3v18'),
  'settings': [{ t: 'circle', cx: 12, cy: 12, r: 3 }, { t: 'path', d: GEAR }],
  'plus': p('M12 5v14M5 12h14'),
  'history': p('M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 4v4h4', 'M12 8v4l3 2'),
  'close': p('M18 6 6 18M6 6l12 12'),
  'send': p('M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z'),
  'speaker': p('M11 5 6 9H3v6h3l5 4V5z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'),
  'copy': [{ t: 'rect', x: 9, y: 9, w: 12, h: 12, rx: 2 }, ...p('M5 15V5a2 2 0 0 1 2-2h10')],
  'chevron-down': p('m6 9 6 6 6-6'),
  'chevron-left': p('M15 18l-6-6 6-6'),
  'chevron-right': p('M9 18l6-6-6-6'),
  'paperclip': p('M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8'),
  'file': [{ t: 'rect', x: 4, y: 2, w: 16, h: 20, rx: 2 }, ...p('M8 7h8', 'M8 11h8', 'M8 15h4')],
  'image': [
    { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 2 },
    { t: 'circle', cx: 9, cy: 9, r: 2 },
    ...p('m3 17 4-4 4 4 3-3 5 5'),
  ],
  'check': p('M20 6 9 17l-5-5'),
  'lock': [{ t: 'rect', x: 3, y: 11, w: 18, h: 11, rx: 2 }, ...p('M7 11V7a5 5 0 0 1 10 0v4')],
  'trash': p('M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14'),
  'search': [{ t: 'circle', cx: 11, cy: 11, r: 7 }, ...p('m21 21-4.3-4.3')],
  'star': p('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'),
  'upload': p('M12 16V4', 'M7 9l5-5 5 5', 'M5 20h14'),
  'download': p('M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14'),
  'info': [{ t: 'circle', cx: 12, cy: 12, r: 10 }, ...p('M12 16v-4', 'M12 8h.01')],
  'warning': p('M12 3 2 20h20L12 3z', 'M12 9v5', 'M12 17h.01'),
  'arrow-right': p('M5 12h14M13 6l6 6-6 6'),
  'sparkles': p('M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z', 'M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z'),
}

export type IconName = keyof typeof ICONS
