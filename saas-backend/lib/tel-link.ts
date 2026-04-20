/** Возвращает href для tel: или null, если цифр слишком мало. */
export function telHref(phoneOrText: string): string | null {
  const raw = String(phoneOrText || "").trim();
  if (!raw) {
    return null;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  let n = digits;
  if (n.length === 11 && n.startsWith("8")) {
    n = `7${n.slice(1)}`;
  }
  if (n.length === 10) {
    n = `7${n}`;
  }
  return `tel:+${n}`;
}
