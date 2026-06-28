import express from "express";
import { ProductController } from "./product.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, authorize } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { Product } from "../../modals/product.model";
import { mediaUrlMiddleware } from "../../middlewares/mediaUrlMiddleware";
import { CommonService } from "../../services/common.services";

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProductById,
  deleteProductById,
} = ProductController;

const ProductService = new CommonService(Product);

/**
 * Custom middleware to handle mapping of detailsImages to details[i].image
 * This assumes the frontend sends files in 'detailsImages' field
 * and we match them by index to the 'details' array objects.
 */
const productMediaMapper = (req: any, res: any, next: any) => {
  if (typeof req.body.details === "string") {
    try {
      req.body.details = JSON.parse(req.body.details);
    } catch (e) {
      req.body.details = [];
    }
  }

  if (Array.isArray(req.body.details)) {
    let imageIndex = 0;
    const detailsImages = Array.isArray(req.body.detailsImages) ? req.body.detailsImages : [];

    req.body.details = req.body.details.map((detail: any) => {
      if (detail.hasNewImage && detailsImages[imageIndex]) {
        const uploadedImg = detailsImages[imageIndex++];
        detail.image = typeof uploadedImg === "object" ? uploadedImg.url || "" : uploadedImg;
      }

      if (detail.image && typeof detail.image === "object") {
        detail.image = detail.image.url || "";
      }

      delete detail.hasNewImage;
      return detail;
    });
  }

  next();
};

const router = express.Router();

// Public endpoint to get all active products
router.get("/public/all", asyncHandler(async (req, res) => {
  const result = await ProductService.getAll(
    {
      status: "active",
    },
    [
      {
        $lookup: {
          from: "productcategories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]
  );
  return res.status(200).json({ statusCode: 200, success: true, message: "Products fetched successfully", data: result });
}));

// Public endpoint to get products by category
router.get("/public/category/:categoryId", asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const result = await ProductService.getAll(
    {
      category: categoryId,
      status: "active",
    },
    [
      {
        $lookup: {
          from: "productcategories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]
  );
  return res.status(200).json({ statusCode: 200, success: true, message: "Products fetched successfully", data: result });
}));

// Public endpoint to get gallery images from all active products
router.get("/public/gallery", asyncHandler(async (req, res) => {
  const result = await ProductService.getAll(
    {
      status: "active",
      images: { $exists: true, $ne: [] } // Only get products with images
    },
    [
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          shortDescription: 1,
          images: 1,
        },
      },
      {
        $sort: { createdAt: -1 }
      }
    ]
  );
  return res.status(200).json({ statusCode: 200, success: true, message: "Gallery images fetched successfully", data: result });
}));

// Public endpoint to get product by slug
router.get("/public/slug/:slug", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const result = await ProductService.getAll(
    {
      slug: slug,
      status: "active",
    },
    [
      {
        $lookup: {
          from: "productcategories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]
  );
  
  if (!result || result.result?.length === 0) {
    return res.status(404).json({ statusCode: 404, success: false, message: "Product not found", data: null });
  }
  
  return res.status(200).json({ statusCode: 200, success: true, message: "Product fetched successfully", data: result.result[0] });
}));

router
  .get("/", authenticateToken, asyncHandler(getAllProducts))
  .post(
    "/",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([
      { name: "mainImage", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "detailsImages", maxCount: 20 },
    ]),
    s3UploaderMiddleware("products"),
    asyncHandler(
      mediaUrlMiddleware(Product, [
        { key: "mainImage", type: "single" },
        { key: "images", type: "array" },
      ])
    ),
    productMediaMapper,
    asyncHandler(createProduct)
  )
  .get(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(getProductById)
  )
  .put(
    "/:id",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([
      { name: "mainImage", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "detailsImages", maxCount: 20 },
    ]),
    s3UploaderMiddleware("products"),
    asyncHandler(
      mediaUrlMiddleware(Product, [
        { key: "mainImage", type: "single", useExtractOnUpdate: true },
        { key: "images", type: "array", useExtractOnUpdate: true },
      ])
    ),
    productMediaMapper,
    asyncHandler(updateProductById)
  )
  .delete(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(deleteProductById)
  );

export default router;
