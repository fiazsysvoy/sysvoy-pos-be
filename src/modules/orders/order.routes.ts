import { Router } from "express";
import * as orderController from "./order.controller.js";

const router = Router();

// get all the orders
router.get("/", orderController.getAllOrders);

// get order by id
router.get("/:id", orderController.getOrderById);

// update order
router.patch("/:id", orderController.updateOrder);

// create an order
router.post("/", orderController.createOrder);

// return items from an order
router.post("/return", orderController.returnOrderItems);

export default router;
