import { Navigate, useLocation } from 'react-router-dom'
import { signInPath } from './nextPath'

/** A signed-out visit to a page of the app goes to sign-in, remembering where it was headed. */
export function SignInRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={signInPath(pathname + search)} replace />
}
