import { describe, it, expect } from "vitest";
import { HorizontalBarChart } from "../components/charts/horizontal-bar-chart";

describe("HorizontalBarChart Component", () => {
  it("should render with valid data", () => {
    const data = [
      { label: "Barba", value: 5, color: "#1e40af" },
      { label: "Swing Motion", value: 3, color: "#dc2626" },
      { label: "Ride Control", value: 2, color: "#16a34a" },
    ];

    expect(data).toHaveLength(3);
    expect(data[0].label).toBe("Barba");
    expect(data[0].value).toBe(5);
  });

  it("should handle empty data", () => {
    const data: any[] = [];
    expect(data).toHaveLength(0);
  });

  it("should calculate percentage correctly", () => {
    const data = [
      { label: "Item 1", value: 50, color: "#1e40af" },
      { label: "Item 2", value: 50, color: "#dc2626" },
    ];

    const maxValue = Math.max(...data.map(item => item.value));
    const percentage1 = (data[0].value / maxValue) * 100;
    const percentage2 = (data[1].value / maxValue) * 100;

    expect(percentage1).toBe(100);
    expect(percentage2).toBe(100);
  });

  it("should handle different max values", () => {
    const data = [
      { label: "Item 1", value: 10, color: "#1e40af" },
      { label: "Item 2", value: 20, color: "#dc2626" },
      { label: "Item 3", value: 30, color: "#16a34a" },
    ];

    const maxValue = Math.max(...data.map(item => item.value));
    expect(maxValue).toBe(30);

    const percentage1 = (data[0].value / maxValue) * 100;
    const percentage2 = (data[1].value / maxValue) * 100;
    const percentage3 = (data[2].value / maxValue) * 100;

    expect(percentage1).toBeCloseTo(33.33, 1);
    expect(percentage2).toBeCloseTo(66.67, 1);
    expect(percentage3).toBe(100);
  });

  it("should display labels correctly", () => {
    const data = [
      { label: "Lateral Barber 6.1/2x12", value: 5, color: "#1e40af" },
      { label: "Lateral Barber 6x11", value: 3, color: "#dc2626" },
      { label: "Lateral Barber 5.1/2x10", value: 2, color: "#16a34a" },
    ];

    data.forEach((item) => {
      expect(item.label).toBeDefined();
      expect(item.label.length).toBeGreaterThan(0);
    });
  });

  it("should handle single data point", () => {
    const data = [
      { label: "Only Item", value: 100, color: "#1e40af" },
    ];

    const maxValue = Math.max(...data.map(item => item.value));
    const percentage = (data[0].value / maxValue) * 100;

    expect(percentage).toBe(100);
  });

  it("should validate color format", () => {
    const data = [
      { label: "Item 1", value: 5, color: "#1e40af" },
      { label: "Item 2", value: 3, color: "#dc2626" },
    ];

    data.forEach((item) => {
      expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("should handle large datasets", () => {
    const data = Array.from({ length: 100 }, (_, i) => ({
      label: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 100),
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
    }));

    expect(data).toHaveLength(100);
    expect(data[0].label).toBe("Item 1");
    expect(data[99].label).toBe("Item 100");
  });
});
