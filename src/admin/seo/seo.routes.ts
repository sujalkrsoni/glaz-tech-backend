import express from "express";
import { SeoController } from "./seo.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, authorize } from "../../middlewares/authMiddleware";

const {
  getPublicSeo,
  createSeo,
  getAllSeos,
  getSeoById,
  updateSeoById,
  deleteSeoById,
} = SeoController;

const router = express.Router();

router
  .get("/public", asyncHandler(getPublicSeo))
  .get("/", authenticateToken, asyncHandler(getAllSeos))
  .post(
    "/",
    authenticateToken,
    authorize("admin"),
    asyncHandler(createSeo)
  )
  .get(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(getSeoById)
  )
  .put(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(updateSeoById)
  )
  .delete(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(deleteSeoById)
  );

export default router;
