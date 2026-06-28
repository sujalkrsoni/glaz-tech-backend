import mongoose, { Schema, Document, model } from "mongoose";

/**
 * FAQ Schema & Interface
 */
export interface IFaq extends Document {
  answer: string;
  createdAt: Date;
  updatedAt: Date;
  question: string;
}

const FaqSchema = new Schema<IFaq>(
  {
    answer: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Faq = mongoose.models.Faq || model<IFaq>("Faq", FaqSchema);
