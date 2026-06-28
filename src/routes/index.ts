import { Router } from "express";

import faqRoutes from "../admin/faq/faq.routes";
import blogRoutes from "../admin/blog/blog.routes";
import roleRoutes from "../admin/role/role.routes";
import adminRoutes from "../admin/admin/admin.routes";
import termsRoutes from "../admin/terms/terms.routes";
import bannerRoutes from "../admin/banner/banner.routes";
import refundRoutes from "../admin/refund/refund.routes";
import privacyRoutes from "../admin/privacy/privacy.routes";
import stateCityRoutes from "../public/statecity/statecity.routes";
import testimonialRoutes from "../admin/testimonial/testimonial.routes";
import productRoutes from "../admin/product/product.routes";
import productCategoryRoutes from "../admin/productcategory/productcategory.routes";
import inquiryRoutes from "../admin/inquiry/inquiry.routes";
import seoRoutes from "../admin/seo/seo.routes";

const router = Router();

router.use("/faq", faqRoutes);
router.use("/blog", blogRoutes);
router.use("/role", roleRoutes);
router.use("/admin", adminRoutes);
router.use("/terms", termsRoutes);
router.use("/banner", bannerRoutes);
router.use("/location", stateCityRoutes);
router.use("/refund-policy", refundRoutes);
router.use("/privacy-policy", privacyRoutes);
router.use("/testimonial", testimonialRoutes);
router.use("/product", productRoutes);
router.use("/productcategory", productCategoryRoutes);
router.use("/inquiry", inquiryRoutes);
router.use("/seo", seoRoutes);

export default router;
