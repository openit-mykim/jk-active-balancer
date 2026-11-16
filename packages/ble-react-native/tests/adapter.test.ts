import { describe, expect, it } from "vitest";
import {
  ReactNativeBlePlxAdapter,
  toBase64,
  type BleManagerLike,
  type DeviceLike,
} from "../src/react-native-ble-plx-adapter";

function fakeManager() {
  let monitorListener: ((e: Error | null, c: { value?: string | null } | null) => void) | undefined;
  let disconnectListener: ((e: Error | null, d: DeviceLike | null) => void) | undefined;
  let scanListener: ((e: Error | null, d: DeviceLike | null) => void) | undefined;
  const writes: string[] = [];
  const removed: string[] = [];
  const device: DeviceLike = {
    id: "AA:BB",
    name: "JK-B2A16S",
    rssi: -60,
    discoverAllServicesAndCharacteristics: async () => device,
    cancelConnection: async () => device,
    writeCharacteristicWithoutResponseForService: async (_s, _c, v) => {
      writes.push(v);
    },
    writeCharacteristicWithResponseForService: async () => undefined,
    monitorCharacteristicForService: (_s, _c, listener) => {
      monitorListener = listener;
      return { remove: () => removed.push("monitor") };
    },
  };
  const manager: BleManagerLike = {
    startDeviceScan: (_u, _o, listener) => {
      scanListener = listener;
    },
    stopDeviceScan: () => undefined,
    connectToDevice: async () => device,
    cancelDeviceConnection: async () => {
      disconnectListener?.(null, device);
      return device;
    },
    onDeviceDisconnected: (_id, listener) => {
      disconnectListener = listener;
      return { remove: () => removed.push("disconnect") };
    },
  };
  return {
    manager,
    device,
    writes,
    removed,
    notify: (bytes: number[]) => monitorListener?.(null, { value: toBase64(Uint8Array.from(bytes)) }),
    drop: () => disconnectListener?.(new Error("link lost"), device),
    scanResult: (d: DeviceLike | null, e: Error | null = null) => scanListener?.(e, d),
  };
}

describe("ReactNativeBlePlxAdapter", () => {
  it("connects through BleManager.connectToDevice and streams notifications", async () => {
    const fake = fakeManager();
    const adapter = new ReactNativeBlePlxAdapter(fake.manager);
    await adapter.connect("AA:BB");
    const iterator = adapter.notifications()[Symbol.asyncIterator]();
    fake.notify([0x55, 0xaa, 0xeb, 0x90]);
    expect(Array.from((await iterator.next()).value as Uint8Array)).toEqual([0x55, 0xaa, 0xeb, 0x90]);
    await adapter.write(Uint8Array.from([0xaa, 0x55]));
    expect(fake.writes).toEqual([toBase64(Uint8Array.from([0xaa, 0x55]))]);
  });

  it("reports an unexpected disconnect and ends the notification stream", async () => {
    const fake = fakeManager();
    const adapter = new ReactNativeBlePlxAdapter(fake.manager);
    const drops: string[] = [];
    adapter.onDisconnect((e) => drops.push(e?.message ?? ""));
    await adapter.connect("AA:BB");
    const iterator = adapter.notifications()[Symbol.asyncIterator]();
    fake.drop();
    expect(drops).toEqual(["link lost"]);
    expect((await iterator.next()).done).toBe(true);
    expect(fake.removed).toEqual(expect.arrayContaining(["monitor", "disconnect"]));
  });

  it("does not report a user disconnect as a link loss", async () => {
    const fake = fakeManager();
    const adapter = new ReactNativeBlePlxAdapter(fake.manager);
    const drops: unknown[] = [];
    adapter.onDisconnect((e) => drops.push(e));
    await adapter.connect("AA:BB");
    await adapter.disconnect();
    expect(drops).toHaveLength(0);
  });

  it("collects unique scan results and propagates scan errors", async () => {
    const fake = fakeManager();
    const adapter = new ReactNativeBlePlxAdapter(fake.manager, { scanDurationMs: 5 });
    const pending = adapter.scan();
    fake.scanResult(fake.device);
    fake.scanResult(fake.device);
    await expect(pending).resolves.toEqual([{ id: "AA:BB", name: "JK-B2A16S", rssi: -60 }]);

    const failing = adapter.scan();
    fake.scanResult(null, new Error("BluetoothPoweredOff"));
    await expect(failing).rejects.toThrow(/PoweredOff/);
  });

  it("refuses to write before connecting", async () => {
    await expect(new ReactNativeBlePlxAdapter(fakeManager().manager).write(Uint8Array.from([1]))).rejects.toThrow(
      /before connect/,
    );
  });
});
