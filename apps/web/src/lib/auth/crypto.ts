const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const importKey = (key: string): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", fromBase64(key), "AES-GCM", false, ["encrypt", "decrypt"]);

export const encrypt = async (
  plain: string,
  key: string,
): Promise<{ cipher: string; iv: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(key),
    new TextEncoder().encode(plain),
  );
  return { cipher: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
};

export const decrypt = async (cipher: string, iv: string, key: string): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await importKey(key),
    fromBase64(cipher),
  );
  return new TextDecoder().decode(decrypted);
};
