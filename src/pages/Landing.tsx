import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Search, Users, Wallet, Sparkles, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/Layout";

const features = [
  { icon: ShieldCheck, title: "KYC verified", desc: "Every host and tenant is identity-checked before they can transact." },
  { icon: Wallet, title: "Escrow protected", desc: "Funds are held safely and only released when both sides confirm." },
  { icon: Users, title: "Smart matching", desc: "Find roommates that fit your lifestyle, budget, and schedule." },
  { icon: Search, title: "Trusted listings", desc: "Real photos, real prices, real people — no fake placeholders." },
];

export default function Landing() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-soft" />
        <div className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,hsl(var(--primary-glow)/0.25),transparent_40%),radial-gradient(circle_at_80%_30%,hsl(var(--accent)/0.2),transparent_45%)]" />

        <div className="container grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Trusted by verified hosts and tenants
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance md:text-6xl lg:text-7xl">
              Find your <span className="bg-gradient-hero bg-clip-text text-transparent">room</span>.
              <br /> Match your <span className="bg-gradient-accent bg-clip-text text-transparent">roommate</span>.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground text-balance">
              The marketplace where every listing is verified, every payment is held in escrow, and your next roommate is matched on what actually matters.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/listings">
                <Button variant="hero" size="lg">Browse listings</Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg">Get started</Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> KYC verified</div>
              <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary" /> Escrow held</div>
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> 4.9 avg</div>
            </div>
          </motion.div>

          {/* Floating cards */}
          <div className="relative h-[480px]">
            <FloatingCard
              className="left-4 top-6 w-64"
              delay={0}
              animate="animate-float"
              title="Sunny studio · Lisbon"
              price="€780"
              tag="Verified"
              meta="Studio · 32m²"
            />
            <FloatingCard
              className="right-2 top-28 w-72"
              delay={0.15}
              animate="animate-float-slow"
              title="Bright room · Berlin Mitte"
              price="€620"
              tag="KYC ✓"
              meta="Private room · 14m²"
              highlight
            />
            <FloatingCard
              className="left-10 bottom-8 w-72"
              delay={0.3}
              animate="animate-float"
              title="Loft share · Barcelona"
              price="€540"
              tag="Escrow"
              meta="Shared room · 18m²"
            />
            {/* Glow */}
            <div className="absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Built around trust</h2>
          <p className="mt-3 text-muted-foreground">Identity verification and escrow remove the guesswork of renting from strangers.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-soft transition-shadow hover:shadow-elegant"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container pb-20">
        <div className="rounded-3xl border border-border/60 bg-gradient-hero p-10 text-primary-foreground shadow-elegant md:p-14">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">From browse to keys in 5 safe steps.</h2>
              <p className="mt-3 max-w-md text-primary-foreground/80">Every transaction is protected end-to-end.</p>
              <Link to="/auth"><Button variant="accent" size="lg" className="mt-6">Create your account</Button></Link>
            </div>
            <ol className="space-y-3">
              {["Verify your identity (KYC)", "Browse and filter trusted listings", "Match with compatible roommates", "Book — funds go into escrow", "Both confirm — funds released"].map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                  <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-semibold">{i + 1}</span>
                  <span className="font-medium">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FloatingCard({
  className,
  delay,
  animate,
  title,
  price,
  tag,
  meta,
  highlight,
}: {
  className?: string;
  delay: number;
  animate: string;
  title: string;
  price: string;
  tag: string;
  meta: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute ${className} ${animate} rounded-2xl border border-border/60 bg-card/90 p-4 shadow-elegant backdrop-blur-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {meta}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${highlight ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {tag}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="font-display text-xl font-bold text-primary">{price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
        <ShieldCheck className="h-4 w-4 text-success" />
      </div>
    </motion.div>
  );
}
