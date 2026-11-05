import { expect, test } from '@playwright/test'

test('dev account signs in, creates a space and opens a new analysis', async ({ page }) => {
  const name = `e2e-${Date.now()}`

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible()
  await page.getByRole('button', { name: /anna@atlas\.test/ }).click()
  await expect(page.getByRole('button', { name: 'Wyloguj' })).toBeVisible()

  await page.getByRole('link', { name: 'Przestrzenie' }).click()
  await page.getByRole('button', { name: 'Nowa przestrzeń' }).click()
  await page.getByRole('textbox', { name: 'Nazwa nowej przestrzeni' }).fill(name)
  const created = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/spaces')
  )
  await page.getByRole('button', { name: 'Utwórz' }).click()
  const spaceId: string = (await (await created).json()).id

  // From here on the space exists, so it is removed whatever fails below.
  try {
    await expect(page).toHaveURL(new RegExp(`/spaces/${spaceId}$`))

    await page.getByRole('link', { name: 'Analizy', exact: true }).click()
    await page.getByRole('link', { name: `Nowa analiza w przestrzeni ${name}` }).click()
    await expect(page).toHaveURL(new RegExp(`/analyses/${spaceId}/new$`))

    // shortcut: stops at the unsaved draft; saving needs an entity on the canvas, and a fresh
    // space has none without extraction (LLM). Saving is covered by tests/integration/test_analyses.py.
    await expect(page.getByRole('textbox', { name: 'Nazwa analizy' })).toHaveValue('Nowa analiza')
  } finally {
    // Same origin as the app, so the session cookie and the CSRF check both pass.
    const origin = new URL(page.url()).origin
    const res = await page.request.delete(`/api/spaces/${spaceId}`, { headers: { Origin: origin } })
    expect(res.status()).toBe(204)
  }
})
