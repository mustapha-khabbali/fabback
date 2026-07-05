export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const telRegex = /^(06|07)\d{8}$/;

export function validateEmail(email) {
  return emailRegex.test(email);
}

export function validatePhone(tel) {
  return telRegex.test(tel);
}
