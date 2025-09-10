import { z as zod } from "zod";

const urlValidator = zod.string().url();

export enum Dimension {
    overworld = 0,
    nether = -1,
    end = 1,
}

// Formats the location of a shop
// Prioritises the description, if it is a URL.
// Otherwise, it formats the coordinates in the format of
// x y z (description) in the dimension
export function formatLocation({
    x,
    y,
    z,
    description,
    dimension,
}: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
    description?: string | null;
    dimension?: number | null;
}, {
    txX,
    txY,
    txZ,
    txDimension,
}: {
    txX?: number | null;
    txY?: number | null;
    txZ?: number | null;
    txDimension?: number | null;
}) {
    description = description?.trim();

    if (urlValidator.safeParse(description).success)
        return `\`${description}\``;
    let output = "";

    if (x && y && z) output += `\`${x} ${y} ${z}\``;
    else if (txX && txY && txZ) output += `tx{\`${txX} ${txY} ${txZ}\`}`;
    if (description && output === "") output += description;
    else if (description) output += ` (${description})`;
    
    console.log(dimension, txDimension)

    if (dimension != null) {
        if (output === "") output += `the \`${Dimension[dimension]}\``;
        else output += ` in the \`${Dimension[dimension]}\``;
    } else if (txDimension != null) {
        if (output === "") output += `tx{the \`${Dimension[txDimension]}\`}`;
        else output += ` tx{in the \`${Dimension[txDimension]}\`}`;
    }
    
    if (output === "") return "Unknown";

    return output;
}

interface ResponseGeneratorOptions {
    content: string[];
    page: number;
    args: string;
    cmd: string;
}

export function paginate(options: ResponseGeneratorOptions) {
    const { content: body, args, page, cmd } = options;
    const resultsPerPage = 6;
    const pageCount = Math.ceil(body.length / resultsPerPage);
    const header = `Results ${page}/${pageCount}:`;
    const footer = `\`\\${cmd} ${args} <page>\``;

    if (pageCount == 0) return "No results matching search";

    if (page < 1) return "Page out of bounds";
    if (page > pageCount) return "Page out of bounds";

    const bodyText = body
        .slice(
            (page - 1) * resultsPerPage,
            (page - 1) * resultsPerPage + resultsPerPage
        )
        .reduce((acc, v) => {
            return acc + v + "\n";
        }, "")
        .substring(0, 1024 - header.length - footer.length - 2);

    return `${header}\n${bodyText}\n${footer}`;
}

export function sanitizeMarkdown(input: string | string[]) {
    const regex = /[\\`*|]|(krist:\/\/)/g;
    if (typeof input === "string") input = [input];
    return input.map((v) => v.replaceAll(regex, ""));
}

export function sliceArgs(str: string): string[] {
    const regex = /"([^"]*)"|'([^']*)'|\S+/g;
    const args: string[] = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
        if (match[1] !== undefined) {
            args.push(match[1]);
        } else if (match[2] !== undefined) {
            args.push(match[2]);
        } else {
            args.push(match[0]);
        }
    }

    return args;
}

export function padDecimals(num: number, decimals: number): string {
    // there has to be a better way to do this
    var numStr = num.toString();
    var split = numStr.split(".")
    
    if (split.length < 2) {
        numStr += "." + ("0").repeat(decimals)
    } else if (decimals-split[1].length > 0) {
        numStr += ("0").repeat(decimals-split[1].length)
    }

    return numStr;
}