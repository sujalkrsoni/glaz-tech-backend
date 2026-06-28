import express from "express";
import { BlogController } from "./blog.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, authorize } from "../../middlewares/authMiddleware";
import {
  dynamicUpload,
  s3UploaderMiddleware,
} from "../../middlewares/s3FileUploadMiddleware";
import { Blog } from "../../modals/blog.model";
import { mediaUrlMiddleware } from "../../middlewares/mediaUrlMiddleware";
import { CommonService } from "../../services/common.services";

const { createBlog, getAllBlogs, getBlogById, updateBlogById, deleteBlogById } =
  BlogController;

const BlogService = new CommonService(Blog);

const router = express.Router();

// Public endpoints for blog
router.get("/public/list", asyncHandler(async (req, res) => {
  const result = await BlogService.getAll({}, [
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        image: 1,
        description: 1,
        meta_title: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 }
    }
  ]);
  return res.status(200).json({ statusCode: 200, success: true, message: "Blogs fetched successfully", data: result });
}));

router.get("/public/slug/:slug", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({ slug: slug });
  
  if (!blog) {
    return res.status(404).json({ statusCode: 404, success: false, message: "Blog not found", data: null });
  }
  
  return res.status(200).json({ statusCode: 200, success: true, message: "Blog fetched successfully", data: { result: [blog] } });
}));

// Protected routes for admin
router
  .get("/", authenticateToken, asyncHandler(getAllBlogs))
  .post(
    "/",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("blog"),
    asyncHandler(
      mediaUrlMiddleware(Blog, [{ key: "image", type: "single" }])
    ),
    asyncHandler(createBlog)
  )
  .get("/:id", authenticateToken, authorize("admin"), asyncHandler(getBlogById))
  .put(
    "/:id",
    authenticateToken,
    authorize("admin"),
    dynamicUpload([{ name: "image", maxCount: 1 }]),
    s3UploaderMiddleware("blog"),
    asyncHandler(
      mediaUrlMiddleware(Blog, [
        { key: "image", type: "single", useExtractOnUpdate: true },
      ])
    ),
    asyncHandler(updateBlogById)
  )
  .delete(
    "/:id",
    authenticateToken,
    authorize("admin"),
    asyncHandler(deleteBlogById)
  );

export default router;
