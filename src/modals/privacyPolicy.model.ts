import mongoose, { Schema, Document, model } from "mongoose";

export interface IPrivacyPolicy extends Document {
  title: string;
  content: string;
  version?: string;
  isActive: boolean;
  effectiveFrom?: Date;
}

const PrivacyPolicySchema = new Schema<IPrivacyPolicy>(
  {
    effectiveFrom: { type: Date },
    version: { type: String, trim: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    title: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const PrivacyPolicy =
  mongoose.models.PrivacyPolicy ||
  model<IPrivacyPolicy>("PrivacyPolicy", PrivacyPolicySchema);
