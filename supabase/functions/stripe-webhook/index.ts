import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const COMMISSION_RATE = 0.15;

async function stripeFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Stripe API error');
  }
  return res.json();
}

async function verifyStripeSignature(payload: string, signature: string): Promise<unknown> {
  const parts = signature.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parseInt(parts['t'] || '0');
  const signatures = (parts['v1'] || '').split(' ');

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature format');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(stripeWebhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expectedSig = Buffer.from(
    await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload)),
  ).toString('hex');

  if (!signatures.includes(expectedSig)) {
    throw new Error('Invalid Stripe signature');
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > 300) throw new Error('Webhook timestamp too old');

  return JSON.parse(payload);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const event = await verifyStripeSignature(payload, signature) as {
      type: string;
      data: { object: Record<string, unknown> };
    };

    // ---- Payment succeeded: milestone or change order escrow funded ----
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const metadata = (intent.metadata || {}) as Record<string, string>;
      const type = metadata['pixio_type'];

      if (type === 'escrow' && metadata['pixio_milestone_id']) {
        // Milestone is now funded — already marked as 'deposited' in the deposit-milestone action
        // Could trigger notifications here
      }

      if (type === 'change_order' && metadata['pixio_change_order_id']) {
        // Mark change order as released and create wallet transaction
        const { data: co } = await supabase
          .from('change_orders')
          .select('id, project_id, contractor_id, amount')
          .eq('id', metadata['pixio_change_order_id'])
          .maybeSingle();

        if (co) {
          const gross = co.amount;
          const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
          const net = Math.round(gross * (1 - COMMISSION_RATE) * 100) / 100;

          await supabase
            .from('change_orders')
            .update({
              status: 'released',
              released_at: new Date().toISOString(),
            })
            .eq('id', co.id);

          await supabase.from('wallet_transactions').insert({
            contractor_id: co.contractor_id,
            project_id: co.project_id,
            type: 'change_order_release',
            gross_amount: gross,
            commission_amount: commission,
            net_amount: net,
            stripe_transfer_id: intent.id as string,
          });
        }
      }
    }

    // ---- Payment intent canceled or failed: revert milestone status ----
    if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const intent = event.data.object;
      const metadata = (intent.metadata || {}) as Record<string, string>;

      if (metadata['pixio_milestone_id']) {
        await supabase
          .from('milestones')
          .update({ status: 'pending_deposit', stripe_payment_intent_id: null })
          .eq('id', metadata['pixio_milestone_id'])
          .eq('status', 'deposited');
      }
    }

    // ---- Identity verification completed ----
    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const userId = (session.metadata as Record<string, string>)?.user_id;
      if (userId) {
        await supabase.from('profiles').update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        }).eq('id', userId);
      }
    }

    // ---- Identity verification failed ----
    if (event.type === 'identity.verification_session.requires_input') {
      const session = event.data.object;
      const userId = (session.metadata as Record<string, string>)?.user_id;
      if (userId) {
        await supabase.from('profiles').update({ verification_status: 'unverified' }).eq('id', userId);
      }
    }

    // ---- Account updated: sync onboarding status ----
    if (event.type === 'account.updated') {
      const account = event.data.object;
      const accountId = account.id as string;
      const onboardingComplete = (account.details_submitted as boolean) && (account.charges_enabled as boolean);

      await supabase
        .from('profiles')
        .update({ stripe_onboarding_complete: onboardingComplete })
        .eq('stripe_account_id', accountId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
