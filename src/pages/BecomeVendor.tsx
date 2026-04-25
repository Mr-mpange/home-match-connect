import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function BecomeVendor() {
  const { user, isVendor, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (isVendor) navigate("/dashboard"); }, [isVendor, navigate]);

  const become = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "vendor" });
    setBusy(false);
    if (error) return toast({ title: "Couldn't enable host mode", description: error.message, variant: "destructive" });
    await refreshRoles();
    toast({ title: "You're now a host!" });
    navigate("/vendor/listings/new");
  };

  return (
    <PageShell>
      <div className="container max-w-2xl py-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/60 bg-gradient-card p-10 shadow-elegant text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">Become a host</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">List your room or place on Roomly. Verified hosts unlock escrow-protected bookings, KYC badges, and trusted exposure.</p>
          <Button variant="hero" size="lg" className="mt-6" disabled={busy} onClick={become}>Enable host mode</Button>
        </motion.div>
      </div>
    </PageShell>
  );
}
