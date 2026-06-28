import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { Inquiry } from "../../modals/inquiry.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const InquiryService = new CommonService(Inquiry);

export class InquiryController {
  static async createInquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InquiryService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create inquiry"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Your inquiry has been submitted"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const { populate, ...queryParams } = req.query;

      const result = await InquiryService.getAll(
        queryParams,
        [
          {
            $lookup: {
              from: "products",
              localField: "product",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: {
              path: "$product",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]
      );
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Inquiries fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getInquiryById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InquiryService.getById(req.params.id, (req.query.populate as any) || "product");
      if (!result)
        return res.status(404).json(new ApiError(404, "Inquiry not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Inquiry fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateInquiryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await InquiryService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update inquiry"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Inquiry updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteInquiryById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await InquiryService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete inquiry"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Inquiry deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
