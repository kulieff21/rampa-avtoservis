// GET /api/floor — the same public data the home page's live floor uses: which bay
// is busy when and which parts are being worked on. No names, phones or cars.
// Other sites may read it (the author's portfolio shows the floor live).

import { getFloor } from "@/lib/queries";

export async function GET() {
  const floor = await getFloor();
  return Response.json(floor, {
    headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
  });
}
