import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Clock, Plus, ShieldCheck, User as UserIcon, Wallet, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Booking = {
  id: string;
  status: string;
  amount: number;
  user_confirmed: boolean;
  vendor_confirmed: boolean;
  listing_id: string;
  user_id: string;
  vendor_id: string;
  message: string | null;
  created_at: string;
  listings: { title: string; location: string; images: string[] } | null;
};

type Listing = { id: string; title: string; location: string; price: number; is_active: boolean; images: string[] };
type Payment = { booking_id: string; status: string; amount: number };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const { user, isVendor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [vendorBookings, setVendorBookings] = useState<Booking[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment>>({});
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: mb }, { data: vb }, { data: ml }, { data: pays }, { data: kyc }] = await Promise.all([
      supabase.from("bookings").select("*, listings(title,location,images)").eq("user_id", user.id).order("created_at", { ascending: false }),
      isVendor ? supabase.from("bookings").select("*, listings(title,location,images)").eq("vendor_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      isVendor ? supabase.from("listings").select("id,title,location,price,is_active,images").eq("vendor_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from("payments").select("booking_id,status,amount").or(`user_id.eq.${user.id},vendor_id.eq.${user.id}`),
      supabase.from("kyc_verifications").select("status").eq("user_id", user.id).maybeSingle(),
    ]);
    setMyBookings((mb ?? []) as Booking[]);
    setVendorBookings((vb ?? []) as Booking[]);
    setMyListings((ml ?? []) as Listing[]);
    const map: Record<string, Payment> = {};
    (pays ?? []).forEach((p) => { map[p.booking_id] = p as Payment; });
    setPayments(map);
    setKycStatus(kyc?.status ?? null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, isVendor]);

  const callEscrow = async (bookingId: string, action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("escrow-action", {
      body: { booking_id: bookingId, action },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Done", description: (data as { message?: string })?.message ?? "Updated." });
    load();
  };

  if (!user) return null;

  return (
    <PageShell>
      <div className="container py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Your dashboard</h1>
            <p className="mt-1 text-muted-foreground">Manage bookings, listings, and verification.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/profile"><Button variant="outline" className="gap-2"><UserIcon className="h-4 w-4" /> Profile</Button></Link>
            <Link to="/kyc">
              <Button variant={kycStatus === "verified" ? "soft" : "accent"} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                {kycStatus === "verified" ? "KYC verified" : kycStatus === "pending" ? "KYC pending" : kycStatus === "rejected" ? "KYC rejected" : "Verify identity"}
              </Button>
            </Link>
            {!isVendor && <Button variant="hero" onClick={() => navigate("/become-vendor")} className="gap-2"><Building2 className="h-4 w-4" /> Become a host</Button>}
            {isVendor && <Link to="/vendor/listings/new"><Button variant="hero" className="gap-2"><Plus className="h-4 w-4" /> New listing</Button></Link>}
            {isAdmin && <Link to="/admin"><Button variant="outline">Admin</Button></Link>}
          </div>
        </div>

        {/* My bookings */}
        <Section title="My bookings" empty="You haven't booked anything yet.">
          {myBookings.map((b) => {
            const pay = payments[b.id];
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/listings/${b.listing_id}`} className="font-display text-lg font-semibold hover:text-primary">{b.listings?.title ?? "Listing"}</Link>
                    <p className="text-sm text-muted-foreground">{b.listings?.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_STYLE[b.status]}>{b.status}</Badge>
                    {pay && <Badge variant="outline" className="gap-1"><Wallet className="h-3 w-3" /> {pay.status}</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="font-medium">€{b.amount}</span>
                  <div className="flex gap-2">
                    {b.status === "approved" && !b.user_confirmed && (
                      <Button size="sm" variant="hero" onClick={() => callEscrow(b.id, "user_confirm")}>Confirm move-in</Button>
                    )}
                    {b.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => callEscrow(b.id, "cancel")}>Cancel</Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </Section>

        {isVendor && (
          <>
            <Section title="My listings" empty="You haven't listed any rooms yet." action={<Link to="/vendor/listings/new"><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> New</Button></Link>}>
              {myListings.map((l) => (
                <Link key={l.id} to={`/vendor/listings/${l.id}/edit`} className="group flex gap-4 rounded-2xl border border-border/60 bg-card p-3 shadow-soft transition-shadow hover:shadow-elegant">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {l.images?.[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold group-hover:text-primary">{l.title}</p>
                    <p className="text-sm text-muted-foreground">{l.location} · €{l.price}</p>
                    <Badge variant={l.is_active ? "secondary" : "outline"} className="mt-1 text-xs">{l.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                </Link>
              ))}
            </Section>

            <Section title="Incoming booking requests" empty="No incoming requests yet.">
              {vendorBookings.map((b) => {
                const pay = payments[b.id];
                return (
                  <div key={b.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-semibold">{b.listings?.title}</p>
                        <p className="text-sm text-muted-foreground">€{b.amount} · {new Date(b.created_at).toLocaleDateString()}</p>
                        {b.message && <p className="mt-2 max-w-xl rounded-lg bg-muted/50 p-3 text-sm italic text-foreground/80">"{b.message}"</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_STYLE[b.status]}>{b.status}</Badge>
                        {pay && <Badge variant="outline" className="gap-1"><Wallet className="h-3 w-3" /> {pay.status}</Badge>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {b.status === "pending" && (
                        <>
                          <Button size="sm" variant="hero" className="gap-1" onClick={() => callEscrow(b.id, "approve")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => callEscrow(b.id, "reject")}><XCircle className="h-4 w-4" /> Reject & refund</Button>
                        </>
                      )}
                      {b.status === "approved" && !b.vendor_confirmed && (
                        <Button size="sm" variant="hero" onClick={() => callEscrow(b.id, "vendor_confirm")}>Confirm tenant moved in</Button>
                      )}
                      {b.status === "approved" && b.vendor_confirmed && !b.user_confirmed && (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Waiting for tenant confirmation…</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Section>
          </>
        )}
      </div>
    </PageShell>
  );
}

function Section({ title, children, empty, action }: { title: string; children: React.ReactNode; empty: string; action?: React.ReactNode }) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </section>
  );
}
