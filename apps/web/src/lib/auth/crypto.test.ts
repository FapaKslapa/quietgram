import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/auth/crypto";

const key = Buffer.alloc(32, 7).toString("base64");
const otherKey = Buffer.alloc(32, 9).toString("base64");

describe("cookie encryption", () => {
  it("round-trips", async () => {
    const { cipher, iv } = await encrypt("sessionid=secret", key);
    expect(cipher).not.toContain("secret");
    expect(await decrypt(cipher, iv, key)).toBe("sessionid=secret");
  });

  it("rejects a wrong key", async () => {
    const { cipher, iv } = await encrypt("value", key);
    await expect(decrypt(cipher, iv, otherKey)).rejects.toThrow();
  });

  it("uses a fresh iv every time", async () => {
    const first = await encrypt("value", key);
    const second = await encrypt("value", key);
    expect(first.iv).not.toBe(second.iv);
    expect(first.cipher).not.toBe(second.cipher);
  });
});
