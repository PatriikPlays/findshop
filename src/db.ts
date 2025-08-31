import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { FindShopLogger } from "./logger";
import { websocketMessageSchema } from "./schemas";
import { configSchema } from "./config";

interface Statistic<T> {
    codeName: string;
    friendlyName: string;
    value: T;
}

export interface Statistics {
    shopCount: Statistic<number>;
    itemCount: Statistic<number>;
    locationCount: Statistic<number>;
    lastInfoUpdate: Statistic<string | null>;
}

type SearchItemsReturnType<T extends boolean> = T extends true
    ? Prisma.ItemGetPayload<{
          include: {
              prices: true;
              shop: {
                  include: {
                      locations: true;
                  };
              };
          };
      }>[]
    : Prisma.ItemGetPayload<{
          include: {
              prices: true;
          };
      }>[];

export class DatabaseManager {
    prisma: PrismaClient;
    config: z.infer<typeof configSchema>;

    constructor(prisma: PrismaClient, config: z.infer<typeof configSchema>) {
        this.prisma = prisma;
        this.config = config;

        setInterval(async () => {
            await this.cleanOldShops();
        }, 60000 * 15);
    }

    async cleanOldShops() {
        const deleted = await this.prisma.shop.deleteMany({
            where: {
                lastSeen: {
                    lt: new Date(Date.now() - this.config.SHOP_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
                },
            },
        });

        FindShopLogger.logger.info(`Deleted ${deleted.count} old shop(s)`);
    }

    async handlePacket(shopsyncPacket: z.infer<typeof websocketMessageSchema>) {
        const shop = await this.prisma.shop.findFirst({
            where: {
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
            },
        });

        if (!shop) return this.insertShop(shopsyncPacket);
        return this.modifyShop(shop.id, shopsyncPacket);
    }

    async insertShop(shopsyncPacket: z.infer<typeof websocketMessageSchema>) {
        await this.prisma.shop.create({
            data: {
                name: shopsyncPacket.info.name,
                description: shopsyncPacket.info.description,
                owner: shopsyncPacket.info.owner,
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
                softwareName: shopsyncPacket.info.software?.name,
                softwareVersion: shopsyncPacket.info.software?.version,
                locations: {
                    create: [
                        {
                            main: true,
                            x: shopsyncPacket.info.location?.coordinates?.[0],
                            y: shopsyncPacket.info.location?.coordinates?.[1],
                            z: shopsyncPacket.info.location?.coordinates?.[2],
                            description:
                                shopsyncPacket.info.location?.description,
                            dimension: shopsyncPacket.info.location?.dimension,
                        },
                    ].concat(
                        (shopsyncPacket.info.otherLocations ?? []).map(
                            (loc: any) => ({
                                main: false,
                                x: loc.position?.[0],
                                y: loc.position?.[1],
                                z: loc.position?.[2],
                                description: loc.description,
                                dimension: loc.dimension,
                            })
                        )
                    ),
                },
                txLocationX: shopsyncPacket.info.txLocation?.[0],
                txLocationY: shopsyncPacket.info.txLocation?.[1],
                txLocationZ: shopsyncPacket.info.txLocation?.[2],
                txLocationDim: shopsyncPacket.info.txLocationDim,
                items: {
                    // @ts-ignore
                    create: (shopsyncPacket.items ?? []).map((item: any) => ({
                        name: item.item.name,
                        displayName: item.item.displayName,
                        nbtHash: item.item.nbt,
                        description: item.item.description,
                        dynamicPrice: item.dynamicPrice,
                        madeOnDemand: item.madeOnDemand,
                        stock: item.stock,
                        requiresInteraction: item.requiresInteraction,
                        shopBuysItem: item.shopBuysItem,
                        noLimit: item.noLimit,

                        prices: {
                            create: (item.prices ?? []).map((price: any) => ({
                                value: price.value,
                                currency: price.currency,
                                address: price.address,
                                requiredMeta: price.requiredMeta,
                            })),
                        },
                    })),
                },
            },
        });
    }

    async modifyShop(
        id: string,
        shopsyncPacket: z.infer<typeof websocketMessageSchema>
    ) {
        await this.prisma.shop.update({
            where: {
                id: id,
            },
            data: {
                lastSeen: new Date(),
                name: shopsyncPacket.info.name,
                description: shopsyncPacket.info.description,
                owner: shopsyncPacket.info.owner,
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
                softwareName: shopsyncPacket.info.software?.name,
                softwareVersion: shopsyncPacket.info.software?.version,
                locations: {
                    deleteMany: {},
                    create: [
                        {
                            main: true,
                            x: shopsyncPacket.info.location?.coordinates?.[0],
                            y: shopsyncPacket.info.location?.coordinates?.[1],
                            z: shopsyncPacket.info.location?.coordinates?.[2],
                            description:
                                shopsyncPacket.info.location?.description,
                            dimension: shopsyncPacket.info.location?.dimension,
                        },
                    ].concat(
                        (shopsyncPacket.info.otherLocations ?? []).map(
                            (loc: any) => ({
                                main: false,
                                x: loc.position?.[0],
                                y: loc.position?.[1],
                                z: loc.position?.[2],
                                description: loc.description,
                                dimension: loc.dimension,
                            })
                        )
                    ),
                },
                txLocationX: shopsyncPacket.info.txLocation?.[0],
                txLocationY: shopsyncPacket.info.txLocation?.[1],
                txLocationZ: shopsyncPacket.info.txLocation?.[2],
                txLocationDim: shopsyncPacket.info.txLocationDim,
                items: {
                    deleteMany: {},
                    // @ts-ignore
                    create: (shopsyncPacket.items ?? []).map((item: any) => ({
                        name: item.item.name,
                        displayName: item.item.displayName,
                        nbtHash: item.item.nbt,
                        description: item.item.description,
                        dynamicPrice: item.dynamicPrice,
                        madeOnDemand: item.madeOnDemand,
                        stock: item.stock,
                        requiresInteraction: item.requiresInteraction,
                        shopBuysItem: item.shopBuysItem,
                        noLimit: item.noLimit,

                        prices: {
                            create: (item.prices ?? []).map((price: any) => ({
                                value: price.value,
                                currency: price.currency,
                                address: price.address,
                                requiredMeta: price.requiredMeta,
                            })),
                        },
                    })),
                },
            },
        });
    }

    async searchItems<T extends boolean>({
        query,
        exact,
        inStock,
        shopMustBuyItem,
        includeFullShop,
    }: {
        query: string;
        exact: boolean;
        inStock: boolean;
        shopMustBuyItem: boolean;
        includeFullShop: T;
    }): Promise<SearchItemsReturnType<T>> {
        const exactq = [
            { name: { equals: query } },
            { displayName: { equals: query } },
        ];
        const nonexactq = [
            { name: { contains: query } },
            { displayName: { contains: query } },
        ];

        return this.prisma.item.findMany({
            where: {
                OR: exact ? exactq : nonexactq,
                stock: inStock ? { gt: 0 } : undefined,
                shopBuysItem: shopMustBuyItem,
            },
            include: {
                prices: true,
                shop: includeFullShop && {
                    include: {
                        locations: true,
                    },
                },
            },
        });
    }

    async getAllShops() {
        return this.prisma.shop.findMany({
            include: {
                locations: true,
            },
        });
    }

    async getShop(
        computerID: number,
        multiShop: number | undefined,
        includeItems: boolean | undefined
    ) {
        return this.prisma.shop.findFirst({
            where: {
                computerID: computerID,
                multiShop: multiShop,
            },
            include: { locations: true, items: includeItems ?? false },
        });
    }

    async getStatistics(): Promise<Statistics> {
        const lastPacket = await this.prisma.shop.findFirst({
            orderBy: { lastSeen: "desc" },
        });

        return {
            shopCount: {
                codeName: "total_shops",
                friendlyName: "Total shops",
                value: await this.prisma.shop.count(),
            },
            locationCount: {
                codeName: "total_locations",
                friendlyName: "Total locations",
                value: await this.prisma.location.count(),
            },
            itemCount: {
                codeName: "total_items",
                friendlyName: "Total items",
                value: await this.prisma.item.count(),
            },
            lastInfoUpdate: {
                codeName: "last_shopsync_update",
                friendlyName: "Last ShopSync update",
                value: lastPacket?.lastSeen?.toISOString() || null,
            },
        };
    }
}

export async function connectToDatabase(config: z.infer<typeof configSchema>) {
    FindShopLogger.logger.debug("Connecting to database...");
    const prisma = new PrismaClient({
        log: ["error", "info", "warn"],
    });

    await prisma.$connect();
    FindShopLogger.logger.debug("Connected to database!");
    return new DatabaseManager(prisma, config);
}
