import mongoose, { Document, Schema } from "mongoose";
import slugify from "slugify";

export enum ProductCategoryStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IProductCategory extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  image?: string;
  status: ProductCategoryStatus;
  priority: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productCategorySchema = new Schema<IProductCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    shortDescription: { type: String },
    longDescription: { type: String },
    image: { type: String },
    status: {
      type: String,
      default: ProductCategoryStatus.ACTIVE,
      enum: Object.values(ProductCategoryStatus),
    },
    priority: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
  },
  { timestamps: true }
);

// Pre-save hook to generate slug from name
productCategorySchema.pre<IProductCategory>("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const ProductCategory = mongoose.model<IProductCategory>(
  "ProductCategory",
  productCategorySchema
);
