import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Listing = {
  id: string;
  title: string;
  location: string;
  price: number;
  room_type: string;
  description: string;
  images: string[];
  vendor_id: string;
};

type VendorProfile = { display_name: string | null; avatar_url: string | null };

const ROOM_LABEL: Record<string, string> = {
  private_room: "Private room",
  shared_room: "Shared room",
  studio: "Studio",
  entire_place: "Entire place",
};

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [vendorVerified, setVendorVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      setListing(l as Listing | null);
      if (l) {
        const [{ data: p }, { data: kyc }] = await Promise.all([
          supabase.from("profiles").select("display_name,avatar_url").eq("id", l.vendor_id).maybeSingle(),
          supabase.from("kyc_verifications").select("status").eq("user_id", l.vendor_id).maybeSingle(),
        ]);
        setVendor(p as VendorProfile | null);
        setVendorVerified(kyc?.status === "verified");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleBook = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!listing) return;
    if (user.id === listing.vendor_id) {
      toast({ title: "That's your own listing", variant: "destructive" });
      return;
    }
    setBooking(true);
    const { data: bk, error } = await supabase
      .from("bookings")
      .insert({
        listing_id: listing.id,
        user_id: user.id,
        vendor_id: listing.vendor_id,
        amount: listing.price,
        message: message.trim().slice(0, 1000) || null,
      })
      .select("id")
      .single();
    if (error || !bk) {
      setBooking(false);
      toast({ title: "Booking failed", description: error?.message ?? "Try again", variant: "destructive" });
      return;
    }
    // Create payment in HELD state (mock escrow)
    const { error: payErr } = await supabase.from("payments").insert({
      booking_id: bk.id,
      user_id: user.id,
      vendor_id: listing.vendor_id,
      amount: listing.price,
      status: "held",
      audit_log: [{ at: new Date().toISOString(), event: "funds_held", actor: user.id }],
    });
    setBooking(false);
    if (payErr) {
      toast({ title: "Payment failed", description: payErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booked!", description: "Funds are safely in escrow." });
    navigate("/dashboard");
  };

  if (loading) {
    return <PageShell><div className="container py-10"><Skeleton className="h-96 w-full rounded-2xl" /></div></PageShell>;
  }
  if (!listing) {
    return <PageShell><div className="container py-20 text-center">Listing not found.</div></PageShell>;
  }

  return (
    <PageShell>
      <div className="container py-8">
        <Link to="/listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-6 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
          {/* Gallery */}
          <div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-elegant">
              {listing.images?.[activeImage] ? (
                <img src={listing.images[activeImage]} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-soft text-muted-foreground">No photo</div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {listing.images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`aspect-square overflow-hidden rounded-lg border transition-all ${i === activeImage ? "border-primary shadow-soft" : "border-border/60 opacity-70 hover:opacity-100"}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{ROOM_LABEL[listing.room_type]}</Badge>
                {vendorVerified && <Badge className="gap-1 bg-success text-success-foreground"><ShieldCheck className="h-3 w-3" /> KYC verified host</Badge>}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{listing.title}</h1>
              <p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {listing.location}</p>
              <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/90">{listing.description}</p>

              {vendor && (
                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-4">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground font-semibold">
                    {vendor.avatar_url ? <img src={vendor.avatar_url} alt="" className="h-full w-full object-cover" /> : (vendor.display_name?.[0] ?? "H").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">Hosted by {vendor.display_name ?? "Host"}</p>
                    <p className="text-xs text-muted-foreground">{vendorVerified ? "Identity verified" : "Verification pending"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking panel */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
              <p className="font-display text-3xl font-bold text-primary">€{listing.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="msg">Message to host (optional)</Label>
                <Textarea id="msg" value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the host a bit about you…" rows={4} />
              </div>
              <Button variant="hero" className="mt-4 w-full" disabled={booking} onClick={handleBook}>
                {booking ? "Holding funds…" : "Book & pay into escrow"}
              </Button>
              <div className="mt-4 space-y-2 rounded-xl bg-secondary/50 p-3 text-xs text-secondary-foreground">
                <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Funds held safely in escrow.</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Released only when both sides confirm.</p>
              </div>
            </div>
          </aside>
        </motion.div>
      </div>
    </PageShell>
  );
}
