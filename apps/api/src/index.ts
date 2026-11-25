import { createApp } from "./app.js";
import { loadEnv } from "./loadEnv.js";
import { releaseExpiredReservations } from "./payments/index.js";

loadEnv();

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => {
  console.log(`PERIS API listening on http://localhost:${port}`);
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
