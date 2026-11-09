import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { addDays, dateKey } from "./days";
import { STORAGE_KEY } from "./storage";

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const total = () => screen.getByTestId("total").textContent;

describe("Today", () => {
  it("adds reps with the preset buttons and the custom field, and saves them", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(total()).toBe("0");
    expect(screen.getByText("100 to go")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add 25 reps" }));
    await user.type(screen.getByLabelText("Number of reps"), "17");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(total()).toBe("42");
    expect(screen.getByText("58 to go")).toBeInTheDocument();
    expect(screen.getByText("2 sets")).toBeInTheDocument();
    const days = Object.values(stored().days) as { sets: { reps: number }[] }[];
    expect(days[0].sets.map((s) => s.reps)).toEqual([25, 17]);
  });

  it("shows when the target is hit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Number of reps"), "110{Enter}");
    expect(screen.getByText("Target hit, 10 extra")).toBeInTheDocument();
  });

  it("deletes a set and undoes the delete", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Add 10 reps" }));
    await user.click(screen.getByRole("button", { name: /Delete set of 10/ }));
    expect(total()).toBe("0");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(total()).toBe("10");
  });

  it("hides the install card once dismissed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/Add Dunnit to your home screen/)).not.toBeInTheDocument();
    expect(stored().settings.installCardDismissed).toBe(true);
  });
});

describe("Settings", () => {
  it("changes today's target right away", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Increase target by 5" }));
    expect(screen.getByText("Saved. Today's target is now 105.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Today" }));
    expect(screen.getByText("of 105 pushups")).toBeInTheDocument();
  });

  it("changes a quick-add button and shows it on Today in ascending order", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const first = screen.getByLabelText("Button 1");
    await user.clear(first);
    await user.type(first, "20{Enter}");
    expect(screen.getByText("Saved.")).toBeInTheDocument();
    expect(stored().settings.presets).toEqual([10, 20, 25]);
    await user.click(screen.getByRole("tab", { name: "Today" }));
    const names = screen.getAllByRole("button", { name: /^Add \d+ reps$/ }).map((b) => b.textContent);
    expect(names).toEqual(["+10", "+20", "+25"]);
    expect(screen.getByText("No sets yet. Tap +10, +20 or +25 after your first set.")).toBeInTheDocument();
  });

  it("rejects a duplicate quick-add button", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const first = screen.getByLabelText("Button 1");
    await user.clear(first);
    await user.type(first, "10{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Each button needs a different number.");
    expect(first).toHaveValue(5);
    expect(stored().settings.presets).toEqual([5, 10, 25]);
  });

  it("rejects an invalid import file with a clear message", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const file = new File(['{"foo":1}'], "notes.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("Import"), file);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't import notes.json. This file is not a Dunnit backup.");
  });

  it("imports a backup after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const backup = {
      version: 1,
      settings: { target: 60, timeZone: "UTC", installCardDismissed: true },
      days: { "2026-10-01": { target: 60, sets: [{ at: "2026-10-01T10:00:00.000Z", reps: 30 }] } },
    };
    await user.upload(screen.getByLabelText("Import"), new File([JSON.stringify(backup)], "backup.json"));
    await user.click(await screen.findByRole("button", { name: "Replace my data" }));
    expect(stored().settings.target).toBe(60);
    expect(stored().days["2026-10-01"].sets[0].reps).toBe(30);
  });

  it("resets all data after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Add 25 reps" }));
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.click(screen.getByRole("button", { name: "Delete everything" }));
    await user.click(screen.getByRole("tab", { name: "Today" }));
    expect(total()).toBe("0");
  });
});

describe("History", () => {
  it("shows today's reps in the table", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Add 25 reps" }));
    await user.click(screen.getByRole("tab", { name: "History" }));
    const row = screen.getByRole("cell", { name: "Today" }).closest("tr")!;
    expect(within(row).getByText("25")).toBeInTheDocument();
    expect(within(row).getByText("In progress")).toBeInTheDocument();
  });

  /** Stores a backup whose first recorded day is `daysAgo` days before today, then opens History. */
  async function openHistory(daysAgo: number) {
    const first = addDays(dateKey(new Date(), "UTC"), -daysAgo);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: { target: 100, timeZone: "UTC", installCardDismissed: true },
        days: { [first]: { target: 100, sets: [{ at: `${first}T10:00:00.000Z`, reps: 70 }] } },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "History" }));
    return user;
  }
  const ranges = () => within(screen.getByRole("group", { name: "Range" })).getAllByRole("button").map((b) => b.textContent);

  it("offers only 7 and 30 days with up to 30 days of history", async () => {
    await openHistory(29);
    expect(ranges()).toEqual(["7 days", "30 days"]);
  });

  it("offers 90 days with more than 30 days of history", async () => {
    const user = await openHistory(30);
    expect(ranges()).toEqual(["7 days", "30 days", "90 days"]);
    await user.click(screen.getByRole("button", { name: "90 days" }));
    expect(screen.getByText("0/31")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(32); // 31 days and the header
  });

  it("offers 1 year with more than 90 days of history, and still lists every day", async () => {
    const user = await openHistory(90);
    expect(ranges()).toEqual(["7 days", "30 days", "90 days", "1 year"]);
    await user.click(screen.getByRole("button", { name: "1 year" }));
    expect(screen.getByText("0/91")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(92);
    expect(screen.getByRole("img", { name: /per week/ })).toBeInTheDocument();
  });
});
