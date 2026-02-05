import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AccountService } from "./account.service.js";
import { updateAccountSchema, updateOrganizationSchema } from "./account.schema.js";

const accountService = new AccountService();

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const result = await accountService.getProfile(user);
    res.json(result);
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    const user = req.user!;
    const updatedUser = await accountService.updateProfile(user, parsed.data);
    res.json(updatedUser);
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const result = await accountService.getOrganization(user);
    res.json({ success: true, data: result });
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    const user = req.user!;
    const updatedOrg = await accountService.updateOrganization(user, parsed.data);
    res.json({ success: true, data: updatedOrg });
});
