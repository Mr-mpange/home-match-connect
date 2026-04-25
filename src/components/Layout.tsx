import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, LogIn, LogOut, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isVendor, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: "/listings", label: "Browse", icon: Home },
    { to: "/matches", label: "Roommates", icon: Users, auth: true },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>Roomly</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            if (l.auth && !user) return null;
            const active = location.pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to}>
                <Button variant={active ? "soft" : "ghost"} size="sm" className="gap-2">
                  <l.icon className="h-4 w-4" /> {l.label}
                </Button>
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin">
              <Button variant={location.pathname.startsWith("/admin") ? "soft" : "ghost"} size="sm" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {!isVendor && (
                <Button variant="outline" size="sm" onClick={() => navigate("/become-vendor")} className="hidden sm:inline-flex">
                  List a room
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-muted/30">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Roomly. Verified rentals, trusted roommates.</p>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          KYC verified · Escrow protected
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <motion.main
        key={typeof window !== "undefined" ? window.location.pathname : "page"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn("flex-1", className)}
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
}
