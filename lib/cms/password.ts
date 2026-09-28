import { scryptSync, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string) {
  return hash(password, {
    algorithm: 2, // Argon2id; the package's const enum is incompatible with isolatedModules.
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(credential: string, password: string) {
  if (credential.startsWith("$argon2id$")) {
    try {
      return await verify(credential, password);
    } catch {
      return false;
    }
  }
  // Existing installations keep working until their password is changed.
  const [salt, encoded, extra] = credential.split(":");
  if (extra || !/^[a-f0-9]{32,64}$/i.test(salt || "") || !/^[a-f0-9]{128}$/i.test(encoded || ""))
    return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(encoded, "hex"));
}
