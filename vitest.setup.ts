import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { mockServer } from "@/mocks";

beforeAll(() => mockServer.listen({ onUnhandledRequest: "bypass" }));

afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());
