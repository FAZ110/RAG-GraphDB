import { PageHeader } from '@/components/layout/PageHeader'
import { CustomProviderSection } from '@/components/settings/CustomProviderSection'

export function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <PageHeader title="Ustawienia" />
      <CustomProviderSection />
    </div>
  )
}
