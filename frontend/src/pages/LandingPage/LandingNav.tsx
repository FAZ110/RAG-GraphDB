import { Link } from 'react-router-dom'
import { Button, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import { AtlasBadge } from './AtlasBadge'
import { NavReveal } from './NavReveal'
import { STEP } from './story/timeline'
import { Wayfinder } from './story/Wayfinder'
import { useRegistrationOpen } from './useRegistrationOpen'

interface Props {
  step: number
  goTo: (step: number) => void
}

export function LandingNav({ step, goTo }: Props) {
  const onHero = step === STEP.hero
  const hideAuth = onHero || step === STEP.final
  const registrationOpen = useRegistrationOpen()
  return (
    <header className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-center justify-between sm:inset-x-8 lg:inset-x-12">
      <NavReveal shown={!onHero} from={-12} className="pointer-events-auto">
        <button
          type="button"
          aria-label="Atlas, początek"
          onClick={() => goTo(STEP.hero)}
          className={cn('flex items-center gap-2 font-extrabold text-fg', focusRing)}
        >
          <AtlasBadge markSize={20} className="size-9" />
          <span className="tracking-tight">Atlas</span>
        </button>
      </NavReveal>
      <div className="pointer-events-auto flex items-center gap-2">
        {registrationOpen && (
          <NavReveal shown={!hideAuth} from={12}>
            <Button asChild variant="primary" size="sm">
              <Link to="/register">Załóż konto</Link>
            </Button>
          </NavReveal>
        )}
        <NavReveal shown={!hideAuth} from={12} order={1}>
          <Button asChild variant={registrationOpen ? 'secondary' : 'primary'} size="sm">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </NavReveal>
        {/* Last, so the menu keeps its place where the sign-in buttons step aside. */}
        <Wayfinder step={step} goTo={goTo} />
      </div>
    </header>
  )
}
