import { type credentialStatuses, type Db, igCredentials } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { decrypt, encrypt } from "@/lib/auth/crypto";

export type CredentialState = (typeof credentialStatuses)[number];

export type CredentialInput = {
  username: string;
  password: string;
  totpSecret?: string | undefined;
};

export type CredentialStatus = {
  configured: boolean;
  username: string | null;
  state: CredentialState | null;
};

export type StoredCredentials = { input: CredentialInput; state: CredentialState };

const payloadSchema = z.compile(
  z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    totpSecret: z.string().optional(),
  }),
);

export const saveCredentials = async (
  db: Db,
  cookieKey: string,
  ownerId: string,
  input: CredentialInput,
  now: Date,
): Promise<void> => {
  const { cipher, iv } = await encrypt(JSON.stringify(input), cookieKey);
  const values = { username: input.username, cipher, iv, status: "ready" as const, updatedAt: now };
  await db
    .insert(igCredentials)
    .values({ ownerId, ...values })
    .onConflictDoUpdate({ target: igCredentials.ownerId, set: values });
};

export const removeCredentials = async (db: Db, ownerId: string): Promise<void> => {
  await db.delete(igCredentials).where(eq(igCredentials.ownerId, ownerId));
};

export const setCredentialState = async (
  db: Db,
  ownerId: string,
  status: CredentialState,
  now: Date,
): Promise<void> => {
  await db
    .update(igCredentials)
    .set({ status, updatedAt: now })
    .where(eq(igCredentials.ownerId, ownerId));
};

export const loadCredentialStatus = async (db: Db, ownerId: string): Promise<CredentialStatus> => {
  const [row] = await db
    .select({ username: igCredentials.username, status: igCredentials.status })
    .from(igCredentials)
    .where(eq(igCredentials.ownerId, ownerId));
  return row
    ? { configured: true, username: row.username, state: row.status }
    : { configured: false, username: null, state: null };
};

export const loadCredentials = async (
  db: Db,
  cookieKey: string,
  ownerId: string,
): Promise<StoredCredentials | null> => {
  const [row] = await db.select().from(igCredentials).where(eq(igCredentials.ownerId, ownerId));
  if (!row) return null;
  try {
    const parsed = payloadSchema.parse(JSON.parse(await decrypt(row.cipher, row.iv, cookieKey)));
    const input: CredentialInput = { username: parsed.username, password: parsed.password };
    if (parsed.totpSecret) input.totpSecret = parsed.totpSecret;
    return { input, state: row.status };
  } catch {
    return null;
  }
};
