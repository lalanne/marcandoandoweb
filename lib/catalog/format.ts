/** Chilean pesos with a dot as thousands separator: 7000 becomes "$7.000". */
export function formatClp(amount: number): string {
  return `$${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
