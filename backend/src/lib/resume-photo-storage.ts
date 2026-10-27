import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const MAX_BYTES = 512 * 1024;

const directory = fileURLToPath(
  new URL("../../storage/resume-photos/", import.meta.url),
);

let client: SupabaseClient | undefined;

export class InvalidResumePhotoError extends Error {}

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
  const bucket = process.env.RESUME_PHOTO_STORAGE_BUCKET;

  if (!url || !key || !bucket) {
    throw new Error("Resume photo storage is not configured.");
  }

  client ??= createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client.storage.from(bucket);
}

function validateKey(key: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i.test(
      key,
    )
  ) {
    throw new Error("Invalid photo storage key.");
  }
}

export async function prepareResumePhoto(
  dataUrl: string,
): Promise<Buffer> {
  const prefix = "data:image/jpeg;base64,";

  if (
    !dataUrl.startsWith(prefix) ||
    dataUrl.length > 700000
  ) {
    throw new InvalidResumePhotoError(
      "Please crop your photo again before saving.",
    );
  }

  const encoded = dataUrl.slice(prefix.length);

  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    throw new InvalidResumePhotoError("Invalid photo data.");
  }

  const input = Buffer.from(encoded, "base64");

  if (
    input.length > MAX_BYTES ||
    input.toString("base64") !== encoded
  ) {
    throw new InvalidResumePhotoError("Invalid or oversized photo.");
  }

  try {
    const metadata = await sharp(input, {
      limitInputPixels: 1000000,
      failOn: "warning",
    }).metadata();

    if (
      metadata.format !== "jpeg" ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 1000 ||
      metadata.height > 1000
    ) {
      throw new Error("Unsupported image.");
    }

    const output = await sharp(input, {
      limitInputPixels: 1000000,
      failOn: "warning",
    })
      .rotate()
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();

    if (output.length > MAX_BYTES) {
      throw new Error("Oversized output.");
    }

    return output;
  } catch {
    throw new InvalidResumePhotoError(
      "Unable to process this photo. Choose and crop it again.",
    );
  }
}

export async function saveResumePhoto(
  buffer: Buffer,
): Promise<string> {
  const key = `${randomUUID()}.jpg`;

  if (usesSupabase()) {
    const { error } = await getBucket().upload(key, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (error) {
      throw new Error("Could not save the resume photo.");
    }

    return key;
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });

  try {
    await writeFile(join(directory, key), buffer, {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    await rm(join(directory, key), { force: true }).catch(
      () => undefined,
    );
    throw error;
  }

  return key;
}

export async function readResumePhoto(
  key: string,
): Promise<string> {
  validateKey(key);

  let buffer: Buffer;

  if (usesSupabase()) {
    const { data, error } = await getBucket().download(key);

    if (error || !data || data.size > MAX_BYTES) {
      throw new Error("Could not load the resume photo.");
    }

    buffer = Buffer.from(await data.arrayBuffer());
  } else {
    buffer = await readFile(join(directory, key));
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new Error("Stored resume photo is invalid.");
  }

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export async function removeResumePhoto(
  key: string,
): Promise<void> {
  validateKey(key);

  if (usesSupabase()) {
    const { error } = await getBucket().remove([key]);

    if (error) {
      throw new Error("Could not remove the old resume photo.");
    }

    return;
  }

  await rm(join(directory, key), { force: true });
}