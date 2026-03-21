import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

const isVercel = process.env.VERCEL === "1";
export const LEXORA_ROOT = isVercel 
  ? path.join("/tmp", ".lexora") 
  : path.join(process.cwd(), ".lexora");
export const USER_WORKSPACES_ROOT = path.join(LEXORA_ROOT, "users");
export const LEGACY_INDEX_ROOT = path.join(LEXORA_ROOT, "indexes");
export const LEGACY_MANIFEST_PATH = path.join(LEXORA_ROOT, "manifest.json");
export const LEGACY_CONVERSATIONS_PATH = path.join(
  LEXORA_ROOT,
  "conversations.json",
);
export const LEGACY_PUBLIC_UPLOADS_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
);
const SUPABASE_UPLOADS_BUCKET =
  process.env.LEXORA_SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  "";

export function resolveUserWorkspaceRoot(userId: string) {
  return path.join(USER_WORKSPACES_ROOT, userId);
}

export function resolveUserIndexesRoot(userId: string) {
  return path.join(resolveUserWorkspaceRoot(userId), "indexes");
}

export function resolveUserManifestPath(userId: string) {
  return path.join(resolveUserWorkspaceRoot(userId), "manifest.json");
}

export function resolveUserConversationsPath(userId: string) {
  return path.join(resolveUserWorkspaceRoot(userId), "conversations.json");
}

export function resolveUserUploadsRoot(userId: string) {
  return path.join(resolveUserWorkspaceRoot(userId), "uploads");
}

export function resolveUserUploadFilePath(userId: string, fileName: string) {
  return path.join(resolveUserUploadsRoot(userId), fileName);
}

export function resolveUserUploadObjectKey(userId: string, fileName: string) {
  return `${userId}/${fileName}`;
}

export function resolveLegacyPublicUploadsRoot(userId: string) {
  return path.join(LEGACY_PUBLIC_UPLOADS_ROOT, userId);
}

export function resolveLegacyPublicUploadFilePath(
  userId: string,
  fileName: string,
) {
  return path.join(resolveLegacyPublicUploadsRoot(userId), fileName);
}

export function resolveUserUploadUrl(userId: string, fileName: string) {
  return `/uploads/${userId}/${fileName}`;
}

export function isUserUploadUrl(userId: string, fileUrl: string) {
  return fileUrl.startsWith(`/uploads/${userId}/`);
}

export function isSupabaseUploadStorageConfigured() {
  return Boolean(SUPABASE_UPLOADS_BUCKET) && isSupabaseConfigured();
}

export async function ensureLexoraRoot() {
  await mkdir(LEXORA_ROOT, { recursive: true });
}

export async function ensureUserWorkspaceDirectories(userId: string) {
  await mkdir(resolveUserIndexesRoot(userId), { recursive: true });
  await mkdir(resolveUserUploadsRoot(userId), { recursive: true });
}

async function uploadToSupabaseStorage(
  userId: string,
  fileName: string,
  fileContents: Buffer,
  contentType: string,
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !SUPABASE_UPLOADS_BUCKET) {
    return;
  }

  const { error } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .upload(resolveUserUploadObjectKey(userId, fileName), fileContents, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function downloadFromSupabaseStorage(userId: string, fileName: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !SUPABASE_UPLOADS_BUCKET) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .download(resolveUserUploadObjectKey(userId, fileName));

  if (error) {
    if (error.message.toLowerCase().includes("not found")) {
      return null;
    }

    throw error;
  }

  return Buffer.from(await data.arrayBuffer());
}

async function removeFromSupabaseStorage(userId: string, fileName: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !SUPABASE_UPLOADS_BUCKET) {
    return;
  }

  const { error } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .remove([resolveUserUploadObjectKey(userId, fileName)]);

  if (error) {
    throw error;
  }
}

export async function persistUserUpload(
  userId: string,
  fileName: string,
  fileContents: Buffer,
  contentType = "application/pdf",
) {
  const privatePath = resolveUserUploadFilePath(userId, fileName);

  await mkdir(path.dirname(privatePath), { recursive: true });
  await writeFile(privatePath, fileContents);

  if (isSupabaseUploadStorageConfigured()) {
    await uploadToSupabaseStorage(userId, fileName, fileContents, contentType);
  }

  return privatePath;
}

export async function deleteUserUpload(userId: string, fileName: string) {
  const privatePath = resolveUserUploadFilePath(userId, fileName);
  const legacyPath = resolveLegacyPublicUploadFilePath(userId, fileName);

  await rm(privatePath, { force: true });
  await rm(legacyPath, { force: true });

  if (isSupabaseUploadStorageConfigured()) {
    await removeFromSupabaseStorage(userId, fileName);
  }
}

export async function ensurePrivateUploadAvailable(
  userId: string,
  fileName: string,
) {
  const privatePath = resolveUserUploadFilePath(userId, fileName);
  const legacyPath = resolveLegacyPublicUploadFilePath(userId, fileName);

  try {
    await stat(privatePath);
    return privatePath;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  if (isSupabaseUploadStorageConfigured()) {
    const remoteContents = await downloadFromSupabaseStorage(userId, fileName);

    if (remoteContents) {
      await mkdir(path.dirname(privatePath), { recursive: true });
      await writeFile(privatePath, remoteContents);
      return privatePath;
    }
  }

  try {
    await mkdir(path.dirname(privatePath), { recursive: true });
    await copyFile(legacyPath, privatePath);
    await rm(legacyPath, { force: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return privatePath;
    }

    throw error;
  }

  return privatePath;
}
