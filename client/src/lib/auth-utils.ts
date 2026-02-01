export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    const returnTo = encodeURIComponent(window.location.href);
    // redirect to client-side auth page which starts Supabase OAuth or manual login
    window.location.href = `/auth?returnTo=${returnTo}`;
  }, 500);
}
