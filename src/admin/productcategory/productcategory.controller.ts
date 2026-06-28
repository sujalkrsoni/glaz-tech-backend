import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { ProductCategory } from "../../modals/productcategory.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const ProductCategoryService = new CommonService(ProductCategory);

export class ProductCategoryController {
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductCategoryService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create category"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = (req as any).user || {};
      const result = await ProductCategoryService.getAll({
        ...req.query,
        ...(role === "admin" ? {} : { status: "active" }),
      });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductCategoryService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Category not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ProductCategoryService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await ProductCategoryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete category"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
