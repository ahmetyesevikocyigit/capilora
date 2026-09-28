import { client } from "../lib/cms/db";
import { convertUploadedImages } from "../lib/cms/convert-uploads";

async function main() {
  try {
    console.log(JSON.stringify(await convertUploadedImages(), null, 2));
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Dönüşüm tamamlanamadı.");
  process.exitCode = 1;
});
