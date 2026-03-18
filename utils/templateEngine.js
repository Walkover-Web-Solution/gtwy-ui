const FULL_RE = /^\{\{([\w.[\]]+)\}\}$/;
const INLINE_RE = /\{\{([\w.[\]]+)\}\}/g;

function resolvePath(path, scope) {
  const parts = path.replace(/\[(\w+)\]/g, ".$1").split(".");
  let current = scope;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

export function interpolate(template, scope) {
  if (typeof template !== "string") return template;
  const full = template.match(FULL_RE);
  if (full) {
    const resolved = resolvePath(full[1], scope);
    return resolved !== undefined ? resolved : template;
  }

  // Inline: replace each placeholder with its string representation
  return template.replace(INLINE_RE, (_, path) => {
    const resolved = resolvePath(path, scope);
    return resolved !== undefined ? String(resolved) : _;
  });
}

export function resolveNode(node, scope) {
  if (typeof node === "string") return interpolate(node, scope);
  if (Array.isArray(node)) return node.map((n) => resolveNode(n, scope));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = resolveNode(v, scope);
    }
    return out;
  }
  return node;
}

export function resolveAction(actionRef, actionDefs, scope = {}) {
  if (!actionRef || !actionDefs) return null;
  const template = actionDefs[actionRef];
  if (!template) {
    return null;
  }

  return resolveNode(JSON.parse(JSON.stringify(template)), scope);
}
