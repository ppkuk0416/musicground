/**
 * 테마 정의 — 각 테마는 색상 팔레트와 분위기 파라미터를 포함한다.
 */
export const THEMES = {
  cosmic: {
    name: '우주',
    bg: [0x000011, 0x000022],           // 배경 그라디언트
    primary: [0x7c3aed, 0x4f46e5],      // 주 색상 (bass)
    secondary: [0xa78bfa, 0x818cf8],    // 보조 색상 (mid)
    accent: [0xfbbf24, 0xf59e0b],       // 강조 (treble/beat)
    fog: 0x000022,
    particleCount: 3000,
    particleSize: 1.5,
  },
  ocean: {
    name: '바다',
    bg: [0x000d1a, 0x001a33],
    primary: [0x0ea5e9, 0x0284c7],
    secondary: [0x38bdf8, 0x7dd3fc],
    accent: [0x34d399, 0x6ee7b7],
    fog: 0x001a33,
    particleCount: 2500,
    particleSize: 1.2,
  },
  forest: {
    name: '숲',
    bg: [0x030a03, 0x071407],
    primary: [0x16a34a, 0x15803d],
    secondary: [0x4ade80, 0x86efac],
    accent: [0xfde68a, 0xfcd34d],
    fog: 0x071407,
    particleCount: 2000,
    particleSize: 1.8,
  },
  fire: {
    name: '불꽃',
    bg: [0x150500, 0x220a00],
    primary: [0xef4444, 0xdc2626],
    secondary: [0xf97316, 0xfb923c],
    accent: [0xfbbf24, 0xfde68a],
    fog: 0x220a00,
    particleCount: 3500,
    particleSize: 1.0,
  },
};
