import { readFile, writeFile } from "node:fs/promises";
import { createDecipheriv } from "node:crypto";

const [encryptedFile, keyFile, outputFile] = process.argv.slice(2);
if (!encryptedFile || !keyFile || !outputFile) {
  console.error("Usage: node scripts/decrypt-backup.mjs <backup.enc> <private.key> <new-output.tar.gz>");
  process.exit(1);
}

try {
  const keyText = (await readFile(keyFile, "utf8")).trim();
  if (!/^[a-f0-9]{64}$/i.test(keyText)) throw new Error("Invalid backup key file.");
  const header = Buffer.from("CAPILORA_BACKUP_V1\n");
  const file = await readFile(encryptedFile);
  if (file.length < header.length + 28 || !file.subarray(0, header.length).equals(header)) {
    throw new Error("Unsupported or incomplete backup.");
  }
  const offset = header.length;
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyText, "hex"), file.subarray(offset, offset + 12));
  decipher.setAAD(header);
  decipher.setAuthTag(file.subarray(offset + 12, offset + 28));
  // Verify the complete archive before writing any plaintext.
  const archive = Buffer.concat([decipher.update(file.subarray(offset + 28)), decipher.final()]);
  await writeFile(outputFile, archive, { flag: "wx", mode: 0o600 });
  console.log("Backup verified and decrypted. No existing file was overwritten.");
} catch (error) {
  console.error(error?.code === "EEXIST"
    ? "Output already exists. Choose a new filename; existing data was preserved."
    : "Backup could not be decrypted. Check the key, file integrity and output directory.");
  process.exitCode = 1;
}
