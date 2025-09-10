import { initChatbox } from "./chatboxHandler";
import { parseConfig } from "./config";
import { connectToDatabase } from "./db";
import { FindShopLogger } from "./logger";
import { websocketMessageSchema } from "./schemas";

FindShopLogger.logger.info("Starting FindShop backend...");
const config = await parseConfig();
const db = await connectToDatabase(config);
await initChatbox(config, db);

Bun.serve({
    async fetch(req, server) {
        const { pathname, searchParams } = new URL(req.url);
        FindShopLogger.logger.info(
            `${
                req.headers.get("X-Forwarded-For") || "Non-proxied"
            } ${req.headers.get("User-Agent")} ${req.method} ${pathname}`
        );

        if (pathname == "/ws") {
            if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
                return new Response("Unauthorized", { status: 401 });
            }

            if (server.upgrade(req)) {
                FindShopLogger.logger.debug("Client connected!");
                return;
            }

            return new Response("Upgrade failed :(", { status: 500 });
        } else if (pathname == "/metrics") {
            if (req.headers.get("Authorization") !== config.WEBSOCKET_TOKEN) {
                // TODO: change name of the config?
                return new Response("Unauthorized", { status: 401 });
            }

            const lines = [];
            const statistics = await db.getStatistics();
            lines.push(`findshop_total_shops ${statistics.shopCount}`);
            lines.push(`findshop_total_locations ${statistics.locationCount}`);
            lines.push(`findshop_total_items ${statistics.itemCount}`);
            // TODO: HTTP endpoints with IPs
            // TODO: Chatbox endpoints with usernames
            // TODO: Prices for various items
            // TODO: Total stock for various items

            return new Response(lines.join("\n") + "\n");
        } else if (pathname.match("^/api/v1/shop/([^/]+)$")) {
            const match = pathname.match("^/api/v1/shop/([^/]+)$")![1];
            const [shopIdStr, multishopStr] = match.split(":");
            if (!shopIdStr) return new Response("Bad Request", { status: 400 });

            const shopId = parseInt(shopIdStr);
            if (isNaN(shopId))
                return new Response("Bad Request", { status: 400 });

            const multiShop = parseInt(multishopStr);
            if (isNaN(multiShop) && multishopStr)
                return new Response("Bad Request", { status: 400 });

            const shop = await db.getShop(
                shopId,
                multishopStr ? multiShop : undefined,
                searchParams.get("includeItems") === "true"
            );
            if (shop) {
                return new Response(JSON.stringify(shop), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response("Not Found", { status: 404 });
        } else if (pathname == "/api/v1/items") {
            const query = searchParams.get("query") || "";
            if (query.length > 16384)
                return new Response("Bad Request", { status: 400 });
            const exactMatch = searchParams.get("exact") === "true";
            const inStock = searchParams.get("inStock") === "true";
            const sell = searchParams.get("sell") === "true";
            const includeFullShop =
                searchParams.get("includeFullShop") === "true";

            const items = await db.searchItems({
                query,
                exact: exactMatch,
                inStock,
                shopMustBuyItem: sell,
                includeFullShop,
            });

            const filteredShops: any = {};

            if (!includeFullShop) {
                const shops = await db.getAllShops();

                for (const item of items) {
                    let shopID = item.shopID;

                    const shop = shops.find((s) => s.id === shopID);
                    if (shop) filteredShops[shopID] = shop;
                }
            }

            return new Response(
                JSON.stringify({
                    items: items,
                    shops: includeFullShop ? undefined : filteredShops,
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response("Not Found", { status: 404 });
    },
    websocket: {
        message: async (ws, msg) => {
            if (msg.length > 2 ** 20 - 1) {
                FindShopLogger.logger.error("Received too long message");
                return;
            }

            if (msg == "ping") {
                ws.sendText("pong");
                return;
            }

            const tryParse = websocketMessageSchema.safeParse(
                JSON.parse(msg.toString("utf8"))
            );

            if (!tryParse.success) {
                FindShopLogger.logger.error(
                    `Failed to parse websocket message: ${msg}. Error: ${tryParse.error}`
                );
                return;
            }

            FindShopLogger.logger.debug("Parsed WebSocket message");
            db.queuePacket(tryParse.data);
        },
    },
    hostname: config.LISTEN_HOSTNAME,
    port: config.LISTEN_PORT,
});

FindShopLogger.logger.info(
    `Server running on http://${config.LISTEN_HOSTNAME}:${config.LISTEN_PORT}`
);
