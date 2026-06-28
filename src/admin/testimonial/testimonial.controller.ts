import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { Testimonial } from "../../modals/testimonial.model";
import { CommonService } from "../../services/common.services";

const TestimonialService = new CommonService(Testimonial);

export class TestimonialController {
  static async createTestimonial(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await TestimonialService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Testimonial"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllTestimonials(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await TestimonialService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getTestimonialById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await TestimonialService.getById(req.params.id, false);
      if (!result)
        return res.status(404).json(new ApiError(404, "Testimonial not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateTestimonialById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const result = await TestimonialService.updateById(id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Testimonial"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteTestimonialById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await TestimonialService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Testimonial"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
