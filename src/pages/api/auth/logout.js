import { getCorsHeaders } from "../../../services/api/config.mjs";

export const POST = async ({ request, cookies }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  cookies.set("flowpay_session", "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
};

export const OPTIONS = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  return new Response(null, { status: 204, headers });
};
