import { Router } from "express";
import * as productController from "../product/product.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const productRouter = Router();

productRouter.get("/", productController.getProducts);
productRouter.get("/:id", productController.getProductById);

productRouter.post("/", requireAdmin, productController.createProduct);
productRouter.patch("/:id", requireAdmin, productController.updateProduct);
productRouter.delete("/:id", requireAdmin, productController.deleteProduct);

export default productRouter;
