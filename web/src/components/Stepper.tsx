import { AppStep } from '../types'

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'review', label: 'Review' },
  { key: 'output', label: 'Output' },
]

const STEP_ORDER: AppStep[] = ['upload', 'analyzing', 'review', 'output']
const NON_CLICKABLE: AppStep[] = ['analyzing']

interface StepperProps {
  currentStep: AppStep
  onNavigate?: (step: AppStep) => void
}

export function Stepper({ currentStep, onNavigate }: StepperProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep)

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex
        const isActive = i === currentIndex
        const isClickable = isCompleted && !NON_CLICKABLE.includes(step.key) && onNavigate

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-[#10b981] text-white'
                    : isActive
                      ? 'bg-[#065f46] text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#065f46]'
                    : isCompleted
                      ? isClickable
                        ? 'text-[#10b981] cursor-pointer hover:text-[#059669] underline underline-offset-2 decoration-dotted'
                        : 'text-[#10b981]'
                      : 'text-gray-400'
                }`}
                onClick={() => isClickable && onNavigate(step.key)}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-12 ${i < currentIndex ? 'bg-[#10b981]' : 'bg-gray-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
