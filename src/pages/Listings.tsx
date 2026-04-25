import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type Listing = {
  id: string;
  title: string;
  location: string;
  price: number;
  room_type: "private_room" | "shared_room" | "studio" | "entire_place";
  images: string[];
  description: string;
};

const PAGE_SIZE = 9;

const ROOM_LABEL: Record<string, string> = {
  private_room: "Private room",
  shared_room: "Shared room",
  studio: "Studio",
  entire_place: "Entire place",
};

export default function Listings() {
  const [params, setParams] = useSearchParams();
  const location = params.get("location") ?? "";
  const minPrice = params.get("min") ?? "";
  const maxPrice = params.get("max") ?? "";
  const roomType = params.get("type") ?? "all";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("listings").select("id,title,location,price,room_type,images,description", { count: "exact" }).eq("is_active", true).order("created_at", { ascending: false });
      if (location) q = q.ilike("location", `%${location}%`);
      if (minPrice) q = q.gte("price", parseInt(minPrice, 10));
      if (maxPrice) q = q.lte("price", parseInt(maxPrice, 10));
      if (roomType !== "all") q = q.eq("room_type", roomType as Listing["room_type"]);
      const from = (page - 1) * PAGE_SIZE;
      q = q.range(from, from + PAGE_SIZE - 1);
      const { data, count } = await q;
      if (cancelled) return;
      setListings((data ?? []) as Listing[]);
      setTotal(count ?? 0);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [location, minPrice, maxPrice, roomType, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  return (
    <PageShell>
      <section className="container py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Find your next room</h1>
          <p className="mt-1 text-muted-foreground">Every listing is from a verified host.</p>
        </motion.div>

        {/* Filters */}
        <form
          onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); update({ location: String(fd.get("location") ?? ""), min: String(fd.get("min") ?? ""), max: String(fd.get("max") ?? ""), type: String(fd.get("type") ?? "all") }); }}
          className="mb-8 grid gap-3 rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-soft md:grid-cols-[1.5fr,1fr,1fr,1fr,auto]"
        >
          <div className="relative">
            <Label className="sr-only">Location</Label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="location" defaultValue={location} placeholder="City or neighborhood" className="pl-9" maxLength={120} />
          </div>
          <Input name="min" type="number" min={0} max={100000} defaultValue={minPrice} placeholder="Min price" />
          <Input name="max" type="number" min={0} max={100000} defaultValue={maxPrice} placeholder="Max price" />
          <Select name="type" defaultValue={roomType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="private_room">Private room</SelectItem>
              <SelectItem value="shared_room">Shared room</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="entire_place">Entire place</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="hero" className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Search</Button>
        </form>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-16 text-center">
            <p className="text-lg font-medium">No listings match your filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try widening your search.</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Next</Button>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0];
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-elegant"
    >
      <Link to={`/listings/${listing.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {cover ? (
            <img src={cover} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-soft text-muted-foreground">No photo</div>
          )}
          <Badge className="absolute left-3 top-3 gap-1 bg-card/90 text-foreground backdrop-blur"><ShieldCheck className="h-3 w-3 text-success" /> Verified</Badge>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-display text-lg font-semibold">{listing.title}</h3>
            <span className="font-display text-lg font-bold text-primary">€{listing.price}</span>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {listing.location}</p>
          <p className="text-xs text-muted-foreground">{ROOM_LABEL[listing.room_type]}</p>
        </div>
      </Link>
    </motion.div>
  );
}
