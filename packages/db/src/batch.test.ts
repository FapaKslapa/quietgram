import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { runBatch, user } from "#db/client";
import { createTestDb } from "#db/testing";

describe("runBatch", () => {
  it("applies every statement", async () => {
    const db = createTestDb();
    await runBatch(db, [
      db.insert(user).values({ id: "a", name: "a", email: "a@example.com" }),
      db.insert(user).values({ id: "b", name: "b", email: "b@example.com" }),
    ]);
    expect(await db.select().from(user)).toHaveLength(2);
  });

  it("rolls everything back when one statement fails", async () => {
    const db = createTestDb();
    await db.insert(user).values({ id: "a", name: "a", email: "a@example.com" });
    await expect(
      runBatch(db, [
        db.delete(user).where(eq(user.id, "a")),
        db.insert(user).values({ id: "b", name: "b", email: "b@example.com" }),
        db.insert(user).values({ id: "b", name: "b", email: "b2@example.com" }),
      ]),
    ).rejects.toThrow();
    expect((await db.select().from(user)).map((row) => row.id)).toEqual(["a"]);
  });

  it("does nothing for an empty list", async () => {
    await expect(runBatch(createTestDb(), [])).resolves.toBeUndefined();
  });
});
