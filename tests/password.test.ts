import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, scryptSync } from "node:crypto";
import { hashPassword, verifyPassword } from "../lib/cms/password";

test("new password hashes use independent salts and verify only the matching password", async () => {
  const password = "disposable-fixture-password";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.match(first, /^\$argon2id\$/);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(first, password), true);
  assert.equal(await verifyPassword(first, "different-password"), false);
});

test("legacy credentials still work and malformed hashes fail closed", async () => {
  const password = "legacy-fixture-password";
  const salt = randomBytes(32).toString("hex");
  const legacy = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  assert.equal(await verifyPassword(legacy, password), true);
  assert.equal(await verifyPassword(legacy, "wrong"), false);
  for (const value of ["", "broken", "salt:hash", legacy + ":extra", "$argon2id$broken"])
    assert.equal(await verifyPassword(value, password), false);
});
