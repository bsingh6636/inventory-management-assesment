// Largest value an INT UNSIGNED column can hold.
export const MAX_INT = 4294967295;

export class HttpError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Whole number (given as a number or numeric string) within [min, max], otherwise null.
export function toInt(value, min = 0, max = MAX_INT) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// Optional positive-integer query param; rejects anything that isn't one.
export function queryInt(value, name, fallback, max = MAX_INT) {
  if (value === undefined || value === '') return fallback;
  const n = toInt(value, 1, max);
  if (n === null) throw new HttpError(400, `${name} must be a whole number between 1 and ${max}`);
  return n;
}

export function requiredString(value, name, maxLength) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new HttpError(400, `${name} is required`);
  if (s.length > maxLength) throw new HttpError(400, `${name} must be at most ${maxLength} characters`);
  return s;
}

export function optionalString(value, name, maxLength) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new HttpError(400, `${name} must be text`);
  return value.trim() ? requiredString(value, name, maxLength) : null;
}
