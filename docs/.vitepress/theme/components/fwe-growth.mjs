export function effectiveGrowth(base, bonus) {
 return base == null || bonus == null ? null : base + bonus
}
export function expectation(base, bonus, levels) {
 const rate = effectiveGrowth(base, bonus)
 return rate == null ? null : rate / 100 * Math.max(0, Math.trunc(levels))
}
export function matchesRecord(record, phase, route, query = '') {
 return (!phase || record.phase === phase) && (!route || record.routes.includes(route)) &&
 JSON.stringify(record).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}
