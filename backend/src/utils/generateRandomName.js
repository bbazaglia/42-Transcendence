export function generateUsername(base = "user") {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${base}_${randomPart}`;
}
