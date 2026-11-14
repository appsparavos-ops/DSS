/**
 * Decodifica los CSV habituales de Excel sin reemplazar letras acentuadas.
 * Admite UTF-8 (con o sin BOM), UTF-16 con BOM y Windows-1252 (ANSI).
 */
export function decodeCsvText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }

  try {
    // Fallar ante UTF-8 inválido permite intentar ANSI antes de perder letras.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
