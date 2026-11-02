import { cn } from "@/lib/cn";

interface AvatarProps {
  src: string | null;
  name: string;
  className?: string;
}

export function Avatar({ src, name, className }: AvatarProps) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (!src) {
    return (
      <div className={cn("flex size-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand", className)}>
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer" // Google avatars can fail to load without this
      className={cn("size-9 rounded-full object-cover", className)}
    />
  );
}