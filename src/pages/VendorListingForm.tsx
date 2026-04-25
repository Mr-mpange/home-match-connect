import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  location: z.string().trim().min(2).max(120),
  price: z.coerce.number().int().min(1).max(100000),
  description: z.string().trim().min(10).max(4000),
  room_type: z.enum(["private_room", "shared_room", "studio", "entire_place"]),
});

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

export default function VendorListingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user, isVendor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", location: "", price: "", description: "", room_type: "private_room" as const });

  useEffect(() => {
    if (!isEdit || !id) return;
    supabase.from("listings").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({ title: data.title, location: data.location, price: String(data.price), description: data.description, room_type: data.room_type });
        setImages(data.images ?? []);
      }
    });
  }, [id, isEdit]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (images.length + files.length > MAX_IMAGES) {
      toast({ title: `Max ${MAX_IMAGES} images`, variant: "destructive" });
      return;
    }
    const uploaded: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) { toast({ title: "Only images allowed", variant: "destructive" }); continue; }
      if (file.size > MAX_BYTES) { toast({ title: `${file.name} too large (max 5MB)`, variant: "destructive" }); continue; }
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, file, { contentType: file.type });
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); continue; }
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check fields", description: parsed.error.issues[0]?.message ?? "Invalid", variant: "destructive" });
      return;
    }
    setBusy(true);
    if (isEdit && id) {
      const { error } = await supabase.from("listings").update({ ...parsed.data, images }).eq("id", id);
      setBusy(false);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Listing updated" });
    } else {
      const { error } = await supabase.from("listings").insert({ ...parsed.data, images, vendor_id: user.id });
      setBusy(false);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Listing published" });
    }
    navigate("/dashboard");
  };

  const handleDelete = async () => {
    if (!isEdit || !id) return;
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    navigate("/dashboard");
  };

  if (!isVendor) {
    return <PageShell><div className="container py-20 text-center">You need to be a host. <a href="/become-vendor" className="text-primary underline">Become a host</a></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="container max-w-3xl py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold">{isEdit ? "Edit listing" : "New listing"}</h1>
          <p className="mt-1 text-muted-foreground">Be honest and detailed — verified hosts get more bookings.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} required placeholder="City, neighborhood" />
            </div>
            <div className="space-y-2">
              <Label>Price (€/month)</Label>
              <Input type="number" min={1} max={100000} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Room type</Label>
              <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v as typeof form.room_type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private_room">Private room</SelectItem>
                  <SelectItem value="shared_room">Shared room</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="entire_place">Entire place</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={6} value={form.description} maxLength={4000} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Photos ({images.length}/{MAX_IMAGES})</Label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {images.map((url, i) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border/60">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:bg-secondary/40 hover:text-primary">
                  <ImagePlus className="h-6 w-6" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG/PNG, up to 5MB each.</p>
          </div>

          <div className="flex justify-between gap-2">
            <Button type="submit" variant="hero" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Publish listing"}
            </Button>
            {isEdit && <Button type="button" variant="outline" className="text-destructive" onClick={handleDelete}>Delete listing</Button>}
          </div>
        </form>
      </div>
    </PageShell>
  );
}
