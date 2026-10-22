export function parse(value: string): Record<string, string> {
  return Object.fromEntries(
    value.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [];

      const name = part.slice(0, separator).trim();
      const rawValue = part.slice(separator + 1).trim();
      if (!name) return [];

      try {
        return [[name, decodeURIComponent(rawValue)]];
      } catch {
        return [[name, rawValue]];
      }
    }),
  );
}
