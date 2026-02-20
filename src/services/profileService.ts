import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { sendEmail } from '../lib/emailService';

interface CreateUserData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'manager' | 'player';
}

export const profileService = {
  async getAll(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(userData: CreateUserData): Promise<void> {
    const { error } = await supabase.rpc('create_user', {
      user_email: userData.email,
      user_password: userData.password,
      user_username: userData.username,
      user_first_name: userData.firstName,
      user_last_name: userData.lastName,
      user_phone: userData.phone,
      user_role: userData.role,
    });

    if (error) throw error;

    if (userData.role === 'player') {
      await sendEmail(userData.email, 'account_created', {
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
      });
    }
  },

  async update(userId: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  },

  async updateEmail(userId: string, newEmail: string): Promise<void> {
    const { error } = await supabase.rpc('update_user_email', {
      target_user_id: userId,
      new_email: newEmail,
    });

    if (error) throw error;
  },

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.rpc('update_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    });

    if (error) throw error;
  },

  async getEmail(userId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_user_email', {
      target_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  async deactivate(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;
  },

  async searchPlayers(query: string, excludeUserId: string, alreadyAddedIds: string[]): Promise<Profile[]> {
    // Sanitize query to prevent issues with special characters in ILIKE patterns
    // Escape % and _ characters which are wildcards in SQL LIKE/ILIKE
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .eq('is_active', true)
      .neq('id', excludeUserId)
      .or(`username.ilike.%${sanitizedQuery}%,first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`)
      .limit(10);

    if (error) throw error;
    return (data || []).filter(p => !alreadyAddedIds.includes(p.id));
  },
};
