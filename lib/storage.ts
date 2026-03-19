import { mkdir } from "node:fs/promises";
import path from "node:path";

export const SMARTDOC_ROOT = path.join(process.cwd(), ".smartdoc");
export const USER_WORKSPACES_ROOT = path.join(SMARTDOC_ROOT, "users");
export const LEGACY_INDEX_ROOT = path.join(SMARTDOC_ROOT, "indexes");
export const LEGACY_MANIFEST_PATH = path.join(SMARTDOC_ROOT, "manifest.json");
export const LEGACY_CONVERSATIONS_PATH = path.join(
  SMARTDOC_ROOT,
  "conversations.json",
);
export const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

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
  return path.join(PUBLIC_UPLOADS_ROOT, userId);
}

export function resolveUserUploadUrl(userId: string, fileName: string) {
  return `/uploads/${userId}/${fileName}`;
}

export async function ensureSmartDocRoot() {
  await mkdir(SMARTDOC_ROOT, { recursive: true });
}

export async function ensureUserWorkspaceDirectories(userId: string) {
  await mkdir(resolveUserIndexesRoot(userId), { recursive: true });
  await mkdir(resolveUserUploadsRoot(userId), { recursive: true });
}
