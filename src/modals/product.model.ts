import mongoose, { Document, Schema } from "mongoose";
import slugify from "slugify";

export enum ProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  category: mongoose.Types.ObjectId;
  shortDescription?: string;
  longDescription?: string;
  mainImage?: string;
  images?: string[];
  sku?: string;
  details?: {
    heading?: string;
    name?: string;
    image?: string;
    description?: string;
    features?: string[];
  }[];
  status: ProductStatus;
  priority: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    shortDescription: { type: String },
    longDescription: { type: String },
    mainImage: { type: String },
    images: [{ type: String }],
    sku: { type: String, unique: true, sparse: true },
    details: [
      {
        heading: { type: String },
        name: { type: String },
        image: { type: String },
        description: { type: String },
        features: [{ type: String }],
      },
    ],
    status: {
      type: String,
      default: ProductStatus.ACTIVE,
      enum: Object.values(ProductStatus),
    },
    priority: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
  },
  { timestamps: true }
);

// Pre-save hook to generate slug from name
productSchema.pre<IProduct>("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
