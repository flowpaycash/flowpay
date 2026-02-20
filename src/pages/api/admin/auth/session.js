import { getCorsHeaders } from "../../../../services/api/config.mjs";
import {
  getAdminSession,
  withAdminNoStoreHeaders,
} from "../../../../services/api/admin-auth.mjs";

export const GET = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
    "Content-Type": "application/json",
  });

  const session = getAdminSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      expiresAt: session.exp,
    }),
    {
      status: 200,
      headers,
    }
  );
};

export const OPTIONS = async ({ request }) => {
  const headers = withAdminNoStoreHeaders(
    getCorsHeaders({ headers: Object.fromEntries(request.headers) })
  );
  return new Response(null, { status: 204, headers });
};
