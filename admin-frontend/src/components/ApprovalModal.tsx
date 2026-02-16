import { useState } from 'react';

interface ApprovalModalProps {
  title: string;
  message: string;
  actionType: 'approve' | 'reject';
  onConfirm: (notes?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ApprovalModal({
  title,
  message,
  actionType,
  onConfirm,
  onCancel,
  isLoading = false
}: ApprovalModalProps) {
  const [includeMessage, setIncludeMessage] = useState(false);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (includeMessage && !notes.trim()) {
      alert('Voer een bericht in of schakel de checkbox uit');
      return;
    }
    
    onConfirm(includeMessage ? notes : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-gray-400 mb-4">{message}</p>

        {/* Optional message checkbox */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeMessage}
            onChange={(e) => setIncludeMessage(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-white">Bericht toevoegen</span>
        </label>

        {/* Message textarea (only if checkbox checked) */}
        {includeMessage && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bericht voor medewerker..."
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 mb-4"
            rows={4}
            autoFocus
          />
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Annuleren
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition ${
              actionType === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:bg-neutral-700`}
          >
            {isLoading ? 'Bezig...' : actionType === 'approve' ? 'Goedkeuren' : 'Afwijzen'}
          </button>
        </div>
      </div>
    </div>
  );
}
