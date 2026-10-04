import { timingSafeEqual } from "node:crypto";

const normalize = (email: string): string => email.trim().toLowerCase();

export const isAllowed = (email: string, allowed: string): boolean => {
  const target = normalize(email);
  return target !== "" && allowed.split(",").some((entry) => normalize(entry) === target);
};

const sameSecret = (candidate: string, expected: string): boolean => {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const canBootstrap = (
  request: { email: string; secret: string | null },
  config: { allowedEmails: string; bootstrapSecret: string },
): boolean =>
  request.secret !== null &&
  isAllowed(request.email, config.allowedEmails) &&
  sameSecret(request.secret, config.bootstrapSecret);
