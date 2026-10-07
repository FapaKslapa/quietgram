import { BadgeCheck, Lock } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { type AccountProfile, accountStats, relationLabel } from "@/lib/account";

type AccountHeaderProps = { profile: AccountProfile & { avatarUrl: string | null } };

export function AccountHeader({ profile }: AccountHeaderProps) {
  const relation = relationLabel(profile.friendship);

  return (
    <section aria-label="Profilo" className="column grid gap-4 px-5 pb-5">
      <div className="flex items-center gap-5">
        <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} size="xl" />
        <dl className="grid flex-1 grid-cols-3 text-center">
          {accountStats(profile).map((stat) => (
            <div key={stat.label} className="grid gap-0.5">
              <dt className="order-2 text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="num-display text-base font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-1">
        <p className="flex items-center gap-1.5 font-semibold">
          <span className="truncate">{profile.fullName || profile.username}</span>
          {profile.isVerified ? (
            <BadgeCheck className="size-4 flex-none" strokeWidth={1.8} aria-label="Verificato" />
          ) : null}
        </p>
        {profile.biography ? (
          <p className="max-w-[65ch] text-sm leading-normal whitespace-pre-line">
            {profile.biography}
          </p>
        ) : null}
        {relation ? <p className="text-sm text-muted-foreground">{relation}</p> : null}
        {profile.isPrivate ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
            Account privato
          </p>
        ) : null}
      </div>
    </section>
  );
}
