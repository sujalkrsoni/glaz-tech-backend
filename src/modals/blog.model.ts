import slugify from "slugify";
import mongoose, { Document, Schema, Model, model } from "mongoose";

// 1. Interface for the blog document
export interface IBlog extends Document {
  title: string;
  slug: string;
  meta_title?: string;
  description: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Schema definition
const BlogSchema: Schema<IBlog> = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
    },
    meta_title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// 3. Pre-save hook for slug generation
BlogSchema.pre<IBlog>("save", function (next) {
  if (this.isNew || this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// 4. Export model with type safety and hot-reload support
export const Blog: Model<IBlog> =
  mongoose.models.Blog || model<IBlog>("Blog", BlogSchema);
