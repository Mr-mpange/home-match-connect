// Escrow state-machine edge function (mock processor).
// Actions: approve, reject, vendor_confirm, user_confirm, cancel
// Holds funds on booking, releases when both parties confirm, refunds on reject/cancel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED = ["approve", "reject", "vendor_confirm", "user_confirm", "cancel"] as const;
type Action = typeof ALLOWED[number];

interface Body { booking_id: string; action: Action }

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Authenticate
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return bad(401, "Missing auth");

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return bad(401, "Invalid token");
  const callerId = userData.user.id;

  // Validate body
  let body: Body;
  try { body = await req.json(); } catch { return bad(400, "Invalid JSON"); }
  if (!body.booking_id || typeof body.booking_id !== "string") return bad(400, "booking_id required");
  if (!ALLOWED.includes(body.action)) return bad(400, "invalid action");

  // Service-role client for transactional writes
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: booking, error: bErr } = await svc.from("bookings").select("*").eq("id", body.booking_id).maybeSingle();
  if (bErr || !booking) return bad(404, "Booking not found");

  const { data: payment } = await svc.from("payments").select("*").eq("booking_id", body.booking_id).maybeSingle();

  const isUser = callerId === booking.user_id;
  const isVendor = callerId === booking.vendor_id;
  if (!isUser && !isVendor) return bad(403, "Not your booking");

  const now = new Date().toISOString();
  const log = (event: string) => ([...(payment?.audit_log ?? []), { at: now, event, actor: callerId }]);

  let bookingUpdate: Record<string, unknown> | null = null;
  let paymentUpdate: Record<string, unknown> | null = null;
  let message = "";

  switch (body.action) {
    case "approve": {
      if (!isVendor) return bad(403, "Only vendor can approve");
      if (booking.status !== "pending") return bad(409, "Booking not pending");
      bookingUpdate = { status: "approved" };
      paymentUpdate = { audit_log: log("approved_by_vendor") };
      message = "Booking approved. Funds remain in escrow.";
      break;
    }
    case "reject": {
      if (!isVendor) return bad(403, "Only vendor can reject");
      if (booking.status !== "pending") return bad(409, "Booking not pending");
      bookingUpdate = { status: "rejected" };
      if (payment && payment.status === "held") {
        paymentUpdate = { status: "refunded", refunded_at: now, audit_log: log("refunded_after_rejection") };
      }
      message = "Booking rejected. Funds refunded.";
      break;
    }
    case "cancel": {
      if (!isUser) return bad(403, "Only user can cancel");
      if (booking.status !== "pending") return bad(409, "Only pending bookings can be cancelled");
      bookingUpdate = { status: "cancelled" };
      if (payment && payment.status === "held") {
        paymentUpdate = { status: "refunded", refunded_at: now, audit_log: log("refunded_after_cancellation") };
      }
      message = "Booking cancelled. Funds refunded.";
      break;
    }
    case "vendor_confirm":
    case "user_confirm": {
      if (booking.status !== "approved") return bad(409, "Booking not approved");
      const role = body.action === "vendor_confirm" ? "vendor" : "user";
      if (role === "vendor" && !isVendor) return bad(403, "Only vendor");
      if (role === "user" && !isUser) return bad(403, "Only user");
      const userConfirmed = role === "user" ? true : booking.user_confirmed;
      const vendorConfirmed = role === "vendor" ? true : booking.vendor_confirmed;

      bookingUpdate = role === "vendor"
        ? { vendor_confirmed: true }
        : { user_confirmed: true };

      if (userConfirmed && vendorConfirmed) {
        bookingUpdate = { ...bookingUpdate, status: "completed" };
        if (payment) {
          if (payment.status !== "held") return bad(409, "Funds not in escrow");
          paymentUpdate = { status: "released", released_at: now, audit_log: log("funds_released") };
        }
        message = "Both confirmed. Funds released to host.";
      } else {
        if (payment) paymentUpdate = { audit_log: log(`${role}_confirmed`) };
        message = `${role === "vendor" ? "Host" : "Tenant"} confirmation recorded.`;
      }
      break;
    }
  }

  if (bookingUpdate) {
    const { error } = await svc.from("bookings").update(bookingUpdate).eq("id", booking.id);
    if (error) return bad(500, `Booking update failed: ${error.message}`);
  }
  if (paymentUpdate && payment) {
    const { error } = await svc.from("payments").update(paymentUpdate).eq("booking_id", booking.id);
    if (error) return bad(500, `Payment update failed: ${error.message}`);
  }

  return new Response(JSON.stringify({ ok: true, message }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
