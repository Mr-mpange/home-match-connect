import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  display_name: z.string().trim().max(100).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  budget_min: z.coerce.number().int().min(0).max(100000).nullable(),
  budget_max: z.coerce.number().int().min(0).max(100000).nullable(),
  cleanliness: z.enum(["relaxed", "average", "tidy", "very_tidy"]).nullable(),
  sleep_schedule: z.enum(["early_bird", "average", "night_owl"]).nullable(),
  smoking: z.boolean(),
  guest_frequency: z.enum(["never", "rarely", "sometimes", "often"]).nullable(),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  display_name: "",
  bio: "",
  budget_min: null,
  budget_max: null,
  cleanliness: null,
  sleep_schedule: null,
  smoking: false,
  guest_frequency: null,
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        cleanliness: data.cleanliness,
        sleep_schedule: data.sleep_schedule,
        smoking: !!data.smoking,
        guest_frequency: data.guest_frequency,
      });
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast({ title: "Check fields", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Profile saved" });
  };

  return (
    <PageShell>
      <div className="container max-w-3xl py-10">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-bold">Your profile</motion.h1>
        <p className="mt-1 text-muted-foreground">Lifestyle preferences power roommate matching.</p>

        <form onSubmit={save} className="mt-8 space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Display name</Label>
              <Input value={form.display_name ?? ""} maxLength={100} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>About you</Label>
              <Textarea rows={4} value={form.bio ?? ""} maxLength={1000} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A few lines so others know what living with you is like." />
            </div>
            <div className="space-y-2">
              <Label>Budget min (€)</Label>
              <Input type="number" min={0} value={form.budget_min ?? ""} onChange={(e) => setForm({ ...form, budget_min: e.target.value ? parseInt(e.target.value, 10) : null })} />
            </div>
            <div className="space-y-2">
              <Label>Budget max (€)</Label>
              <Input type="number" min={0} value={form.budget_max ?? ""} onChange={(e) => setForm({ ...form, budget_max: e.target.value ? parseInt(e.target.value, 10) : null })} />
            </div>
            <div className="space-y-2">
              <Label>Cleanliness</Label>
              <Select value={form.cleanliness ?? ""} onValueChange={(v) => setForm({ ...form, cleanliness: v as FormState["cleanliness"] })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="tidy">Tidy</SelectItem>
                  <SelectItem value="very_tidy">Very tidy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sleep schedule</Label>
              <Select value={form.sleep_schedule ?? ""} onValueChange={(v) => setForm({ ...form, sleep_schedule: v as FormState["sleep_schedule"] })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="early_bird">Early bird</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="night_owl">Night owl</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Guest frequency</Label>
              <Select value={form.guest_frequency ?? ""} onValueChange={(v) => setForm({ ...form, guest_frequency: v as FormState["guest_frequency"] })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="rarely">Rarely</SelectItem>
                  <SelectItem value="sometimes">Sometimes</SelectItem>
                  <SelectItem value="often">Often</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 md:col-span-2">
              <div>
                <p className="font-medium">Smoker</p>
                <p className="text-xs text-muted-foreground">Helps with matching.</p>
              </div>
              <Switch checked={form.smoking} onCheckedChange={(v) => setForm({ ...form, smoking: v })} />
            </div>
          </div>

          <Button type="submit" variant="hero" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save profile</Button>
        </form>
      </div>
    </PageShell>
  );
}
