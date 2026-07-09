import { describe, expect, it } from "vitest";
import {
  classifyPollingError,
  shouldRetryPollingError,
  type PollingErrorKind,
} from "./pollingError";

describe("classifyPollingError", () => {
  it("classifies 401/403 as auth", () => {
    expect(classifyPollingError({ response: { status: 401 } }).kind).toBe(
      "auth"
    );
    expect(classifyPollingError({ response: { status: 403 } }).kind).toBe(
      "auth"
    );
  });

  it("classifies 404 as notFound", () => {
    expect(classifyPollingError({ response: { status: 404 } }).kind).toBe(
      "notFound"
    );
  });

  it("classifies 4xx as client", () => {
    expect(classifyPollingError({ response: { status: 400 } }).kind).toBe(
      "client"
    );
    expect(classifyPollingError({ response: { status: 422 } }).kind).toBe(
      "client"
    );
  });

  it("classifies 5xx as server", () => {
    expect(classifyPollingError({ response: { status: 500 } }).kind).toBe(
      "server"
    );
    expect(classifyPollingError({ response: { status: 502 } }).kind).toBe(
      "server"
    );
  });

  it("classifies network errors", () => {
    expect(classifyPollingError({ code: "ERR_NETWORK" }).kind).toBe("network");
    expect(classifyPollingError({ message: "Network Error" }).kind).toBe(
      "network"
    );
  });

  it("classifies timeout errors", () => {
    expect(classifyPollingError({ code: "ECONNABORTED" }).kind).toBe(
      "timeout"
    );
    expect(classifyPollingError({ code: "ETIMEDOUT" }).kind).toBe("timeout");
    expect(
      classifyPollingError({ message: "timeout of 15000ms exceeded" }).kind
    ).toBe("timeout");
  });

  it("classifies unknown errors", () => {
    expect(classifyPollingError(new Error("boom")).kind).toBe("unknown");
  });
});

describe("shouldRetryPollingError", () => {
  it.each<[PollingErrorKind, boolean]>([
    ["network", true],
    ["timeout", true],
    ["server", true],
    ["auth", false],
    ["notFound", false],
    ["client", false],
    ["unknown", false],
  ])("kind=%s -> retry=%s", (kind, expected) => {
    expect(shouldRetryPollingError(kind)).toBe(expected);
  });
});
