import { NoObjectGeneratedError, generateObject } from "ai";
import { z } from "zod";
import { getModels } from "./model";

function truncateToThreeWords(text: string): string {
  return text.split(/\s+/).slice(0, 3).join(" ");
}

export async function transformKeys(
  translations: Array<{ key: string; value: string }>,
) {
  const { primary } = getModels();

  const truncatedTranslations = translations.map((t) => ({
    ...t,
    value: truncateToThreeWords(t.value),
  }));

  const prompt = `Generate human readable and memorable translation keys based on the original keys and values.
Keep the component name prefix from the original key.
The keys should be descriptive and easy to understand.
Original keys contain element types (e.g. button_1, text_2) which can be used as context.
For each translation, generate a new key that:
- Keeps the component name prefix
- Is descriptive of the content
- Is easy to remember and read
- Uses camelCase format after the component prefix
- Uses common UI patterns in the key where appropriate (e.g. title, description, heading, subheading, buttonText)
- Relates to the element type from original key
Examples:
Original: Header.h1_1: "Welcome to our platform"
New: Header.pageTitle
Original: Hero.p_1: "The best platform for your needs"
New: Hero.mainDescription
Original: Profile.button_2: "Save Changes" 
New: Profile.saveButtonText
Original: Dashboard.text_3: "Last updated 3 days ago"
New: Dashboard.lastUpdateStatus
Translations to transform:
${JSON.stringify(truncatedTranslations, null, 2)}`;

  try {
    const schema = z.object({
      newKeys: z
        .array(z.string())
        .describe("The new descriptive keys for each translation"),
    });

    const { object } = await generateObject({
      model: primary,
      prompt,
      temperature: 0.2,
      mode: "json",
      schema,
    });

    return translations.map((translation, i) => ({
      ...translation,
      key: object.newKeys[i] || translation.key,
    }));
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error("Failed to generate object from model response");
    } else {
      console.error("Unexpected error", err);
    }
    return translations;
  }
}
