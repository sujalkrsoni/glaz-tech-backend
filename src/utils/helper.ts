import mongoose from "mongoose";
import { toBoolean } from "validator";
import { deleteFromS3 } from "../config/s3Uploader";

const { ObjectId } = mongoose.Types;

/**
 * @param {Record<string, any>} query - Query filters with pagination, search, projection, sort
 * @param {Array|Object} additionalStages - Optional extra aggregation stages
 * @returns {Object} - { pipeline, matchStage, options }
 */
export const getPipeline = (
  query: Record<string, any>,
  additionalStages?: any[] | Record<string, any>
) => {
  const {
    page = 1,
    limit = 10,
    pagination = "true",

    search = "",
    searchkey = "",
    searchOperator = "or", // 'or' | 'and'

    // Sorting
    multiSort = "", // "field1:asc,field2:desc"
    sortDir = "desc",
    sortKey = "createdAt",

    // Projection
    fields = "",
    exclude = "",

    // Special filters
    exists = "",
    notExists = "",

    ...filters
  } = query;

  const pageNumber = Math.max(parseInt(page, 10), 1);
  const limitNumber = Math.max(parseInt(limit, 10), 1);
  const basePipeline: any[] = [];
  const match: Record<string, any> = {};

  // pull out start/end date filters (default to createdAt)
  const startDateFilter = filters.startDate;
  const endDateFilter = filters.endDate;
  delete (filters as any).startDate;
  delete (filters as any).endDate;

  // ==========================================
  // 🔧 HELPER FUNCTIONS
  // ==========================================

  /**
   * Safely convert to ObjectId if valid
   */
  const safeObjectId = (val: any): mongoose.Types.ObjectId | any => {
    if (typeof val === "string" && ObjectId.isValid(val)) {
      return new ObjectId(val);
    }
    return val;
  };

  /**
   * Check if value is truly empty (null, undefined, empty string)
   */
  const isEmpty = (val: any): boolean => {
    return val === null || val === undefined || val === "";
  };

  /**
   * Parse string to appropriate type
   */
  const parseValue = (value: any): any => {
    if (isEmpty(value)) return null;

    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // Number
    if (!isNaN(value) && value !== "" && typeof value !== "boolean") {
      return Number(value);
    }

    // Date (ISO format)
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    }

    // ObjectId
    if (typeof value === "string" && ObjectId.isValid(value)) {
      return safeObjectId(value);
    }

    // Array (comma-separated)
    if (typeof value === "string" && value.includes(",")) {
      return value.split(",").map((v) => parseValue(v.trim()));
    }

    return value;
  };

  /**
   * Handle special operators in field names
   * Examples: price__gte, status__in, createdAt__exists
   */
  const parseFieldOperator = (
    key: string,
    value: any
  ): { field: string; operator: string; value: any } => {
    const parts = key.split("__");
    const field = parts[0];
    const operator = parts[1] || "eq";

    const parsedValue = parseValue(value);

    switch (operator) {
      case "in":
        return {
          field,
          operator: "$in",
          value: Array.isArray(parsedValue) ? parsedValue : [parsedValue],
        };
      case "nin":
        return {
          field,
          operator: "$nin",
          value: Array.isArray(parsedValue) ? parsedValue : [parsedValue],
        };
      case "gte":
        return { field, operator: "$gte", value: parsedValue };
      case "gt":
        return { field, operator: "$gt", value: parsedValue };
      case "lte":
        return { field, operator: "$lte", value: parsedValue };
      case "lt":
        return { field, operator: "$lt", value: parsedValue };
      case "ne":
        return { field, operator: "$ne", value: parsedValue };
      case "exists":
        return { field, operator: "$exists", value: parsedValue === true };
      case "regex":
        return {
          field,
          operator: "$regex",
          value: new RegExp(value, "i"),
        };
      default:
        return { field, operator: "eq", value: parsedValue };
    }
  };

  /**
   * Set nested match dynamically with multi-level support
   * Supports: user.profile.name, items.0.price, tags.*
   */
  const setNestedMatch = (
    obj: any,
    key: string,
    operator: string,
    value: any
  ) => {
    const keys = key.split(".");
    let current = obj;

    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        // Last key - apply the value
        if (operator === "eq") {
          // For string values, use case-insensitive regex
          if (typeof value === "string" && operator === "eq") {
            current[k] = { $regex: new RegExp(`^${value}$`, "i") };
          } else {
            current[k] = value;
          }
        } else {
          // For other operators
          current[k] = { [operator]: value };
        }
      } else {
        // Nested path - create if doesn't exist
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }
    });
  };

  // ==========================================
  // 🔍 BUILD MATCH STAGE
  // ==========================================

  if (startDateFilter || endDateFilter) {
    const createdAtRange: any = {};
    const parsedStart = parseValue(startDateFilter);
    const parsedEnd = parseValue(endDateFilter);
    if (parsedStart) createdAtRange.$gte = parsedStart;
    if (parsedEnd) createdAtRange.$lte = parsedEnd;
    if (Object.keys(createdAtRange).length > 0) {
      match.createdAt = createdAtRange;
    }
  }

  // Process all dynamic filters
  for (const key in filters) {
    const value = filters[key];

    if (isEmpty(value)) continue;

    const {
      field,
      operator,
      value: parsedValue,
    } = parseFieldOperator(key, value);

    setNestedMatch(match, field, operator, parsedValue);
  }

  // Exists/Not Exists
  if (exists) {
    exists.split(",").forEach((field: string) => {
      setNestedMatch(match, field.trim(), "$exists", true);
    });
  }

  if (notExists) {
    notExists.split(",").forEach((field: string) => {
      setNestedMatch(match, field.trim(), "$exists", false);
    });
  }

  // Add match stage if there are filters
  if (Object.keys(match).length > 0) {
    basePipeline.push({ $match: match });
  }

  // ==========================================
  // 🔗 ADDITIONAL STAGES (Lookups, etc.)
  // ==========================================
  if (Array.isArray(additionalStages)) {
    basePipeline.push(...additionalStages);
  } else if (additionalStages && typeof additionalStages === "object") {
    basePipeline.push(additionalStages);
  }

  // ==========================================
  // 🔎 ADVANCED SEARCH
  // ==========================================
  if (search && searchkey) {
    const keys = searchkey
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean);

    if (keys.length > 0) {
      const searchConditions = keys.map((k: any) => ({
        [k]: { $regex: search, $options: "i" },
      }));

      const searchQuery =
        searchOperator === "and"
          ? { $and: searchConditions }
          : { $or: searchConditions };

      basePipeline.push({ $match: searchQuery });
    }
  }

  // ==========================================
  // 📋 PROJECTION
  // ==========================================
  if (fields || exclude) {
    const projectFields: any = {};

    // Include specific fields
    if (fields) {
      fields.split(",").forEach((f: string) => {
        const field = f.trim();
        if (field) projectFields[field] = 1;
      });
    }

    // Exclude specific fields
    if (exclude) {
      exclude.split(",").forEach((f: string) => {
        const field = f.trim();
        if (field) projectFields[field] = 0;
      });
    }

    if (Object.keys(projectFields).length > 0) {
      basePipeline.push({ $project: projectFields });
    }
  }

  // ==========================================
  // 📊 SORTING
  // ==========================================
  const sortStage: Record<string, 1 | -1> = {};

  // Multi-field sorting: "price:asc,createdAt:desc"
  if (multiSort) {
    multiSort.split(",").forEach((s: string) => {
      const [field, direction] = s.trim().split(":");
      if (field) {
        sortStage[field] = direction === "asc" ? 1 : -1;
      }
    });
  } else {
    // Single field sorting
    sortStage[sortKey] = sortDir === "asc" ? 1 : -1;
  }

  basePipeline.push({ $sort: sortStage });

  // ==========================================
  // 📄 PAGINATION
  // ==========================================
  let pipeline: any[] = [];

  if (toBoolean(pagination.toString())) {
    pipeline = [
      ...basePipeline,
      {
        $facet: {
          data: [
            { $skip: (pageNumber - 1) * limitNumber },
            { $limit: limitNumber },
          ],
          metadata: [
            { $count: "total" },
            {
              $addFields: {
                page: pageNumber,
                limit: limitNumber,
                totalPages: {
                  $ceil: { $divide: ["$total", limitNumber] },
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
          page: { $ifNull: [{ $arrayElemAt: ["$metadata.page", 0] }, 1] },
          limit: {
            $ifNull: [{ $arrayElemAt: ["$metadata.limit", 0] }, limitNumber],
          },
          totalPages: {
            $ifNull: [{ $arrayElemAt: ["$metadata.totalPages", 0] }, 0],
          },
        },
      },
    ];
  } else {
    pipeline = [...basePipeline];
  }

  // ==========================================
  // 🎯 RETURN PIPELINE
  // ==========================================
  return {
    pipeline,
    matchStage: match,
    options: {
      collation: { locale: "en", strength: 2 },
      allowDiskUse: true,
    },
  };
};

/**
 * 🟢 Format the result with pagination info
 * @param {number} pageNumber - Current page number
 * @param {number} limitNumber - Number of items per page
 * @param {number} totalResults - Total number of items
 * @param {Array<any>} results - The result set
 * @returns {Object} - The paginated result with pagination metadata
 */
export const paginationResult = (
  pageNumber: number,
  limitNumber: number,
  totalResults: number,
  results: any[]
) => {
  return {
    result: results,
    pagination: {
      currentPage: pageNumber,
      totalItems: totalResults,
      itemsPerPage: limitNumber,
      totalPages: Math.ceil(totalResults / limitNumber),
    },
  };
};

/**
 * 🟢 Convert a string to a valid MongoDB ObjectId
 * @param {string} id - The string to convert
 * @returns {ObjectId | null} - The ObjectId or null if invalid
 */
export const convertToObjectId = (
  id: string
): mongoose.Types.ObjectId | null => {
  try {
    return new ObjectId(id);
  } catch (error) {
    console.log("Invalid ObjectId:", error);
    return null;
  }
};

/**
 * 🟢 Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidObjectId = (id: string): boolean => {
  try {
    return ObjectId.isValid(id);
  } catch (error) {
    return false;
  }
};

/**
 * 🟢 Check if a string is a valid UUID
 * @param {string} uuid - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 🟢 Check if a string is a valid email
 * @param {string} email - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * 🟢 Check if a string is a valid URL
 * @param {string} url - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidURL = (url: string): boolean => {
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/[^\s]*)?$/;
  return urlRegex.test(url);
};

/**
 * 🟢 Check if a string is a valid phone number
 * @param {string} phone - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone);
};

/**
 * 🟢 Check if a string is a valid date
 * @param {string} date - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
  if (!dateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * 🟢 Check if a string is a valid time
 * @param {string} time - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
  return timeRegex.test(time);
};

/**
 * 🟢 Check if a string is a valid datetime
 * @param {string} datetime - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDateTime = (datetime: string): boolean => {
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/; // ISO 8601 format
  return datetimeRegex.test(datetime);
};

/**
 * 🟢 Check if a string is a valid JSON
 * @param {string} jsonString - The string to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Extracts S3 key from a full URL
 * Handles different URL formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://baseUrl/bucket/key
 * - http://localhost:9000/bucket/key (MinIO)
 */
export const extractS3KeyFromUrl = (url: string): string | null => {
  if (!url || typeof url !== "string") return null;
  
  try {
    // Handle standard S3 URLs: https://bucket.s3.region.amazonaws.com/key
    if (url.includes(".s3.") && url.includes(".amazonaws.com/")) {
      const parts = url.split(".amazonaws.com/");
      if (parts.length > 1) return parts[1];
    }
    
    // Handle custom baseUrl (MinIO, Wasabi, etc.): https://baseUrl/bucket/key
    // Extract everything after the bucket name
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      // Skip bucket name, return the rest
      return pathParts.slice(1).join("/");
    }
    
    // Fallback: try to extract after .com/ or last /
    const match = url.match(/(?:\.com\/|:\/\/[^\/]+\/)(.+)$/);
    if (match && match[1]) return match[1];
    
    return null;
  } catch (error) {
    console.error("Error extracting S3 key:", error);
    return null;
  }
};

/**
 * Deletes image from S3 if URL is a valid S3 URL
 */
export const deleteImageFromS3 = async (url: string | null | undefined): Promise<void> => {
  if (!url || typeof url !== "string") return;
  
  // Only delete if it's an S3 URL (not blob URLs or local URLs)
  if (url.startsWith("blob:") || url.startsWith("data:") || !url.includes("http")) {
    return;
  }
  
  const s3Key = extractS3KeyFromUrl(url);
  if (s3Key) {
    try {
      await deleteFromS3(s3Key);
    } catch (error) {
      console.error(`Failed to delete image from S3: ${url}`, error);
      // Don't throw - allow update to continue even if S3 delete fails
    }
  }
};

/**
 * Extracts image URL and handles deletion of old images
 * - If input is null/empty and existing exists: delete existing from S3, return empty
 * - If input is new and different from existing: delete existing from S3, return new
 * - If input is same as existing: return existing (no deletion)
 */
export const extractImageUrl = async (input: any, existing: string | null | undefined): Promise<string> => {
  // Handle deletion: if input is explicitly null/empty and existing exists
  const isDeletion = (
    input === null || 
    input === undefined || 
    input === "" ||
    (Array.isArray(input) && input.length === 0) ||
    (Array.isArray(input) && input.length === 1 && (input[0] === null || input[0] === "" || input[0]?.url === null || input[0]?.url === ""))
  );
  
  if (isDeletion) {
    // Delete existing image from S3 if it exists
    if (existing) {
      await deleteImageFromS3(existing);
    }
    return "";
  }
  
  // Extract new URL from input
  let newUrl: string | undefined;
  
  if (Array.isArray(input) && input.length > 0) {
    newUrl = input[0]?.url || (typeof input[0] === "string" ? input[0] : undefined);
  } else if (typeof input === "string") {
    newUrl = input;
  } else if (input && typeof input === "object" && input.url) {
    newUrl = input.url;
  }
  
  // If new URL is different from existing, delete the old one
  if (existing && newUrl && existing !== newUrl) {
    await deleteImageFromS3(existing);
  }
  
  return newUrl || existing || "";
};

/**
 * Handles array of images - detects deletions and removes them from S3
 * Returns the final array of URLs and deletes removed images from S3
 */
export const extractImageArray = async (
  input: any,
  existing: string[] | null | undefined
): Promise<string[]> => {
  const existingArray = existing || [];
  
  // Normalize input to array of URLs
  let incomingUrls: string[] = [];
  
  if (Array.isArray(input)) {
    incomingUrls = input
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.url) return item.url;
        return null;
      })
      .filter((url): url is string => url !== null && url !== "");
  } else if (input && typeof input === "string") {
    incomingUrls = [input];
  }
  
  // Find images that were removed (exist in existing but not in incoming)
  const removedUrls = existingArray.filter((url) => !incomingUrls.includes(url));
  
  // Delete removed images from S3
  await Promise.all(removedUrls.map((url) => deleteImageFromS3(url)));
  
  return incomingUrls;
};
