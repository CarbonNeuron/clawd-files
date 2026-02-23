import { authenticate, AuthError, generateDashboardToken } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    if (auth.type !== "admin") {
      return jsonError(
        "Forbidden",
        "Only admins can generate dashboard links.",
        403,
      );
    }

    const token = generateDashboardToken();
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return jsonSuccess({
      url: `${baseUrl}/admin?token=${token}`,
      expires_in: "24h",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
