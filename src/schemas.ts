import { z } from "zod";
import { Dimension } from "./utils";

const arrayifyObjectSchema = z
    .object({})
    .strict()
    .transform(() => []);

export const websocketMessageLocationSchema = z.object({
    coordinates: z
        .union([z.array(z.number()), arrayifyObjectSchema])
        .transform((v) => (v.length == 3 ? v : undefined))
        .optional(),
    description: z.string().optional(),
    dimension: z
        .string()
        .toLowerCase()
        .transform((v) => Dimension[v as keyof typeof Dimension])
        .optional(),
});

export const websocketMessageSchema = z.object({
    type: z.literal("ShopSync"),
    version: z.literal(1).or(z.undefined()).or(z.null()).optional(),
    info: z.object({
        name: z.string(),
        description: z.string().optional(),
        owner: z.string().optional(),
        computerID: z.number().int(),
        multiShop: z.number().int().optional(),
        software: z
            .object({
                name: z.string().optional(),
                version: z.string().optional(),
            })
            .optional(),
        location: websocketMessageLocationSchema.optional(),
        txLocation: z.union([z.array(z.number()), arrayifyObjectSchema])
            .transform((v) => (v.length == 3 ? v : undefined))
            .optional(),
        txLocationDim: z.string()
            .toLowerCase()
            .transform((v) => Dimension[v as keyof typeof Dimension])
            .optional(),
        otherLocations: z
            .union([
                z.array(websocketMessageLocationSchema),
                arrayifyObjectSchema,
            ])
            .optional(),
    }),
    items: z.union([
        z.array(
            z
                .object({
                    prices: z.union([
                        z.array(
                            z.object({
                                value: z.number(),
                                currency: z.string().toUpperCase(),
                                address: z.string().optional(),
                                requiredMeta: z.string().optional(),
                            })
                        ),
                        arrayifyObjectSchema,
                    ]),
                    item: z.object({
                        name: z.string(),
                        nbt: z.string().optional(),
                        displayName: z.string(),
                        description: z.string().optional(),
                    }),
                    dynamicPrice: z.boolean().default(false),
                    stock: z.number().int().optional(),
                    madeOnDemand: z.boolean().default(false),
                    requiresInteraction: z.boolean().default(false),
                    shopBuysItem: z.boolean().default(false),
                    noLimit: z.boolean().default(false),
                })
                .refine((d) => {
                    return d.shopBuysItem
                        ? true
                        : d.prices.every((v) => v.address !== undefined);
                }, "Address required when shop sells item")
                .refine((d) => {
                    return d.shopBuysItem
                        ? d.noLimit || d.stock !== undefined
                        : true;
                }, "Buy (shop buys) item must have stock when noLimit is false")
                .refine((d) => {
                    return d.shopBuysItem
                        ? true
                        : d.madeOnDemand || d.stock !== undefined;
                }, "Sell (shop sells) item must have stock when madeOnDemand is false")
        ),
        arrayifyObjectSchema,
    ]),
});
