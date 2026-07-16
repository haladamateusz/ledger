import { z } from "zod";
import { decimalPattern } from "../../domain/decimal.ts";
import { revolutDatePattern } from "./patterns.ts";


const decimal = z.string().regex(decimalPattern);

const optionalDecimal = z.union([
    z.string().regex(decimalPattern),
    z.literal(""),
]);

export const RevolutRowSchema = z.object({
    Type: z.string().min(1),
    Product: z.string().min(1),
    "Started Date": z.string().regex(revolutDatePattern),
    "Completed Date": z.string(),
    Description: z.string().min(1),
    Amount: decimal,
    Fee: decimal,
    Currency: z.string().regex(/^[A-Z]{3}$/),
    State: z.string().min(1),
    Balance: optionalDecimal
});

export type RevolutRow = z.infer<typeof RevolutRowSchema>;