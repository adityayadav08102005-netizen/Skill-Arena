import { z } from "zod";

const blankToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Required trimmed text. */
export const text = (max, label = "This field") =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);

/** Optional trimmed text; empty strings become undefined. */
export const optText = (max, label = "This field") =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional());

/** Optional http(s) URL; blocks javascript: and other schemes. */
export const optUrl = (label = "Link") =>
  z.preprocess(blankToUndefined, z.url({ protocol: /^https?$/, error: `${label} must be a valid http(s) URL` }).max(300).optional());

export const optYear = (label = "Year") =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : typeof v === "string" ? Number(v) : v),
    z.number({ error: `${label} must be a number` }).int().min(1980, `${label} looks too early`).max(2100, `${label} looks too late`).optional(),
  );

export const optDate = z.preprocess(blankToUndefined, z.coerce.date().optional());
