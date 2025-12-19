export function lamportsToSol(lamports: number, decimals = 5) {
  return (lamports / 1_000_000_000).toFixed(decimals);
}

export function shortPk(s: string, left = 4, right = 4) {
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}
