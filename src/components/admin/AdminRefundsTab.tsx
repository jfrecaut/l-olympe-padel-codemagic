import { useState } from 'react';
import { Archive, Check, X, Clock, User, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { Refund } from '../../types';
import { RefundsArchiveTable } from './RefundsArchiveTable';

interface AdminRefundsTabProps {
  refunds: Refund[];
  onApprove: (refundId: string) => Promise<void>;
  onReject: (refundId: string, reason: string) => Promise<void>;
}

export function AdminRefundsTab({ refunds, onApprove, onReject }: AdminRefundsTabProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const archivedRefunds = refunds.filter(r => r.status !== 'pending');

  const handleApprove = async (refundId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir approuver ce remboursement ?')) return;
    setLoading(refundId);
    try {
      await onApprove(refundId);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (refundId: string) => {
    if (!rejectionReason.trim()) {
      alert('Veuillez indiquer une raison pour le refus');
      return;
    }
    setLoading(refundId);
    try {
      await onReject(refundId, rejectionReason);
      setRejectingId(null);
      setRejectionReason('');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Gestion des remboursements</h2>
          {pendingRefunds.length > 0 && (
            <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold text-white bg-red-500 rounded-full">
              {pendingRefunds.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition"
        >
          <Archive size={20} />
          {showArchived ? 'Voir les en attente' : 'Voir les archives'}
        </button>
      </div>

      {showArchived ? (
        <RefundsArchiveTable refunds={archivedRefunds} />
      ) : pendingRefunds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Aucun remboursement en attente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRefunds.map((refund) => (
            <div
              key={refund.id}
              className="bg-white rounded-lg shadow-sm border-2 border-orange-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {refund.booking?.court?.name || 'Court'}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      En attente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={16} />
                        <span>
                          {refund.profile?.first_name} {refund.profile?.last_name} (@{refund.profile?.username})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} />
                        <span>Réservation: {formatDate(refund.booking?.booking_date || '')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard size={16} />
                        <span className="font-semibold">Montant: {(refund.amount / 100).toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={16} />
                        <span>Créée le: {formatDateTime(refund.booking?.created_at || '')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={16} />
                        <span>Annulée le: {formatDateTime(refund.cancelled_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            refund.cancelled_by === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          Annulée par: {refund.cancelled_by === 'admin' ? 'Admin' : 'Client'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <>
                {rejectingId === refund.id ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Indiquez la raison du refus..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(refund.id)}
                          disabled={loading === refund.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                        >
                          <X size={18} />
                          Confirmer le refus
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                          disabled={loading === refund.id}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleApprove(refund.id)}
                        disabled={loading === refund.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                      >
                        <Check size={18} />
                        Approuver
                      </button>
                      <button
                        onClick={() => setRejectingId(refund.id)}
                        disabled={loading === refund.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                      >
                        <X size={18} />
                        Refuser
                      </button>
                    </div>
                  )}
              </>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
