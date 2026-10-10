export function filterMarkers(markers, category, query, hideCompleted, completed) {
  return markers.filter(m => (!category || m.type === category) && (m.name + m.description).includes(query.trim()) && (!hideCompleted || !completed.includes(m.id)))
}
export function parseProgress(raw, allowed) {
  try { const data = JSON.parse(raw); return Array.isArray(data) ? [...new Set(data.filter(id => allowed.includes(id)))] : [] } catch { return [] }
}
export function clampZoom(value) { return Math.min(3, Math.max(1, value)) }
