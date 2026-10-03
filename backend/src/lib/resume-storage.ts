import { randomUUID } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const storageDirectory = fileURLToPath(
  new URL("../../storage/resumes/", import.meta.url),
);

function getStoragePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.pdf$/i.test(storageKey)) {
    throw new Error("Invalid resume storage key.");
  }

  return join(storageDirectory, storageKey);
}

export async function saveResumeFile(buffer: Buffer): Promise<string> {
  await mkdir(storageDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const storageKey = `${randomUUID()}.pdf`;
  const filePath = getStoragePath(storageKey);

  // Create a new file without overwriting an existing one.
  const handle = await open(filePath, "wx", 0o600);

  try {
    await handle.writeFile(buffer);
    await handle.close();
    return storageKey;
  } catch (error) {
    await handle.close().catch(() => undefined);

    await rm(filePath, { force: true }).catch(() => {
      console.error("Could not remove an incomplete resume upload.");
    });

    throw error;
  }
}

export async function removeResumeFile(storageKey: string): Promise<void> {
  await rm(getStoragePath(storageKey), { force: true });
}