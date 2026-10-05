import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

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

function formEncode(obj: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (url.pathname.split('/').pop() || '');
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // ---- Create Stripe Connect account (onboarding) ----
    if (action === 'create-account') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, stripe_account_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      let accountId = profile.stripe_account_id;

      if (!accountId) {
        const account = await stripeFetch('accounts', {
          method: 'POST',
          body: formEncode({
            type: 'express',
            'metadata[pixio_user_id]': user.id,
          }),
        });
        accountId = account.id;
        await supabase
          .from('profiles')
          .update({ stripe_account_id: accountId })
          .eq('id', user.id);
      }

      const origin = req.headers.get('origin') || 'http://localhost:5173';
      const link = await stripeFetch('account_links', {
        method: 'POST',
        body: formEncode({
          account: accountId,
          'refresh_url': `${origin}/stripe-refresh`,
          'return_url': `${origin}/stripe-return`,
          type: 'account_onboarding',
        }),
      });

      return new Response(JSON.stringify({ url: link.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Check Stripe account status ----
    if (action === 'account-status') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.stripe_account_id) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const account = await stripeFetch(`accounts/${profile.stripe_account_id}`);
      const onboardingComplete = account.details_submitted && account.charges_enabled;
      if (onboardingComplete !== profile.stripe_onboarding_complete) {
        await supabase
          .from('profiles')
          .update({ stripe_onboarding_complete: onboardingComplete })
          .eq('id', user.id);
      }

      return new Response(JSON.stringify({
        connected: true,
        onboarding_complete: onboardingComplete,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Create escrow payment intent for milestone deposit ----
    if (action === 'deposit-milestone') {
      const { milestone_id } = body;
      if (!milestone_id) throw new Error('milestone_id required');

      const { data: milestone } = await supabase
        .from('milestones')
        .select('id, project_id, amount, status')
        .eq('id', milestone_id)
        .maybeSingle();
      if (!milestone) throw new Error('Milestone not found');
      if (milestone.status !== 'pending_deposit') throw new Error('Milestone already deposited');

      const { data: project } = await supabase
        .from('projects')
        .select('client_id, title')
        .eq('id', milestone.project_id)
        .maybeSingle();
      if (!project) throw new Error('Project not found');
      if (project.client_id !== user.id) throw new Error('Only the client can deposit');

      const { data: bid } = await supabase
        .from('bids')
        .select('contractor_id')
        .eq('project_id', milestone.project_id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!bid) throw new Error('No accepted bid');

      const { data: contractor } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', bid.contractor_id)
        .maybeSingle();

      const intent = await stripeFetch('payment_intents', {
        method: 'POST',
        body: formEncode({
          amount: Math.round(milestone.amount * 100),
          currency: 'usd',
          'metadata[pixio_project_id]': milestone.project_id,
          'metadata[pixio_milestone_id]': milestone.id,
          'metadata[pixio_type]': 'escrow',
          'transfer_data[destination]': contractor?.stripe_account_id || '',
          'transfer_data[amount]': Math.round(milestone.amount * 100 * (1 - COMMISSION_RATE)),
          'application_fee_amount': Math.round(milestone.amount * 100 * COMMISSION_RATE),
        }),
      });

      await supabase
        .from('milestones')
        .update({
          status: 'deposited',
          stripe_payment_intent_id: intent.id,
        })
        .eq('id', milestone.id);

      return new Response(JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Mark milestone work completed (start 48h release timer) ----
    if (action === 'complete-milestone') {
      const { milestone_id, proof_photos } = body;
      if (!milestone_id) throw new Error('milestone_id required');

      const { data: milestone } = await supabase
        .from('milestones')
        .select('id, project_id, status')
        .eq('id', milestone_id)
        .maybeSingle();
      if (!milestone) throw new Error('Milestone not found');
      if (milestone.status !== 'deposited') throw new Error('Milestone must be deposited first');

      const { data: bid } = await supabase
        .from('bids')
        .select('contractor_id')
        .eq('project_id', milestone.project_id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!bid || bid.contractor_id !== user.id) throw new Error('Only the contractor can mark complete');

      const releaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('milestones')
        .update({
          status: 'work_completed',
          completed_at: new Date().toISOString(),
          release_scheduled_at: releaseAt,
          proof_photo_urls: proof_photos || [],
        })
        .eq('id', milestone.id);

      return new Response(JSON.stringify({
        release_scheduled_at: releaseAt,
        hours_until_release: 48,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Release milestone funds (after 48h or manual) ----
    if (action === 'release-milestone') {
      const { milestone_id } = body;
      if (!milestone_id) throw new Error('milestone_id required');

      const { data: milestone } = await supabase
        .from('milestones')
        .select('id, project_id, amount, status, release_scheduled_at, stripe_payment_intent_id')
        .eq('id', milestone_id)
        .maybeSingle();
      if (!milestone) throw new Error('Milestone not found');
      if (milestone.status !== 'work_completed' && milestone.status !== 'release_scheduled') {
        throw new Error('Milestone not ready for release');
      }

      const { data: bid } = await supabase
        .from('bids')
        .select('contractor_id')
        .eq('project_id', milestone.project_id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!bid) throw new Error('No accepted bid');

      const gross = milestone.amount;
      const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
      const net = Math.round(gross * (1 - COMMISSION_RATE) * 100) / 100;

      await supabase
        .from('milestones')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      await supabase.from('wallet_transactions').insert({
        contractor_id: bid.contractor_id,
        project_id: milestone.project_id,
        type: 'milestone_release',
        gross_amount: gross,
        commission_amount: commission,
        net_amount: net,
        stripe_transfer_id: milestone.stripe_payment_intent_id,
      });

      return new Response(JSON.stringify({
        released: true,
        gross_amount: gross,
        commission_amount: commission,
        net_amount: net,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Create change order payment ----
    if (action === 'approve-change-order') {
      const { change_order_id } = body;
      if (!change_order_id) throw new Error('change_order_id required');

      const { data: co } = await supabase
        .from('change_orders')
        .select('id, project_id, amount, status, contractor_id')
        .eq('id', change_order_id)
        .maybeSingle();
      if (!co) throw new Error('Change order not found');
      if (co.status !== 'pending_approval') throw new Error('Change order not pending');

      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', co.project_id)
        .maybeSingle();
      if (!project || project.client_id !== user.id) throw new Error('Only the client can approve');

      const { data: contractor } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', co.contractor_id)
        .maybeSingle();

      const intent = await stripeFetch('payment_intents', {
        method: 'POST',
        body: formEncode({
          amount: Math.round(co.amount * 100),
          currency: 'usd',
          'metadata[pixio_project_id]': co.project_id,
          'metadata[pixio_change_order_id]': co.id,
          'metadata[pixio_type]': 'change_order',
          'transfer_data[destination]': contractor?.stripe_account_id || '',
          'transfer_data[amount]': Math.round(co.amount * 100 * (1 - COMMISSION_RATE)),
          'application_fee_amount': Math.round(co.amount * 100 * COMMISSION_RATE),
        }),
      });

      await supabase
        .from('change_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          stripe_payment_intent_id: intent.id,
        })
        .eq('id', co.id);

      return new Response(JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Create dashboard link for contractor to manage Stripe account ----
    if (action === 'dashboard-link') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.stripe_account_id) throw new Error('No Stripe account connected');

      const link = await stripeFetch('account_links', {
        method: 'POST',
        body: formEncode({
          account: profile.stripe_account_id,
          'refresh_url': `${req.headers.get('origin') || 'http://localhost:5173'}/wallet`,
          'return_url': `${req.headers.get('origin') || 'http://localhost:5173'}/wallet`,
          type: 'account_onboarding',
        }),
      });

      return new Response(JSON.stringify({ url: link.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
