import crypto from "crypto";
import { config } from "../config/config";

const ENC_PREFIX = "enc:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const isHex = (value: string) => /^[0-9a-fA-F]+$/.test(value);

const resolveKey = () => {
  const raw = config.chat?.messageKey || "";
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;

  let buffer: Buffer;
  if (normalized.length === 64 && isHex(normalized)) {
    buffer = Buffer.from(normalized, "hex");
  } else {
    buffer = Buffer.from(normalized, "base64");
  }

  if (buffer.length !== 32) {
    throw new Error("MESSAGE_ENCRYPTION_KEY must be 32 bytes");
  }

  return buffer;
};

export const isEncrypted = (value?: string) =>
  Boolean(value && value.startsWith(ENC_PREFIX));

export const encryptMessage = (value?: string) => {
  if (!value) return value || "";
  if (isEncrypted(value)) return value;
  const key = resolveKey();
  if (!key) return value;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("base64")}.${tag.toString(
    "base64"
  )}.${encrypted.toString("base64")}`;
};

export const decryptMessage = (value?: string) => {
  if (!value) return value || "";
  if (!isEncrypted(value)) return value;
  const key = resolveKey();
  if (!key) return value;

  const payload = value.slice(ENC_PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) return value;

  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const data = Buffer.from(dataPart, "base64");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) return value;

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
};
