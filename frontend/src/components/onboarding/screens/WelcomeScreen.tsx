export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <div className="mb-8">
        <h1 className="text-5xl font-extrabold text-teal-600 tracking-tight mb-3">RepFlow</h1>
        <p className="text-xl font-semibold text-gray-800 mb-4">Your AI-powered gym companion.</p>
        <p className="text-base text-gray-500 leading-relaxed">
          Walk in. Generate a workout. Track every set.
          <br />
          No more staring at machines wondering what to do.
        </p>
      </div>
    </div>
  )
}
