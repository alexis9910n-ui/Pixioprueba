/*
# Pixio Security Fixes — Harden trigger functions

## Overview
Fixes security advisor warnings on the two SECURITY DEFINER trigger functions:
1. update_bid_count — maintains project bid_count
2. mask_message_content — masks phone/email/URLs in messages pre-payment

## Changes
- Sets search_path to 'public' on both functions (prevents search_path injection)
- Revokes EXECUTE from anon and authenticated roles (these are trigger-only functions,
  not meant to be called directly via the REST API)
*/

ALTER FUNCTION public.update_bid_count() SET search_path = public;
ALTER FUNCTION public.mask_message_content() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_bid_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_message_content() FROM anon, authenticated;
