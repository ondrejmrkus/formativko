export function getStudentDisplayName(s: { first_name: string; last_name: string }) {
  return s.last_name ? `${s.first_name} ${s.last_name.charAt(0)}.` : s.first_name;
}

export function getStudentShortName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name.charAt(0)}.`;
}
