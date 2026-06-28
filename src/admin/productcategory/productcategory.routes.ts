import express from "express";
import { ProductCategoryController } from "./productcategory.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, authorize } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { ProductCategory } from "../../modals/productcategory.model";
import { mediaUrlMiddleware } from "../../middlewares/mediaUrlMiddleware";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
} = ProductCategoryController;

const ProductCategoryService = new CommonService(ProductCategory);

const router = express.Router();

// Public endpoint to get all active categories
router.get("/public/list", asyncHandler(getAllCategories));

// Public endpoint to get category by slug
router.get("/public/:slug", asyncHandler(async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await ProductCategoryService.getAll({ slug, status: "active" });
    if (!category || category.result?.length === 0) {
      return res.status(404).json(new ApiError(404, "Category not found"));
    }
    return res.status(200).json(new ApiResponse(200, category.result[0], "Category fetched successfully"));
  } catch (err) {
    next(err);
  }
}));

router
  .get("/", authenticateToken, asyncHandler(getAllCategories))
  .post(
    "/",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("product-category"),
    asyncHandler(
      mediaUrlMiddleware(ProductCategory, [{ key: "image", type: "single" }])
    ),
    asyncHandler(createCategory)
  )
  .get(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(getCategoryById)
  )
  .put(
    "/:id",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("product-category"),
    asyncHandler(
      mediaUrlMiddleware(ProductCategory, [
        { key: "image", type: "single", useExtractOnUpdate: true },
      ])
    ),
    asyncHandler(updateCategoryById)
  )
  .delete(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(deleteCategoryById)
  );

export default router;
