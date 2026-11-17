import { describe, expect, it } from "vitest";
import { WebBluetoothAdapter, WebBluetoothUnsupportedError } from "../src/web-bluetooth-adapter";
import type { WebBluetooth, WebBluetoothCharacteristic, WebBluetoothDevice } from "../src/web-bluetooth-types";

type Listener = (event: Event) => void;

class FakeTarget {
  private readonly listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
  dispatch(type: string): void {
    for (const l of this.listeners.get(type) ?? []) l({ target: this } as unknown as Event);
  }
  count(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeCharacteristic extends FakeTarget implements WebBluetoothCharacteristic {
  value: DataView | null = null;
  writes: Uint8Array[] = [];
  properties = { writeWithoutResponse: true, notify: true };
  async startNotifications(): Promise<WebBluetoothCharacteristic> {
    return this;
  }
  async writeValueWithoutResponse(value: Uint8Array): Promise<void> {
    this.writes.push(value);
  }
  async writeValue(value: Uint8Array): Promise<void> {
    this.writes.push(value);
  }
  notify(bytes: number[]): void {
    const buffer = new Uint8Array([0xee, ...bytes]).buffer;
    this.value = new DataView(buffer, 1, bytes.length);
    this.dispatch("characteristicvaluechanged");
  }
}

function fakeBluetooth() {
  const characteristic = new FakeCharacteristic();
  const device = new FakeTarget() as FakeTarget & WebBluetoothDevice;
  const gatt = {
    connected: false,
    async connect() {
      gatt.connected = true;
      return gatt;
    },
    disconnect() {
      gatt.connected = false;
      device.dispatch("gattserverdisconnected");
    },
    async getPrimaryService() {
      return { getCharacteristic: async () => characteristic };
    },
  };
  Object.assign(device, { id: "dev-1", name: "JK-B2A16S", gatt });
  let requestOptions: unknown;
  const bluetooth: WebBluetooth = {
    async requestDevice(options) {
      requestOptions = options;
      return device;
    },
  };
  return { bluetooth, device, gatt, characteristic, requestOptions: () => requestOptions };
}

describe("WebBluetoothAdapter", () => {
  it("reports support from the presence of navigator.bluetooth", () => {
    expect(WebBluetoothAdapter.isSupported()).toBe(false);
  });

  it("throws WebBluetoothUnsupportedError when scanning without the API", async () => {
    await expect(new WebBluetoothAdapter().scan()).rejects.toBeInstanceOf(WebBluetoothUnsupportedError);
  });

  it("refuses to write before connecting", async () => {
    await expect(new WebBluetoothAdapter().write(Uint8Array.from([0xaa]))).rejects.toThrow(/before connect/);
  });

  it("filters by FFE0 and adds the namePrefix fallback only when enabled", async () => {
    const plain = fakeBluetooth();
    await new WebBluetoothAdapter({ bluetooth: plain.bluetooth }).scan();
    expect(plain.requestOptions()).toEqual({ filters: [{ services: [0xffe0] }], optionalServices: [0xffe0] });

    const dev = fakeBluetooth();
    await new WebBluetoothAdapter({ bluetooth: dev.bluetooth, namePrefixFallback: "JK-" }).scan();
    expect(dev.requestOptions()).toEqual({
      filters: [{ services: [0xffe0] }, { namePrefix: "JK-" }],
      optionalServices: [0xffe0],
    });
  });

  it("streams copied notification bytes and writes without response", async () => {
    const fake = fakeBluetooth();
    const adapter = new WebBluetoothAdapter({ bluetooth: fake.bluetooth });
    const [device] = await adapter.scan();
    await adapter.connect(device.id);
    const iterator = adapter.notifications()[Symbol.asyncIterator]();
    fake.characteristic.notify([0x55, 0xaa]);
    const { value } = await iterator.next();
    expect(Array.from(value as Uint8Array)).toEqual([0x55, 0xaa]);
    await adapter.write(Uint8Array.from([1, 2]));
    expect(fake.characteristic.writes).toHaveLength(1);
  });

  it("emits onDisconnect on link loss, not on user disconnect, and can reconnect", async () => {
    const fake = fakeBluetooth();
    const adapter = new WebBluetoothAdapter({ bluetooth: fake.bluetooth });
    const drops: string[] = [];
    adapter.onDisconnect((e) => drops.push(e?.message ?? ""));
    const [device] = await adapter.scan();
    await adapter.connect(device.id);

    const iterator = adapter.notifications()[Symbol.asyncIterator]();
    fake.device.dispatch("gattserverdisconnected"); // out of range
    expect(drops).toEqual(["GATT server disconnected"]);
    expect((await iterator.next()).done).toBe(true);

    await adapter.connect(device.id); // reconnect without a new picker
    expect(fake.characteristic.count("characteristicvaluechanged")).toBe(1);
    await adapter.disconnect();
    expect(drops).toHaveLength(1);
  });
});
