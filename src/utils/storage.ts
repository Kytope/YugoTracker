// localStorage puede no existir o lanzar error (modo privado, datos bloqueados).

export function store(key: string): string | null;
export function store(key: string, value: string): void;
export function store(key: string, value?: string): string | null | void {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
}
