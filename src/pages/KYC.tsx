import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ShieldCheck, Upload, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Kyc = { id: string; status: "pending" | "verified" | "rejected"; reviewer_notes: string | null };

const MAX = 8 * 1024 * 1024;

export default function KYC() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [busy, setBusy] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("kyc_verifications").select("id,status,reviewer_notes").eq("user_id", user.id).maybeSingle();
    setKyc(data as Kyc | null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const upload = async (file: File, suffix: string) => {
    if (!user) throw new Error("not signed in");
    const path = `${user.id}/${suffix}-${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idFile) return toast({ title: "ID document required", variant: "destructive" });
    if (!idFile.type.startsWith("image/") && idFile.type !== "application/pdf") return toast({ title: "Only image or PDF", variant: "destructive" });
    if (idFile.size > MAX || (selfieFile && selfieFile.size > MAX)) return toast({ title: "File too large (max 8MB)", variant: "destructive" });
    setBusy(true);
    try {
      const idPath = await upload(idFile, "id");
      const selfiePath = selfieFile ? await upload(selfieFile, "selfie") : null;
      const { error } = await supabase.from("kyc_verifications").upsert({
        user_id: user.id,
        id_document_path: idPath,
        selfie_path: selfiePath,
        status: "pending",
        reviewer_notes: null,
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Submitted!", description: "An admin will review shortly." });
      load();
    } catch (err) {
      toast({ title: "Submission failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <div className="container max-w-2xl py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> Identity verification</h1>
          <p className="mt-1 text-muted-foreground">Verified members get a trust badge and access to escrow bookings.</p>
        </motion.div>

        {kyc && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="font-medium">Current status</p>
              <StatusBadge status={kyc.status} />
            </div>
            {kyc.reviewer_notes && <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">{kyc.reviewer_notes}</p>}
          </div>
        )}

        {(!kyc || kyc.status === "rejected") && (
          <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label>Government ID (image or PDF)</Label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80" required />
            </div>
            <div className="space-y-2">
              <Label>Selfie (optional)</Label>
              <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80" />
            </div>
            <Button type="submit" variant="hero" className="gap-2" disabled={busy}><Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Submit for review"}</Button>
            <p className="text-xs text-muted-foreground">Files are private — only you and admins can access them.</p>
          </form>
        )}
      </div>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>;
  if (status === "rejected") return <Badge className="gap-1 bg-destructive text-destructive-foreground"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  return <Badge className="gap-1 bg-warning text-warning-foreground"><Clock className="h-3 w-3" /> Pending review</Badge>;
}
