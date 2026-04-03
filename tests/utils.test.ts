import { expect, test } from "bun:test";
import { formatLocation } from "../src/utils";

/*
test("Format location", () => {
    expect(formatLocation({})).toBe("Unknown");
    expect(formatLocation({ x: 1, y: 2 })).toBe("Unknown");
    expect(formatLocation({ x: 1, y: 2, z: 3 })).toBe("`1 2 3`");
    expect(formatLocation({ x: 2, y: -612, z: 7 })).toBe("`2 -612 7`");

    expect(formatLocation({ description: "https://example.com" })).toBe(
        "`https://example.com`"
    );

    expect(
        formatLocation({
            description: "https://example.com",
            dimension: "nether",
            x: 1,
            y: 2,
            z: 3,
        })
    ).toBe("`https://example.com`");

    expect(formatLocation({ description: "the back of CatMall" })).toBe(
        "the back of CatMall"
    );

    expect(formatLocation({ description: " the back of CatMall " })).toBe(
        "the back of CatMall"
    );

    expect(formatLocation({ dimension: "nether" })).toBe("the nether");

    expect(
        formatLocation({
            x: 1,
            y: 2,
            z: 3,
            description: "joe mama",
            dimension: "end",
        })
    ).toBe("`1 2 3` (joe mama) in the end");
});
*/