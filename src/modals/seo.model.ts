import mongoose, { Schema, Document } from "mongoose";

export interface ISEO extends Document {
  pageType: string;
  slug: string;
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  isIndexed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seoSchema = new Schema<ISEO>(
  {
    pageType: {
      type: String,
      required: [true, "pageType is required"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "slug is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      trim: true,
    },
    keywords: {
      type: String,
      default: "",
      trim: true,
    },
    canonical: {
      type: String,
      trim: true,
    },
    isIndexed: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true
  }
);

// Unique constraint: One SEO entry per pageType + slug combination
seoSchema.index({ pageType: 1, slug: 1 }, { unique: true });

const SEO = mongoose.model<ISEO>("Seo", seoSchema);

export default SEO;