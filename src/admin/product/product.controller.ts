import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Product } from "../../modals/product.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { deleteImageFromS3, extractImageUrl, extractImageArray } from "../../utils/helper";

const ProductService = new CommonService(Product);

export class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // Failsafe: Handle nested images in details if they are objects
      if (req.body.details && Array.isArray(req.body.details)) {
        req.body.details = req.body.details.map((detail: any) => {
          if (typeof detail.image === "object" && detail.image !== null) {
            detail.image = detail.image.url || "";
          }
          return detail;
        });
      }

      const result = await ProductService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create product"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = (req as any).user || {};

      // Separate out 'populate' - aggregation pipeline cannot use Mongoose populate
      // We handle the join via a $lookup stage instead
      const { populate, ...queryParams } = req.query;

      const result = await ProductService.getAll(
        {
          ...queryParams,
          ...(role === "admin" ? {} : { status: "active" }),
        },
        [
          // $lookup to join category
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
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.getById(req.params.id, (req.query.populate as any) || "category");
      if (!result)
        return res.status(404).json(new ApiError(404, "Product not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateProductById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // The mediaUrlMiddleware handles mainImage and images top-level
      // But we need to handle nested details[].image manually if not in middleware

      const record = await Product.findById(req.params.id);
      if (!record) return res.status(404).json(new ApiError(404, "Product not found"));

      // Handle nested images in details robustly
      if (req.body.details && Array.isArray(req.body.details)) {
        const existingDetails = record.details || [];
        const existingImages = existingDetails
          .map((d) => d.image)
          .filter((img): img is string => !!img);

        const incomingImages = req.body.details
          .map((d: any) => {
            // Extract URL if it's an object (failsafe)
            if (typeof d.image === "object" && d.image !== null) {
              d.image = d.image.url || "";
            }
            return d.image;
          })
          .filter((img: any): img is string => typeof img === "string" && !!img);

        // Delete images that were in existing details but are not in incoming details
        const imagesToDelete = existingImages.filter(
          (img) => !incomingImages.includes(img)
        );

        for (const img of imagesToDelete) {
          await deleteImageFromS3(img);
        }
      }

      const result = await ProductService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update product"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteProductById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const record = await Product.findById(req.params.id);
      if (record) {
        // Delete top-level images
        if (record.mainImage) await deleteImageFromS3(record.mainImage);
        if (record.images && record.images.length > 0) {
          await Promise.all(record.images.map(img => deleteImageFromS3(img)));
        }
        // Delete nested images in details
        if (record.details && record.details.length > 0) {
          await Promise.all(record.details.map(det => {
            if (det.image) return deleteImageFromS3(det.image);
          }));
        }
      }

      const result = await ProductService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete product"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
