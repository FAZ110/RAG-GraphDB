import { Link } from 'react-router-dom'
import { Button } from '@/components/deck'
import { useRegistrationOpen } from './useRegistrationOpen'

export function AuthLinks() {
  const registrationOpen = useRegistrationOpen()
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {registrationOpen && (
        <Button asChild variant="primary" size="xl">
          <Link to="/register">Załóż konto</Link>
        </Button>
      )}
      <Button asChild variant={registrationOpen ? 'secondary' : 'primary'} size="xl">
        <Link to="/login">Zaloguj się</Link>
      </Button>
    </div>
  )
}
