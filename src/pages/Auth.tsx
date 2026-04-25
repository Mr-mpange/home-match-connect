import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(100);

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailR = emailSchema.safeParse(fd.get("email"));
    const passR = passwordSchema.safeParse(fd.get("password"));
    if (!emailR.success || !passR.success) {
      toast({ title: "Invalid credentials", description: "Check your email and password.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailR.data, password: passR.data });
    setBusy(false);
    if (error) return toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
    navigate("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nameR = nameSchema.safeParse(fd.get("name"));
    const emailR = emailSchema.safeParse(fd.get("email"));
    const passR = passwordSchema.safeParse(fd.get("password"));
    if (!nameR.success || !emailR.success || !passR.success) {
      toast({ title: "Check your details", description: "Some fields are invalid.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: emailR.data,
      password: passR.data,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: nameR.data },
      },
    });
    setBusy(false);
    if (error) return toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
    toast({ title: "Welcome to Roomly!", description: "You're signed in." });
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-elegant"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">Welcome to Roomly</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verified rentals · Escrow protected</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required maxLength={72} autoComplete="current-password" />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" name="name" type="text" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" name="email" type="email" required maxLength={255} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Password</Label>
                <Input id="password2" name="password" type="password" required minLength={6} maxLength={72} autoComplete="new-password" />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
