import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonRes({ error: "Stripe is not configured" }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonRes({ error: "Unauthorized" }, 401);

    const action = new URL(req.url).searchParams.get("action");

    if (action === "create-session") {
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        options: {
          document: {
            allowed_types: ["driving_license", "passport", "id_card"],
            require_matching_selfie: true,
          },
        },
        metadata: { user_id: user.id },
      });

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await admin.from("profiles").update({
        verification_status: "pending",
        stripe_identity_session_id: session.id,
      }).eq("id", user.id);

      return jsonRes({ session_id: session.id, client_secret: session.client_secret, url: session.url });
    }

    if (action === "check-status") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_identity_session_id, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.stripe_identity_session_id) {
        return jsonRes({ status: profile?.verification_status || "unverified" });
      }

      const session = await stripe.identity.verificationSessions.retrieve(profile.stripe_identity_session_id);
      let newStatus = profile.verification_status;
      if (session.status === "verified") newStatus = "verified";
      else if (session.status === "requires_input") newStatus = "unverified";

      if (newStatus !== profile.verification_status) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("profiles").update({
          verification_status: newStatus,
          ...(newStatus === "verified" ? { verified_at: new Date().toISOString() } : {}),
        }).eq("id", user.id);
      }

      return jsonRes({ status: newStatus, stripe_status: session.status });
    }

    return jsonRes({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonRes({ error: err.message }, 500);
  }
});
