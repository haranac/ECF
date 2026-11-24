import test from "node:test";
import assert from "node:assert/strict";
import { dateKey, toBusinessInstant, paymentTotals } from "./appointments.js";

test("El día de la agenda corresponde a Campeche al cruzar medianoche UTC", () => {
  assert.equal(dateKey("2026-11-18T02:00:00Z"), "2026-11-17");
  assert.equal(dateKey("2026-11-18T06:00:00Z"), "2026-11-18");
});

test("Los bloqueos convierten la hora del negocio sin depender de la zona del navegador", () => {
  assert.equal(
    toBusinessInstant("2026-11-19T08:00"),
    "2026-11-19T14:00:00.000Z",
  );
  assert.equal(
    toBusinessInstant("2026-11-19T16:00"),
    "2026-11-19T22:00:00.000Z",
  );
  assert.equal(
    toBusinessInstant("2026-11-19T00:00"),
    "2026-11-19T06:00:00.000Z",
  );
});

test("El saldo descuenta reembolsos y excluye movimientos pendientes y rechazados", () => {
  assert.deepEqual(
    paymentTotals([
      { tipo: "ANTICIPO", monto: "100.10", estado: "VALIDADO" },
      { tipo: "PAGO_FINAL", monto: "50.20", estado: "VALIDADO" },
      { tipo: "REEMBOLSO", monto: "20.15", estado: "VALIDADO" },
      { tipo: "PAGO_FINAL", monto: 999, estado: "PENDIENTE" },
      { tipo: "REEMBOLSO", monto: 999, estado: "RECHAZADO" },
    ]),
    { received: 150.3, refunded: 20.15, net: 130.15 },
  );
  assert.deepEqual(paymentTotals(), { received: 0, refunded: 0, net: 0 });
});
