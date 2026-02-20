import { supabase } from './supabase';

interface EmailParams {
  [key: string]: string | number;
}

export type EmailEventType =
  | 'account_created'
  | 'booking_created'
  | 'booking_cancelled'
  | 'participant_added'
  | 'participant_accepted'
  | 'participant_declined'
  | 'refund_approved'
  | 'refund_rejected'
  | 'password_reset';

export async function sendEmail(
  to: string,
  eventType: EmailEventType,
  params?: EmailParams
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        eventType,
        params: params || {},
      }),
    });

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    return false;
  }
}

export async function sendUserNotification(
  userId: string,
  eventType: EmailEventType,
  params?: EmailParams
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-notification`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        eventType,
        params: params || {},
      }),
    });

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    return false;
  }
}
