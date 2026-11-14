export interface TeamCsvFields {
  license: string;
  number: string;
  name: string;
}

/** Interpreta una fila de jugadores y conserva una licencia inicial vacía. */
export function parseTeamCsvLine(line: string): TeamCsvFields {
  const parts = line.split(';').map(part => part.trim());

  // Algunos archivos omiten la columna inicial vacía y conservan separadores
  // al final: "4;VALENTÍN;". Solo se interpreta como número/nombre si la
  // primera columna parece un número de camiseta y las restantes están vacías.
  const looksLikeNumberAndName = parts.length >= 3
    && /^\d{1,2}$/.test(parts[0])
    && /\p{L}/u.test(parts[1])
    && parts.slice(2).every(part => part === '');
  if (looksLikeNumberAndName) {
    return { license: '', number: parts[0], name: parts[1] };
  }

  if (parts.length >= 3) {
    return { license: parts[0], number: parts[1], name: parts[2] };
  }
  if (parts.length === 2) {
    return { license: '', number: parts[0], name: parts[1] };
  }
  return { license: '', number: '', name: parts[0] };
}
