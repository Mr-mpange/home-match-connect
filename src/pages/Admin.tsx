import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  user_id: string;
  status: string;
  id_document_path: string;
  selfie_path: string | null;
  reviewer_notes: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("kyc_verifications")
      .select("id,user_id,status,id_document_path,selfie_path,reviewer_notes,created_at, profiles:user_id(display_name)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    // Sign URLs for documents
    const map: Record<string, string> = {};
    for (const r of (data ?? []) as unknown as Row[]) {
      const { data: s1 } = await supabase.storage.from("kyc-documents").createSignedUrl(r.id_document_path, 600);
      if (s1) map[r.id_document_path] = s1.signedUrl;
      if (r.selfie_path) {
        const { data: s2 } = await supabase.storage.from("kyc-documents").createSignedUrl(r.selfie_path, 600);
        if (s2) map[r.selfie_path] = s2.signedUrl;
      }
    }
    setSignedUrls(map);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const decide = async (id: string, status: "verified" | "rejected") => {
    if (!user) return;
    const { error } = await supabase.from("kyc_verifications").update({
      status,
      reviewer_notes: notes[id] ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: status === "verified" ? "Verified" : "Rejected" });
    load();
  };

  if (!isAdmin) {
    return <PageShell><div className="container py-20 text-center text-muted-foreground">Admins only.</div></PageShell>;
  }

  return (
    <PageShell>
      <div className="container py-10">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" /> KYC reviews
        </motion.h1>
        <p className="mt-1 text-muted-foreground">Approve or reject identity submissions.</p>

        <div className="mt-8 grid gap-4">
          {rows.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center text-muted-foreground">No submissions.</div>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold">{r.profiles?.display_name ?? r.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {signedUrls[r.id_document_path] && (
                  <a href={signedUrls[r.id_document_path]} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted">
                    <img src={signedUrls[r.id_document_path]} alt="ID" className="h-full w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <div className="px-3 py-2 text-xs text-muted-foreground">View ID document</div>
                  </a>
                )}
                {r.selfie_path && signedUrls[r.selfie_path] && (
                  <a href={signedUrls[r.selfie_path]} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted">
                    <img src={signedUrls[r.selfie_path]} alt="Selfie" className="h-full w-full object-cover" />
                  </a>
                )}
              </div>

              {r.status === "pending" && (
                <div className="mt-4 space-y-2">
                  <Textarea placeholder="Notes (optional)" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={500} rows={2} />
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm" className="gap-1" onClick={() => decide(r.id, "verified")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                    <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => decide(r.id, "rejected")}><XCircle className="h-4 w-4" /> Reject</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
