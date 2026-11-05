import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CatalogueToolbar } from "./catalogue-toolbar";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("catalogue toolbar", () => {
  it("soft-navigates with search, category, and sort instead of submitting the document", () => {
    render(<CatalogueToolbar params={{ category: "shirts" }} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Oxford" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Sort products" }));
    fireEvent.click(screen.getByRole("option", { name: "Price: low to high" }));

    const form = screen.getByRole("button", { name: "Apply search and sort" }).closest("form");
    expect(form).not.toBeNull();
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    form!.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(push).toHaveBeenCalledWith("/products?q=Oxford&category=shirts&sort=price-asc");
  });
});
