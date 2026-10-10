export function tokenize(text) { return text.match(/[\p{Script=Han}]|[\p{L}\p{N}]+/gu) || [] }
