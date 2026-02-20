import { supabase } from '../lib/supabase';
import { StripeSettings } from '../types';

export const stripeService = {
  // SECURITY: This function returns ALL settings including secret keys.
  // It should ONLY be used in admin contexts. RLS ensures only admins can access this data.
  async getSettings(): Promise<StripeSettings[]> {
    const { data, error } = await supabase
      .from('stripe_settings')
      .select('*')
      .order('environment');

    if (error) throw error;
    return data || [];
  },

  // SECURITY: Use getActivePublishableKey() instead for client-side needs.
  // This method is deprecated and should not be used as it exposes secret keys.
  async getActiveSettings(): Promise<StripeSettings | null> {
    console.warn('SECURITY WARNING: getActiveSettings() exposes secret keys. Use getActivePublishableKey() instead.');
    const { data, error } = await supabase
      .from('stripe_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getActivePublishableKey(): Promise<string | null> {
    const { data, error } = await supabase
      .rpc('get_active_stripe_publishable_key');

    if (error) throw error;
    return data;
  },

  async upsertSettings(settings: Omit<StripeSettings, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const { error } = await supabase
      .from('stripe_settings')
      .upsert({
        environment: settings.environment,
        is_active: settings.is_active,
        publishable_key: settings.publishable_key,
        secret_key: settings.secret_key,
        webhook_secret: settings.webhook_secret,
      }, {
        onConflict: 'environment',
      });

    if (error) throw error;
  },

  async setActiveEnvironment(environment: 'staging' | 'production'): Promise<void> {
    await supabase.from('stripe_settings').update({ is_active: false }).neq('environment', environment);

    const { error } = await supabase
      .from('stripe_settings')
      .update({ is_active: true })
      .eq('environment', environment);

    if (error) throw error;
  },
};
