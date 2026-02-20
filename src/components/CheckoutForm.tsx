import { useState, FormEvent, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Loader } from 'lucide-react';
import { paymentService, bookingService } from '../services';

interface CheckoutFormProps {
  bookingId: string;
  totalAmount: number;
  amountPaid?: number;
  playersCount: number;
  clientSecret: string;
  paymentLogId: string;
  paymentType: 'partial' | 'full';
  onSuccess: () => void;
  onCancel: () => void;
}

export function CheckoutForm({
  bookingId,
  totalAmount,
  amountPaid = 0,
  playersCount,
  clientSecret,
  paymentLogId,
  paymentType,
  onSuccess,
  onCancel,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!paymentElementReady) {
        setError('Le formulaire de paiement ne se charge pas. Cela peut être dû à des restrictions de votre navigateur ou de l\'environnement. Vérifiez que les iframes et requêtes vers stripe.com ne sont pas bloquées.');
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [paymentElementReady, stripe, elements, clientSecret]);

  const partialAmount = Math.round(totalAmount / playersCount);
  const remainingAmount = totalAmount - amountPaid;
  const hasPartialPayment = amountPaid > 0 && amountPaid < totalAmount;

  const amount = hasPartialPayment ? remainingAmount : (paymentType === 'full' ? totalAmount : partialAmount);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe n\'est pas encore chargé');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        await paymentService.updatePaymentStatus(paymentLogId, 'succeeded');

        const booking = await bookingService.getById(bookingId);
        if (!booking) {
          throw new Error('Réservation introuvable');
        }

        const currentPayment = hasPartialPayment ? remainingAmount : (paymentType === 'full' ? totalAmount : partialAmount);
        const newAmountPaid = (booking.amount_paid || 0) + currentPayment;

        let newStatus = 'pending_payment';
        if (newAmountPaid >= totalAmount) {
          newStatus = 'payment_completed';
        } else if (newAmountPaid > 0) {
          newStatus = 'partial_payment_completed';
        }

        await bookingService.updatePaymentStatus(bookingId, newStatus, newAmountPaid);
        onSuccess();
      } else {
        throw new Error('Le paiement n\'a pas abouti');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du paiement');
      await paymentService.updatePaymentStatus(paymentLogId, 'failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de carte bancaire
        </label>
        <div className="bg-white min-h-[120px] relative border rounded-lg p-3">
          {!paymentElementReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader className="animate-spin text-emerald-500" size={24} />
            </div>
          )}
          <PaymentElement
            id="payment-element"
            onReady={() => {
              setPaymentElementReady(true);
            }}
            onLoadError={(error) => {
              setError('Impossible de charger le formulaire de paiement: ' + (error?.message || 'Erreur inconnue'));
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pour tester, utilisez: 4242 4242 4242 4242
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={18} />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Payer {(amount / 100).toFixed(2)} €
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
        >
          Annuler
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Paiement sécurisé par Stripe
      </div>
    </form>
  );
}
