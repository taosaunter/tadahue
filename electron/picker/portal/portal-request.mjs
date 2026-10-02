// Shared cancellable D-Bus portal request lifecycle used by screenshot and native PickColor adapters.
import { randomUUID } from "node:crypto";

const destination = "org.freedesktop.portal.Desktop";
const portalPath = "/org/freedesktop/portal/desktop";
const requestInterface = "org.freedesktop.portal.Request";

async function sessionBus() {
  // Load the Linux-only transport only when a Wayland pick is requested.
  const { default: dbus } = await import("@homebridge/dbus-native");
  return dbus.sessionBus({ direct: true });
}

function portalError(code, cause) {
  return Object.assign(new Error("Desktop portal request failed", { cause }), {
    code,
  });
}

export function requestPortal({
  method = "PickColor",
  appId,
  options = [],
  drainOnAbort = false,
  signal,
  createBus = sessionBus,
  timeoutMs = 120000,
} = {}) {
  return new Promise((resolve, reject) => {
    let bus;
    let owner;
    let requestPath;
    let requestIssued = false;
    let settled = false;
    const timer = setTimeout(
      () =>
        finish(
          null,
          portalError(requestIssued ? "native-failed" : "native-unavailable"),
          true,
        ),
      timeoutMs,
    );

    function finish(result = null, error, cancelRequest = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (bus) {
        bus.connection.removeListener("message", onMessage);
        if (cancelRequest && requestIssued) {
          // end() flushes Close before disconnecting. The portal also owns
          // requests by their bus connection, which is never kept alive.
          bus.invoke(
            {
              destination,
              path: requestPath,
              interface: requestInterface,
              member: "Close",
            },
            () => {},
          );
        }
        bus.connection.end();
      }
      if (error) reject(error);
      else resolve(result);
    }

    function abort() {
      // Drain an issued screenshot so its temporary file can still be cleaned.
      if (!drainOnAbort || !requestIssued) finish(null, undefined, true);
    }
    function onMessage(message) {
      if (
        message.type !== 4 ||
        message.sender !== owner ||
        message.path !== requestPath ||
        message.interface !== requestInterface ||
        message.member !== "Response"
      )
        return;
      finish(message.body);
    }

    function invoke(message) {
      return new Promise((accept, fail) =>
        bus.invoke(message, (error, result) => {
          if (error) fail(error);
          else accept(result);
        }),
      );
    }

    async function start() {
      try {
        bus = await createBus();
        // Keep an error listener through socket shutdown to absorb late I/O
        // errors after a cancellation without throwing in the main process.
        bus.connection.on("error", (error) =>
          finish(
            null,
            portalError(
              requestIssued ? "native-failed" : "native-unavailable",
              error,
            ),
          ),
        );
        bus.connection.on("end", () =>
          finish(null, portalError("native-failed")),
        );
        if (settled) {
          bus.connection.end();
          return;
        }
        const name = await invoke({
          destination: "org.freedesktop.DBus",
          path: "/org/freedesktop/DBus",
          interface: "org.freedesktop.DBus",
          member: "Hello",
        });
        if (settled) return;
        const getOwner = () =>
          invoke({
            destination: "org.freedesktop.DBus",
            path: "/org/freedesktop/DBus",
            interface: "org.freedesktop.DBus",
            member: "GetNameOwner",
            signature: "s",
            body: [destination],
          });
        try {
          owner = await getOwner();
        } catch (error) {
          if (settled) return;
          if (error.name !== "org.freedesktop.DBus.Error.NameHasNoOwner")
            throw error;
          // An already-running portal need not have an activation service
          // file. Start it only when there is no current owner.
          await invoke({
            destination: "org.freedesktop.DBus",
            path: "/org/freedesktop/DBus",
            interface: "org.freedesktop.DBus",
            member: "StartServiceByName",
            signature: "su",
            body: [destination, 0],
          });
          if (settled) return;
          owner = await getOwner();
        }
        if (settled) return;
        if (appId) {
          await invoke({
            destination,
            path: portalPath,
            interface: "org.freedesktop.host.portal.Registry",
            member: "Register",
            signature: "sa{sv}",
            body: [appId, []],
          });
          if (settled) return;
        }
        const token = "TadaHue_" + randomUUID().replaceAll("-", "");
        requestPath = `${portalPath}/request/${name.slice(1).replaceAll(".", "_")}/${token}`;
        bus.connection.on("message", onMessage);
        // Subscribe before the request: some backends respond before the method
        // reply arrives. Checking the unique owner rejects unrelated signals.
        await invoke({
          destination: "org.freedesktop.DBus",
          path: "/org/freedesktop/DBus",
          interface: "org.freedesktop.DBus",
          member: "AddMatch",
          signature: "s",
          body: [
            `type='signal',sender='${owner}',path='${requestPath}',interface='${requestInterface}',member='Response'`,
          ],
        });
        if (settled) return;
        requestIssued = true;
        const handle = await invoke({
          destination,
          path: portalPath,
          interface: "org.freedesktop.portal.Screenshot",
          member: method,
          signature: "sa{sv}",
          body: ["", [["handle_token", ["s", token]], ...options]],
        });
        if (!settled && handle !== requestPath)
          throw portalError("native-failed");
      } catch (error) {
        const unavailable =
          !requestIssued ||
          [
            "org.freedesktop.DBus.Error.UnknownMethod",
            "org.freedesktop.DBus.Error.UnknownInterface",
            "org.freedesktop.DBus.Error.ServiceUnknown",
            "org.freedesktop.portal.Error.NotFound",
          ].includes(error.name);
        finish(
          null,
          portalError(
            unavailable ? "native-unavailable" : "native-failed",
            error,
          ),
        );
      }
    }

    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    void start();
  });
}
