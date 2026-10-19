import { MobileNav } from './MobileNav'
import { Rail } from './Rail'
import { useCurrentSpace } from './useCurrentSpace'

export function Navbar() {
  const { space, spaces } = useCurrentSpace()
  return (
    <>
      <MobileNav space={space} spaces={spaces} />
      <Rail space={space} spaces={spaces} />
    </>
  )
}
