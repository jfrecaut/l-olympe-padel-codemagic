import { useState, useEffect, useRef, useMemo } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard, Loader } from 'lucide-react';
import { CheckoutForm } from './CheckoutForm';
import { paymentService, stripeService } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface StripePaymentProps {
  bookingId: string;
  totalAmount: number;
  amountPaid?: number;
  playersCount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePayment({
  bookingId,
  totalAmount,
  amountPaid = 0,
  playersCount,
  onSuccess,
  onCancel,
}: StripePaymentProps) {
  const { profile } = useAuth();
  const [paymentType, setPaymentType] = useState<'partial' | 'full' | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentLogId, setPaymentLogId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null);


  const partialAmount = Math.round(totalAmount / playersCount);
  const remainingAmount = totalAmount - amountPaid;
  const hasPartialPayment = amountPaid > 0 && amountPaid < totalAmount;

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;

    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#10b981',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: '0.5rem',
        },
      },
    };
  }, [clientSecret]);

  useEffect(() => {
    loadStripeConfig();
  }, []);

  const loadStripeConfig = async () => {
    if (stripePromiseRef.current) {
      setStripePromise(stripePromiseRef.current);
      setLoading(false);
      return;
    }

    try {
      const publishableKey = await stripeService.getActivePublishableKey();

      if (!publishableKey) {
        throw new Error('Stripe n\'est pas configuré');
      }

      const promise = loadStripe(publishableKey);
      stripePromiseRef.current = promise;
      setStripePromise(promise);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger Stripe');
      setLoading(false);
    }
  };

  const handlePaymentTypeSelect = async (type: 'partial' | 'full') => {
    if (!profile) {
      return;
    }

    setPaymentType(type);
    setLoading(true);
    setError('');

    try {
      let amount: number;
      let actualPaymentType: 'partial' | 'full';

      if (hasPartialPayment) {
        amount = remainingAmount;
        actualPaymentType = 'full';
      } else {
        amount = type === 'full' ? totalAmount : partialAmount;
        actualPaymentType = type;
      }

      const { clientSecret: secret, paymentLogId: logId } = await paymentService.createPaymentIntent({
        bookingId,
        userId: profile.id,
        amount,
        paymentType: actualPaymentType,
      });

      setClientSecret(secret);
      setPaymentLogId(logId);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Impossible de créer le paiement');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="text-emerald-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Paiement</h2>
        </div>
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <button
          onClick={onCancel}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
        >
          Retour
        </button>
      </div>
    );
  }

  if (loading || !stripePromise) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader className="animate-spin text-emerald-500" size={24} />
          <span className="text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!paymentType) {
    if (hasPartialPayment) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="text-emerald-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Paiement du solde</h2>
          </div>

          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="text-sm text-teal-700 mb-2">
              Un paiement partiel a déjà été effectué
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-teal-600">Montant payé:</span>
              <span className="text-lg font-bold text-teal-900">{(amountPaid / 100).toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between border-t border-teal-200 mt-2 pt-2">
              <span className="text-sm text-teal-600">Reste à payer:</span>
              <span className="text-2xl font-bold text-teal-900">{(remainingAmount / 100).toFixed(2)} €</span>
            </div>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={() => handlePaymentTypeSelect('full')}
              className="w-full px-4 py-4 rounded-lg font-medium transition bg-emerald-500 text-white hover:bg-emerald-600 border-2 border-emerald-500"
            >
              <div className="text-sm mb-1">Payer le solde</div>
              <div className="text-3xl font-bold">{(remainingAmount / 100).toFixed(2)} €</div>
            </button>
          </div>

          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Annuler
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="text-emerald-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Paiement</h2>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choisissez le montant à payer
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handlePaymentTypeSelect('partial')}
              className="px-4 py-4 rounded-lg font-medium transition bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:border-emerald-500 border-2 border-transparent"
            >
              <div className="text-sm text-gray-600 mb-1">Ma part</div>
              <div className="text-2xl font-bold text-gray-900">{(partialAmount / 100).toFixed(2)} €</div>
              <div className="text-xs text-gray-500 mt-1">{playersCount === 2 ? 'Terrain simple' : 'Terrain double'}</div>
            </button>
            <button
              type="button"
              onClick={() => handlePaymentTypeSelect('full')}
              className="px-4 py-4 rounded-lg font-medium transition bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:border-emerald-500 border-2 border-transparent"
            >
              <div className="text-sm text-gray-600 mb-1">Totalité</div>
              <div className="text-2xl font-bold text-gray-900">{(totalAmount / 100).toFixed(2)} €</div>
              <div className="text-xs text-gray-500 mt-1">Montant complet</div>
            </button>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
        >
          Annuler
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader className="animate-spin text-emerald-500" size={24} />
          <span className="text-gray-600">Préparation du paiement...</span>
        </div>
      </div>
    );
  }

  const amount = hasPartialPayment ? remainingAmount : (paymentType === 'full' ? totalAmount : partialAmount);

  if (!elementsOptions || !stripePromise) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader className="animate-spin text-emerald-500" size={24} />
          <span className="text-gray-600">Chargement du formulaire de paiement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="text-emerald-500" size={24} />
        <h2 className="text-xl font-semibold text-gray-900">Paiement</h2>
      </div>

      <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="text-sm text-emerald-700">
          {paymentType === 'full' ? 'Paiement complet' : 'Paiement de votre part'}
        </div>
        <div className="text-xl font-bold text-emerald-900 mt-1">
          {(amount / 100).toFixed(2)} €
        </div>
      </div>

      <Elements
        stripe={stripePromise}
        options={elementsOptions}
      >
        <CheckoutForm
          bookingId={bookingId}
          totalAmount={totalAmount}
          amountPaid={amountPaid}
          playersCount={playersCount}
          clientSecret={clientSecret}
          paymentLogId={paymentLogId}
          paymentType={paymentType}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}
