import express from "express";
import { InquiryController } from "./inquiry.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, authorize } from "../../middlewares/authMiddleware";

const {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryById,
  deleteInquiryById,
} = InquiryController;

const router = express.Router();

router
.post("/", asyncHandler(createInquiry)) // Public can post inquiries
  .get("/", authenticateToken, authorize("admin"), asyncHandler(getAllInquiries))
  .get("/:id", authenticateToken, authorize("admin"), asyncHandler(getInquiryById))
  .put("/:id", authenticateToken, authorize("admin"), asyncHandler(updateInquiryById))
  .delete("/:id", authenticateToken, authorize("admin"), asyncHandler(deleteInquiryById));

export default router;
