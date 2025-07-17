import PO from "pofile";
import { BaseParser } from "../core/base-parser.js";

export class PoParser extends BaseParser {
  #po: PO = null!;

  async parse(input: string) {
    try {
      this.#po = PO.parse(input);
      const result: Record<string, string> = {};

      for (const item of this.#po.items) {
        if (!item.msgid) {
          continue;
        }

        const value = item.msgstr.at(0) || "";

        result[item.msgid] = value;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to parse PO: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async serialize(
    _locale: string,
    data: Record<string, string>,
    _originalData?: Record<string, string>,
  ): Promise<string> {
    try {
      if (!this.#po) {
        this.#po = new PO();
      }

      if (Object.keys(data).length === 0) {
        return this.#po.toString();
      }

      const originalPoItems = Object.fromEntries(
        this.#po.items.map((item) => [item.msgid, item]),
      );

      this.#po.items = Object.entries(data).map(([key, value]) => {
        let item = originalPoItems[key];

        if (!item) {
          item = new PO.Item();
          item.msgid = key;
        }

        if (value) {
          item.msgstr = [value];
        }

        return item;
      });

      return this.#po.toString();
    } catch (error) {
      throw new Error(
        `Failed to serialize PO: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
