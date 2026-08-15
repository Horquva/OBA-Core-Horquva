const StyleDictionary = require("style-dictionary");

// Custom format: outputs a Dart class of static const tokens for Flutter
StyleDictionary.registerFormat({
  name: "flutter/class.dart.custom",
  formatter: function ({ dictionary }) {
    const toDartName = (path) =>
      path
        .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join("")
        .replace(/[^a-zA-Z0-9]/g, "");

    const lines = dictionary.allTokens.map((token) => {
      const name = toDartName(token.path);
      const raw = String(token.value);

      // Color hex -> Color(0xFF......)
      if (/^#([0-9A-Fa-f]{6})$/.test(raw)) {
        const hex = raw.replace("#", "").toUpperCase();
        return `  static const Color ${name} = Color(0xFF${hex});`;
      }
      // Pure number -> double
      if (/^-?\d+(\.\d+)?$/.test(raw)) {
        return `  static const double ${name} = ${raw};`;
      }
      // Everything else (font names, easing curves, duration refs) -> String
      return `  static const String ${name} = '${raw}';`;
    });

    return (
      "// GENERATED FILE - DO NOT EDIT BY HAND\n" +
      "// Source: tokens/tokens.json -> config.js\n" +
      "import 'package:flutter/material.dart';\n\n" +
      "class HorquvaTokens {\n" +
      lines.join("\n") +
      "\n}\n"
    );
  },
});

module.exports = {
  source: ["tokens/tokens.json"],
  platforms: {
    web: {
      transformGroup: "css",
      buildPath: "build/web/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          options: { outputReferences: true },
        },
      ],
    },
    flutter: {
      // Deliberately NOT using the built-in "flutter" transformGroup:
      // it pre-converts color values into Dart Color(...) strings,
      // which then get wrapped in quotes by generic formatters.
      // Keeping raw values (#hex, plain numbers) lets our custom
      // formatter below build real typed Dart constants instead.
      transforms: ["attribute/cti", "name/cti/pascal"],
      buildPath: "build/flutter/",
      files: [
        {
          destination: "tokens.dart",
          format: "flutter/class.dart.custom",
        },
      ],
    },
  },
};
