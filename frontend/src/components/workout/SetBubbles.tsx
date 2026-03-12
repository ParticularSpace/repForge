interface SetBubblesProps {
  totalSets: number
  completedSets: number
  onTap: (setIndex: number) => void
}

export default function SetBubbles({ totalSets, completedSets, onTap }: SetBubblesProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {Array.from({ length: totalSets }, (_, i) => {
        const isDone = i < completedSets
        const isCurrent = i === completedSets

        let cls = 'w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all select-none '
        if (isDone) cls += 'bg-teal-600 border-teal-600 text-white'
        else if (isCurrent) cls += 'border-teal-600 text-teal-600 cursor-pointer active:scale-95'
        else cls += 'border-gray-200 text-gray-400 cursor-default'

        return (
          <button
            key={i}
            className={cls}
            onClick={() => isCurrent && onTap(i)}
            disabled={!isCurrent}
            aria-label={`Set ${i + 1}${isDone ? ' (done)' : isCurrent ? ' (tap to complete)' : ''}`}
          >
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}
