export const initialsOf = (username: string): string => {
  const parts = username.split(/[._\s-]+/).filter((part) => part.length > 0);
  const [first = "", second = ""] = parts;
  const letters = second ? `${first.charAt(0)}${second.charAt(0)}` : first.slice(0, 2);
  return letters.toUpperCase();
};
