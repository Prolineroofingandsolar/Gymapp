export function GET() {
  return Response.json({
    name: "Cadence",
    short_name: "Cadence",
    description: "Keep your members in rhythm.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0d9488",
    icons: [
      {
        src: "data:image/svg+xml;base64," + Buffer.from(
          `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='#0d9488'/><text x='50' y='68' font-size='52' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>C</text></svg>`
        ).toString("base64"),
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  });
}
