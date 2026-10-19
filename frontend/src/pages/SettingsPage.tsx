import { EmptyState } from '@/components/deck'
import { PageHeader } from '@/components/layout/PageHeader'

export function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <PageHeader title="Ustawienia" />
      <EmptyState title="Tu znajdą się ustawienia aplikacji" className="min-h-80">
        Domyślny model językowy, wygląd oraz eksport i import danych.
      </EmptyState>
    </div>
  )
}
