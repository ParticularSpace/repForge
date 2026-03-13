export default function ConfirmDialog({
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
        <p className="text-sm text-gray-700 text-center mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-semibold text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
