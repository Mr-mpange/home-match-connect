import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { rankMatches, type LifestyleProfile } from "@/services/matching";

type Candidate = LifestyleProfile & { id: string; display_name: string | null; avatar_url: string | null; bio: string | null };

export default function Matches() {
  const { user } = useAuth();
  const [me, setMe] = useState<LifestyleProfile | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: mine } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setMe(mine as LifestyleProfile | null);
      const { data: others } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,bio,budget_min,budget_max,cleanliness,sleep_schedule,smoking,guest_frequency")
        .neq("id", user.id)
        .limit(50);
      setCandidates((others ?? []) as Candidate[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const ranked = me ? rankMatches(me, candidates).slice(0, 24) : [];
  const profileIncomplete = !me?.cleanliness || !me?.sleep_schedule || me?.budget_min == null;

  return (
    <PageShell>
      <div className="container py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Compatible roommates</h1>
            <p className="mt-1 text-muted-foreground">Ranked by lifestyle compatibility.</p>
          </div>
          <Link to="/profile"><Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" /> Edit my preferences</Button></Link>
        </motion.div>

        {profileIncomplete && (
          <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-5">
            <p className="font-medium text-foreground">Complete your profile for better matches.</p>
            <p className="text-sm text-muted-foreground">We use cleanliness, sleep schedule, smoking, guests and budget.</p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : ranked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-16 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8" /> No candidates yet — invite friends to join Roomly!
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ranked.map(({ candidate, score }) => (
              <motion.div
                key={candidate.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-shadow hover:shadow-elegant"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground font-semibold">
                    {candidate.avatar_url ? <img src={candidate.avatar_url} alt="" className="h-full w-full object-cover" /> : (candidate.display_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold">{candidate.display_name ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">€{candidate.budget_min ?? "?"} – €{candidate.budget_max ?? "?"}</p>
                  </div>
                  <ScorePill score={score} />
                </div>
                {candidate.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{candidate.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {candidate.cleanliness && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{candidate.cleanliness.replace("_", " ")}</span>}
                  {candidate.sleep_schedule && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{candidate.sleep_schedule.replace("_", " ")}</span>}
                  {candidate.smoking != null && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{candidate.smoking ? "smoker" : "non-smoker"}</span>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 75 ? "bg-success text-success-foreground" : score >= 50 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{score}%</span>;
}
