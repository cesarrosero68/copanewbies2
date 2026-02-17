interface TeamLogoProps {
  team: { name?: string; logo_url?: string | null; slug?: string } | null | undefined;
  size?: number;
  className?: string;
}

export default function TeamLogo({ team, size = 28, className = "" }: TeamLogoProps) {
  if (!team) return null;

  if (team.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={team.name || ""}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }

  // Fallback: initials
  const initials = (team.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
