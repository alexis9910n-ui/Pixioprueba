import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Category, RateCard, Profile, JobRequest, JobQuote, Milestone, ExtraWorkRequest, Message, Review, WalletTransaction } from './types';

function logQueryError(context: string, error: { message: string; code?: string; details?: string }) {
  console.error(`[Pixio DB] ${context}:`, error.message, error.code || '', error.details || '');
  return error.message;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .lt('sort_order', 900)
        .order('sort_order');
      if (error) {
        logQueryError('useCategories', error);
      } else if (data) {
        setCategories(data as Category[]);
      }
      setLoading(false);
    })();
  }, []);

  return { categories, loading };
}

export function useRateCards() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rate_cards').select('*');
      if (error) {
        logQueryError('useRateCards', error);
      } else if (data) {
        setRateCards(data as RateCard[]);
      }
    })();
  }, []);

  return rateCards;
}

export function useClientJobs(clientId: string | undefined) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) {
        logQueryError('useClientJobs', error);
      } else if (data) {
        setJobs(data as JobRequest[]);
      }
      setLoading(false);
    })();
  }, [clientId]);

  return { jobs, loading, setJobs };
}

export function useContractorJobs(contractorId: string | undefined) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractorId) { setLoading(false); return; }
    (async () => {
      const { data: quotes, error: quotesErr } = await supabase
        .from('job_quotes')
        .select('job_id')
        .eq('contractor_id', contractorId)
        .eq('status', 'accepted');
      if (quotesErr) {
        logQueryError('useContractorJobs.quotes', quotesErr);
        setLoading(false);
        return;
      }
      if (quotes && quotes.length > 0) {
        const jobIds = quotes.map((q) => q.job_id);
        const { data: reqs, error: reqsErr } = await supabase
          .from('job_requests')
          .select('*')
          .in('id', jobIds)
          .order('created_at', { ascending: false });
        if (reqsErr) {
          logQueryError('useContractorJobs.requests', reqsErr);
        } else if (reqs) {
          setJobs(reqs as JobRequest[]);
        }
      }
      setLoading(false);
    })();
  }, [contractorId]);

  return { jobs, loading };
}

export function useOpenJobs(category?: string) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from('job_requests')
        .select('*')
        .in('status', ['open', 'quote_limit_reached'])
        .order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) {
        logQueryError('useOpenJobs', error);
      } else if (data) {
        setJobs(data as JobRequest[]);
      }
      setLoading(false);
    })();
  }, [category]);

  return { jobs, loading };
}

export function useQuotes(jobId: string | undefined) {
  const [quotes, setQuotes] = useState<(JobQuote & { contractor?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('job_quotes')
        .select('*, contractor:profiles!job_quotes_contractor_id_fkey(*)')
        .eq('job_id', jobId)
        .order('proposed_amount', { ascending: true });
      if (error) {
        logQueryError('useQuotes', error);
      } else if (data) {
        setQuotes(data as (JobQuote & { contractor?: Profile })[]);
      }
      setLoading(false);
    })();
  }, [jobId]);

  return { quotes, loading, setQuotes };
}

export function useMilestones(projectId: string | undefined) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_number');
      if (error) {
        logQueryError('useMilestones', error);
      } else if (data) {
        setMilestones(data as Milestone[]);
      }
      setLoading(false);
    })();
  }, [projectId]);

  return { milestones, loading, setMilestones };
}

export function useExtraWork(jobId: string | undefined) {
  const [extraWork, setExtraWork] = useState<ExtraWorkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('extra_work_requests')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) {
        logQueryError('useExtraWork', error);
      } else if (data) {
        setExtraWork(data as ExtraWorkRequest[]);
      }
      setLoading(false);
    })();
  }, [jobId]);

  return { extraWork, loading, setExtraWork };
}

export function useMessages(projectId: string | undefined, _currentUserId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) {
        logQueryError('useMessages', error);
      } else if (data) {
        setMessages(data as Message[]);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`messages:${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  return { messages, loading };
}

export function useWalletTransactions(contractorId: string | undefined) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractorId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });
      if (error) {
        logQueryError('useWalletTransactions', error);
      } else if (data) {
        setTransactions(data as WalletTransaction[]);
      }
      setLoading(false);
    })();
  }, [contractorId]);

  return { transactions, loading };
}

export function useReviews(revieweeId: string | undefined) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!revieweeId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', revieweeId)
        .order('created_at', { ascending: false });
      if (error) {
        logQueryError('useReviews', error);
      } else if (data) {
        setReviews(data as Review[]);
      }
      setLoading(false);
    })();
  }, [revieweeId]);

  return { reviews, loading };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) logQueryError('fetchProfile', error);
  return data as Profile | null;
}

export async function fetchJobById(jobId: string): Promise<JobRequest | null> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (error) logQueryError('fetchJobById', error);
  return data as JobRequest | null;
}
