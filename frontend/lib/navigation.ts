/** Full-page navigation (SSO redirects need a real page load). A module so tests can mock it. */
export function navigate(url: string): void {
  window.location.assign(url);
}

export function replace(url: string): void {
  window.location.replace(url);
}
