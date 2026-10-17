import { randomUUID } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storageDirectory = fileURLToPath(
  new URL("../../storage/resumes/", import.meta.url),
);

let supabaseClient: SupabaseClient | undefined;

function usesSupabase(): boolean {
  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";

  if (provider !== "local" && provider !== "supabase") {
    throw new Error("Invalid RESUME_STORAGE_PROVIDER.");
  }

  return provider === "supabase";
}

function getBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !key || !bucket) {
    throw new Error("Supabase storage configuration is incomplete.");
  }

  supabaseClient ??= createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient.storage.from(bucket);
}

function validateStorageKey(storageKey: string): void {
  if (!/^[0-9a-f-]{36}\.pdf$/i.test(storageKey)) {
    throw new Error("Invalid resume storage key.");
  }
}

function validateSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_SIZE) {
    throw new Error("Stored resume size is invalid.");
  }
}

function getStoragePath(storageKey: string): string {
  validateStorageKey(storageKey);
  return join(storageDirectory, storageKey);
}

export async function saveResumeFile(buffer: Buffer): Promise<string> {
  validateSize(buffer.length);
  const storageKey = `${randomUUID()}.pdf`;

  if (usesSupabase()) {
    const { error } = await getBucket().upload(storageKey, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (error) {
      throw new Error("Could not upload resume to storage.", {
        cause: error,
      });
    }

    return storageKey;
  }

  await mkdir(storageDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const filePath = getStoragePath(storageKey);
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
  validateStorageKey(storageKey);

  if (usesSupabase()) {
    const { error } = await getBucket().remove([storageKey]);

    if (error) {
      throw new Error("Could not delete resume from storage.", {
        cause: error,
      });
    }

    return;
  }

  await rm(getStoragePath(storageKey), { force: true });
}

export async function readResumeFile(
  storageKey: string,
  expectedSize: number,
): Promise<Buffer> {
  validateStorageKey(storageKey);
  validateSize(expectedSize);

  if (usesSupabase()) {
    const { data, error } = await getBucket().download(storageKey);

    if (error || !data) {
      throw new Error("Could not read resume from storage.", {
        cause: error,
      });
    }

    validateSize(data.size);

    if (data.size !== expectedSize) {
      throw new Error("Stored resume size is invalid.");
    }

    return Buffer.from(await data.arrayBuffer());
  }

  const handle = await open(getStoragePath(storageKey), "r");

  try {
    const stats = await handle.stat();

    if (!stats.isFile() || stats.size !== expectedSize) {
      throw new Error("Stored resume size is invalid.");
    }

    validateSize(stats.size);

    const buffer = Buffer.alloc(stats.size);
    let offset = 0;

    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );

      if (bytesRead === 0) {
        throw new Error("The stored resume is incomplete.");
      }

      offset += bytesRead;
    }

    const extra = Buffer.alloc(1);
    const { bytesRead } = await handle.read(extra, 0, 1, offset);

    if (bytesRead !== 0) {
      throw new Error("The stored resume changed while being read.");
    }

    return buffer;
  } finally {
    await handle.close();
  }
}