import { Event } from "../models/Event";

describe("Event.getParserSchema", () => {
  it("should generate a valid JSON schema for parseable fields", () => {
    const schema = Event.getParserSchema();

    expect(schema).toBeDefined();
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
  });

  it("should include all parseable fields", () => {
    const schema = Event.getParserSchema();

    const expectedFields = [
      "type",
      "amount",
      "quantity",
      "description",
      "event_date",
      "recurrence_rule",
      "recurrence_end_date",
      "currency",
      "confidence",
    ];

    expectedFields.forEach((field) => {
      expect(schema.properties[field]).toBeDefined();
    });
  });

  it("should mark required fields correctly", () => {
    const schema = Event.getParserSchema();

    const requiredFields = ["type", "amount", "quantity", "description", "event_date", "currency", "confidence"];

    expect(schema.required).toEqual(expect.arrayContaining(requiredFields));
    expect(schema.required.length).toBe(requiredFields.length);
  });

  it("should exclude ID and timestamp fields", () => {
    const schema = Event.getParserSchema();

    const excludedFields = [
      "id",
      "user_id",
      "currency_id",
      "parent_event_id",
      "created_at",
      "updated_at",
      "deleted_at",
    ];

    excludedFields.forEach((field) => {
      expect(schema.properties[field]).toBeUndefined();
    });
  });

  it("should include custom parsing fields", () => {
    const schema = Event.getParserSchema();

    expect(schema.properties.currency).toBeDefined();
    expect(schema.properties.currency.type).toBe("string");

    expect(schema.properties.confidence).toBeDefined();
    expect(schema.properties.confidence.type).toBe("number");
    expect(schema.properties.confidence.minimum).toBe(0);
    expect(schema.properties.confidence.maximum).toBe(1);
  });
});
