import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  name: string;
  email?: string;
  phone: string;
  product?: mongoose.Types.ObjectId;
  subject?: string;
  message?: string;
  status: "pending" | "contacted" | "resolved";
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    subject: { type: String },
    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "contacted", "resolved"],
      default: "pending",
    },
    source: { type: String, default: "website" },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model<IInquiry>("Inquiry", InquirySchema);
