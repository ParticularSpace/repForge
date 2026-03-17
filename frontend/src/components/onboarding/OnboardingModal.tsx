import { useState } from 'react'
import WelcomeScreen from './screens/WelcomeScreen'
import GenerateScreen from './screens/GenerateScreen'
import TrackScreen from './screens/TrackScreen'
import BuildScreen from './screens/BuildScreen'
import ProfileScreen from './screens/ProfileScreen'
import ProScreen from './screens/ProScreen'

interface ScreenProps {
  onNext?: () => void
  onSkip?: () => void
}

interface Props {
  onComplete: () => void
}

// Screens that receive no props use a simple wrapper
const STATIC_SCREENS = [WelcomeScreen, GenerateScreen, TrackScreen, BuildScreen]
const TOTAL = 6

export default function OnboardingModal({ onComplete }: Props) {
  const [current, setCurrent] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const goTo = (n: number, dir: 'forward' | 'back') => {
    setDirection(dir)
    setCurrent(n)
  }

  const next = () => {
    if (current < TOTAL) goTo(current + 1, 'forward')
  }
  const back = () => {
    if (current > 1) goTo(current - 1, 'back')
  }
  const skip = () => goTo(TOTAL, 'forward')

  const isFinal = current === TOTAL
  const isProfileScreen = current === 5

  const renderScreen = () => {
    if (current <= 4) {
      const Screen = STATIC_SCREENS[current - 1] as React.FC<ScreenProps>
      return <Screen />
    }
    if (current === 5) {
      return <ProfileScreen onNext={next} onSkip={skip} />
    }
    return <ProScreen />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ height: '88dvh', maxHeight: '700px' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
          {current > 1 ? (
            <button onClick={back} className="text-sm text-gray-400 font-medium py-1 px-2 -ml-2">
              ← Back
            </button>
          ) : (
            <div className="w-16" />
          )}

          {!isFinal && !isProfileScreen && (
            <button onClick={skip} className="text-sm text-gray-400 font-medium py-1 px-2 -mr-2">
              Skip
            </button>
          )}
          {isProfileScreen && (
            <button onClick={skip} className="text-sm text-gray-400 font-medium py-1 px-2 -mr-2">
              Skip for now →
            </button>
          )}
          {isFinal && <div className="w-24" />}
        </div>

        {/* Screen content */}
        <div
          key={current}
          className={`flex-1 flex flex-col overflow-hidden ${
            direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {renderScreen()}
        </div>

        {/* Bottom controls — hidden for profile screen (has its own button) */}
        {!isProfileScreen && (
          <div className="px-6 pb-8 pt-4 shrink-0 flex flex-col items-center gap-4">
            {/* Progress dots */}
            <div className="flex gap-2 justify-center">
              {Array.from({ length: TOTAL }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    i + 1 === current ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {isFinal ? (
              <button
                onClick={onComplete}
                className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base"
              >
                Get started — it's free
              </button>
            ) : (
              <button
                onClick={next}
                className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base"
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* Progress dots for profile screen (no action button — screen has its own) */}
        {isProfileScreen && (
          <div className="px-6 pb-6 pt-2 shrink-0 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: TOTAL }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    i + 1 === current ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
