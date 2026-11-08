export type TextParameters = Record<string, unknown>;
export type MessageLookup = (key: string) => string | undefined;

/** Explicit values are literal; only dictionary references expand recursively. */
export function interpolateText(
  text: string,
  parameters: TextParameters,
  lookup: MessageLookup,
  active = new Set<string>(),
  depth = 0,
): string {
  return text.replace(/\$\{(.*?)\}/g, (match, key: string) => {
    const name = key.trim();
    if (Object.prototype.hasOwnProperty.call(parameters, name))
      return String(parameters[name]);
    if (active.has(name) || depth >= 32) return match;
    const reference = lookup(name);
    if (reference === undefined) return match;
    return interpolateText(
      reference,
      parameters,
      lookup,
      new Set([...active, name]),
      depth + 1,
    );
  });
}

/** Validate caller parameters, allowing references to other dictionary entries. */
export function requiredParameters(
  text: string,
  lookup: MessageLookup,
  active = new Set<string>(),
  depth = 0,
): string[] {
  const required = new Set<string>();
  for (const match of text.matchAll(/\$\{(.*?)\}/g)) {
    const name = match[1].trim();
    if (active.has(name) || depth >= 32) continue;
    const reference = lookup(name);
    if (reference === undefined) required.add(name);
    else
      for (const parameter of requiredParameters(
        reference,
        lookup,
        new Set([...active, name]),
        depth + 1,
      ))
        required.add(parameter);
  }
  return [...required].sort();
}
