import { NextResponse } from "next/server";

export function jsonSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, hint: string, status = 400) {
  return NextResponse.json({ error, hint }, { status });
}

export function jsonNotFound(
  error = "Not found",
  hint = "The resource does not exist or has expired.",
) {
  return jsonError(error, hint, 404);
}
