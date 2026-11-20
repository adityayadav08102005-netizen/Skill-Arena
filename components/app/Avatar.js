import { cn } from "@/lib/utils/cn";

const SIZES = { sm: "size-8 text-xs", md: "size-12 text-sm", lg: "size-20 text-xl" };

/**
 * Profile photo with fallbacks: uploaded avatar → Google image → initials.
 * `version` busts the browser cache after an upload.
 */
export default function Avatar({ userId, name, hasAvatar, image, size = "md", version, className }) {
  const initials = (name || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const src = hasAvatar ? `/api/files/avatar/${userId}${version ? `?v=${version}` : ""}` : image;
  const classes = cn("shrink-0 rounded-full object-cover", SIZES[size], className);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- served from our own API or Google
    return <img src={src} alt="" className={classes} referrerPolicy="no-referrer" />;
  }
  return (
    <span aria-hidden="true" className={cn(classes, "flex items-center justify-center bg-arena-50 font-medium text-arena-800")}>
      {initials}
    </span>
  );
}
