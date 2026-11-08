import { Navigate, useSearchParams } from 'react-router-dom'
import { safeNext } from './nextPath'

/** Once signed in on /login or /register, go on to the page that was asked for. */
export function AfterSignIn() {
  const [params] = useSearchParams()
  return <Navigate to={safeNext(params.get('next'))} replace />
}
