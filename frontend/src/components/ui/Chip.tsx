interface ChipProps {
  label: string
  selected: boolean
  onClick: () => void
}

export default function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        selected
          ? 'bg-teal-600 border-teal-600 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
      }`}
    >
      {label}
    </button>
  )
}
