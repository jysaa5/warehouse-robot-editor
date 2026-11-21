export const MODEL = 'warehouse-amr';
export interface Robot { id: string; model: typeof MODEL; position: { x: number; y: number; z: number }; rotation: { y: number } }
export interface Layout { version: 1; robots: Robot[] }
export const snap = (value: number, step: number) => Math.round(value / step) * step;
export const normalizeAngle = (value: number) => ((value % 360) + 360) % 360;
export function parseLayout(text: string): Layout {
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.robots) || data.robots.length > 100) throw new Error('version 1과 최대 100개의 robots 배열이 필요합니다.');
  const ids = new Set<string>();
  for (const r of data.robots) {
    if (!r || typeof r.id !== 'string' || !r.id.trim() || ids.has(r.id) || r.model !== MODEL ||
      ![r.position?.x, r.position?.y, r.position?.z, r.rotation?.y].every(v => typeof v === 'number' && Number.isFinite(v)) || r.position.y !== 0)
      throw new Error('로봇 ID, 모델, 유한한 좌표와 회전값을 확인하세요. 바닥 높이 Y는 0이어야 합니다.');
    ids.add(r.id);
  }
  return { version: 1, robots: data.robots.map((r: Robot) => ({ id: r.id, model: MODEL, position: { ...r.position }, rotation: { y: normalizeAngle(r.rotation.y) } })) };
}
