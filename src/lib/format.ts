const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function npr(n: number, digits = 0) {
  return `Rs ${n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}

export function pct(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function cr(n: number) {
  return `Rs ${nf.format(Math.round(n))} cr`;
}

export function signedClass(n: number) {
  if (n > 0.05) return "text-emerald-700";
  if (n < -0.05) return "text-rose-700";
  return "text-stone-600";
}
