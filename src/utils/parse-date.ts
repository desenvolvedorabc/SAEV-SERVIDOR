export function parseDate(str) {
  var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return (m) ? `${m[3]}-${m[2]}-${m[1]}` : null;
}