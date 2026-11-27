export function sandboxGatewayUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.origin === "https://sandbox.sslcommerz.com" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
