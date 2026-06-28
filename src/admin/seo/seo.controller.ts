import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import SEO from "../../modals/seo.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const SeoService = new CommonService(SEO);

export class SeoController {
  static async getPublicSeo(req: Request, res: Response, next: NextFunction) {
    try {
      const { pageType, slug } = req.query as {
        pageType?: string;
        slug?: string;
      };

      if (!pageType || !slug) {
        return res
          .status(400)
          .json(new ApiError(400, "pageType and slug are required"));
      }

      const normalizedSlug = slug.toLowerCase().trim();
      const result = await SEO.findOne({
        pageType: pageType.trim(),
        slug: normalizedSlug,
      }).lean();

      if (!result) {
        return res.status(404).json(new ApiError(404, "SEO not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }


  static async createSeo(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SeoService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create SEO"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllSeos(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SeoService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getSeoById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SeoService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "SEO not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateSeoById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SeoService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update SEO"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteSeoById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SeoService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete SEO"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
