import { Biome, Distribution } from "@biomejs/js-api";

const biome = await Biome.create({
  distribution: Distribution.NODE,
});

export default {
  version: "1.0.0",
  locale: {
    source: "en",
    targets: ["de"],
  },
  files: {
    json: {
      include: ["locales/[locale].json"],
    },
  },
  llm: {
    provider: "openai",
    model: "gpt-4-turbo",
  },
  hooks: {
    // Optional: Format the content with Biome
    afterTranslate: ({ content, filePath }) => {
      const formatted = biome.formatContent(content.toString(), {
        filePath,
      });

      return formatted.content;
    },
  },
};
