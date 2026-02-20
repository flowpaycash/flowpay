import { getCorsHeaders } from "../../../../services/api/config.mjs";
import {
  clearAdminSessionCookie,
  withAdminNoStoreHeaders,
} from "../../../../services/api/admin-auth.mjs";

export const POST = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
    "Content-Type": "application/json",
  });

  clearAdminSessionCookie(cookies);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
};

export const OPTIONS = async ({ request }) => {
  const headers = withAdminNoStoreHeaders(
    getCorsHeaders({ headers: Object.fromEntries(request.headers) })
  );
  return new Response(null, { status: 204, headers });
};
