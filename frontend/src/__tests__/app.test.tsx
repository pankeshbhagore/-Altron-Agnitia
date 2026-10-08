import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import App from "../App";

// Force offline mode so the app uses the embedded sample (deterministic).
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  // jsdom has no EventSource -> runAttack falls back to the simulate() replay.
  // @ts-ignore
  delete (globalThis as any).EventSource;
});

describe("Twin Console UI", () => {
  it("loads and shows the baseline score (18 / F)", async () => {
    render(<App />);
    expect(await screen.findByText("Twin Console")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("posture toggle moves score baseline(18) -> hardened(100)", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /after fixes/i }));
    await waitFor(() => expect(screen.getByText("100")).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("navigates to Attack Lab and shows the run control + terminal", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /attack lab/i }));
    expect(await screen.findByRole("button", { name: /run attack/i })).toBeTruthy();
    expect(screen.getByText(/launch with the button/i)).toBeTruthy();
  });

  it("running the attack streams events to the terminal", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /attack lab/i }));
    fireEvent.click(await screen.findByRole("button", { name: /run attack/i }));
    // the simulated stream emits the 'armed' banner and at least one breach line
    await waitFor(() => expect(screen.getByText(/twin armed/i)).toBeTruthy(), { timeout: 5000 });
    await waitFor(() => expect(screen.getAllByText(/SUCCEEDED|blocked/).length).toBeGreaterThan(0), { timeout: 8000 });
  });

  it("navigates to Remediation and shows a fix diff", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /remediation/i }));
    expect(await screen.findByText(/SUGGESTED FIX/i)).toBeTruthy();
    expect(screen.getByText("SHIFT-LEFT GATE")).toBeTruthy();
  });

  it("Harden view: toggling a control recomputes the score live", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /harden/i }));
    // baseline score shows 18
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    // enable the dependency scan gate -> score must rise
    fireEvent.click(await screen.findByText(/Dependency scan gate/i));
    await waitFor(() => expect(screen.queryByText("18")).toBeNull(), { timeout: 5000 });
  });

  it("Harden view: fixing the misconfig breaks the attack chain", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /harden/i }));
    fireEvent.click(await screen.findByText(/Config policy gate/i));
    expect(await screen.findByText(/CHAIN BROKEN/i)).toBeTruthy();
  });

  it("Exports view: shows the MITRE Navigator layer and switches tabs", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("18")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /exports/i }));
    expect(await screen.findByText(/enterprise-attack/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /OPA policy/i }));
    expect(await screen.findByText(/package twin.config/i)).toBeTruthy();
  });
});
