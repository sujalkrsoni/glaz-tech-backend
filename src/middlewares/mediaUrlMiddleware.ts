import ApiError from "../utils/ApiError";
import { extractImageUrl, extractImageArray, deleteImageFromS3 } from "../utils/helper";
import mongoose, { Model, Document } from "mongoose";
import { Request, Response, NextFunction } from "express";

type FieldConfigType = "single" | "array" | "multiple";

interface FieldConfig {
  key: string; // e.g. "image", "files"
  type?: FieldConfigType; // default: "single"
  useExtractOnUpdate?: boolean; // only meaningful for "single" & "array"
}

interface AnyRecord extends Document {
  [key: string]: any;
}

/**
 * Factory to handle uploaded media fields (single + array) and normalize them to URLs.
 *
 * - For single fields (type: "single"):
 *    - CREATE:  { image: [{ url: "..." }] } -> image: "..."
 *    - UPDATE:  uses extractImageUrl(newValue, record.image) if configured
 *
 * - For array fields (type: "array"):
 *    - Any of:
 *        files: [{ url: "..." }, { url: "..." }]
 *        files: ["...", "..."]
 *      -> files: ["...", "..."]
 *    - UPDATE:
 *        - use req.body as source of truth (remove missing ones)
 *        - re-use existing URLs where applicable
 *        - use extractImageUrl per item (Promise.all) if configured
 */
export const mediaUrlMiddleware =
  <T extends AnyRecord>(Model: Model<T>, fields: FieldConfig[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      let record: T | null = null;

      // If this is an update route with :id, validate and fetch record
      if (id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json(new ApiError(400, "Invalid document ID"));
        }

        record = await Model.findById(id);
        if (!record)
          return res
            .status(404)
            .json(new ApiError(404, `${Model.modelName} not found`));
      }

      // Process each configured field
      for (const field of fields) {
        const { key, type = "single", useExtractOnUpdate = false } = field;
        const normalizedType = type === "multiple" ? "array" : type;

        const rawValue = (req.body as any)?.[key];

        // Nothing to do if field not present and it's a CREATE
        if (!id && (rawValue == null || rawValue === "")) continue;

        if (normalizedType === "single") {
          // ---- SINGLE FIELD HANDLING ----
          
          // UPDATE case with existing record
          if (id && record) {
            const existingValue = record[key] as string | undefined;
            
            // Always use extractImageUrl for updates to handle deletions properly
            if (useExtractOnUpdate) {
              const finalUrl = await extractImageUrl(rawValue, existingValue);
              (req.body as any)[key] = finalUrl;
            } else {
              // If not using extractOnUpdate, still handle deletion explicitly
              const newUrl =
                Array.isArray(rawValue) && rawValue[0]?.url
                  ? String(rawValue[0].url)
                  : typeof rawValue === "string"
                  ? rawValue
                  : rawValue === null || rawValue === ""
                  ? ""
                  : undefined;
              
              // If explicitly set to null/empty, delete existing
              if ((newUrl === "" || newUrl === null) && existingValue) {
                await deleteImageFromS3(existingValue);
                (req.body as any)[key] = "";
              } else {
                (req.body as any)[key] = newUrl !== undefined ? newUrl : existingValue;
              }
            }
          } else {
            // CREATE case
            const newUrl =
              Array.isArray(rawValue) && rawValue[0]?.url
                ? String(rawValue[0].url)
                : typeof rawValue === "string"
                ? rawValue
                : undefined;
            if (newUrl) (req.body as any)[key] = newUrl;
          }
        } else if (normalizedType === "array") {
          // ---- ARRAY FIELD HANDLING (files: [] -> string[]) ----

          // Normalize rawValue into an array of items (string | object)
          const incomingItems: any[] = Array.isArray(rawValue)
            ? rawValue
            : rawValue
            ? [rawValue]
            : [];

          if (id && record) {
            const existingArray = (record[key] as string[]) || [];

            // If client sends empty array explicitly, treat as deletion of all images
            // If client sends nothing (undefined), keep existing array as-is
            if (rawValue === null || (Array.isArray(rawValue) && rawValue.length === 0 && existingArray.length > 0)) {
              // Use extractImageArray to handle deletion of all images
              const finalUrls = await extractImageArray(rawValue, existingArray);
              (req.body as any)[key] = finalUrls;
              continue;
            }

            // If client sends nothing (undefined), keep existing array as-is
            if (rawValue === undefined && existingArray.length) {
              (req.body as any)[key] = existingArray;
              continue;
            }

            // Use extractImageArray to handle deletions properly
            if (useExtractOnUpdate) {
              const finalUrls = await extractImageArray(incomingItems, existingArray);
              (req.body as any)[key] = finalUrls;
            } else {
              // Manual processing but still detect deletions
              const finalUrls = (
                await Promise.all(
                  incomingItems.map(async (item) => {
                    // Normalize to a "candidate" URL from incoming
                    const candidateUrl =
                      typeof item === "string"
                        ? item
                        : item && typeof item === "object" && item.url
                        ? String(item.url)
                        : undefined;

                    // If we don't even have a candidate, skip it
                    if (!candidateUrl) return undefined;

                    return candidateUrl;
                  })
                )
              ).filter((url): url is string => typeof url === "string" && !!url);

              // Detect and delete removed images
              const removedUrls = existingArray.filter((url) => !finalUrls.includes(url));
              if (removedUrls.length > 0) {
                await Promise.all(removedUrls.map((url) => deleteImageFromS3(url)));
              }

              (req.body as any)[key] = finalUrls;
            }
          } else {
            // CREATE: just normalize to string[]
            const urls: string[] = [];

            for (const item of incomingItems) {
              if (typeof item === "string") {
                urls.push(item);
              } else if (item && typeof item === "object" && item.url) {
                urls.push(String(item.url));
              }
            }

            if (urls.length) (req.body as any)[key] = urls;
          }
        }
      }
      return next();
    } catch (error) {
      console.error("mediaUrlMiddleware error:", error);
      return res.status(500).json(new ApiError(500, "Media handling failed"));
    }
  };
