import { loadEnv } from "./loadEnv.js";

loadEnv();

const { createApp } = await import("./app.js");
const { releaseExpiredReservations } = await import("./payments/index.js");

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
createApp().listen(port, host, () => {
  console.log(`PERIS API listening on http://${host}:${port}`);
});

const passMs = 60_000;
setInterval(() => {
  void releaseExpiredReservations()
    .then((results) => {
      const released = results.filter((item) => item.released);
      if (released.length > 0) {
        console.info(
          `[reservations] released ${released.map((item) => item.number).join(", ")}`,
        );
      }
    })
    .catch((error: unknown) => {
      console.error(
        "[reservations] pass failed",
        error instanceof Error ? error.message : error,
      );
    });
}, passMs).unref();
