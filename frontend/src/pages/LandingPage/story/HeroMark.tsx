import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { AtlasLandmark } from '@/components/nav/AtlasLandmark'

/** The mark as a landmark laid over the map; the lines clear around the words above it. */
export function HeroMark() {
  return (
    <>
      <ContourBackdrop
        color="var(--ink-steel)"
        className="absolute inset-0 mask-[radial-gradient(ellipse_50%_44%_at_50%_40%,transparent_55%,black_100%)]"
      />
      <AtlasLandmark
        className="top-[34%] -right-[34vw] sm:-right-[12vw] lg:top-[-14vh] lg:-right-[22vw] [&_svg]:size-[120vw] lg:[&_svg]:size-[128vh]"
        ground="var(--page)"
        tint="text-(--pastel-sky) opacity-75"
      />
    </>
  )
}
