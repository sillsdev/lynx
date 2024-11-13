export const fixExtensionsPlugin = () => ({
  name: 'FixExtensionsPlugin',
  setup: (build) => {
    const isEsm = build.initialOptions.format === 'esm';
    const outExtension = build.initialOptions.outExtension?.['.js'] ?? '.js';

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        return;
      }

      for (const outputFile of result.outputFiles ?? []) {
        if (!outputFile.path.endsWith(outExtension)) {
          continue;
        }

        const fileContents = outputFile.text;
        const nextFileContents = modifyRelativeImports(fileContents, isEsm, outExtension);

        outputFile.contents = Buffer.from(nextFileContents);
      }
    });
  },
});

const CJS_RELATIVE_IMPORT_EXP = /require\(["'](\..+)["']\)(;)?/g;
const ESM_RELATIVE_IMPORT_EXP = /from ["'](\..+)["'](;)?/g;
const hasExtensionRegex = /\.(?:png|svg|jpe?g)$/i;

const modifyRelativeImports = (contents, isEsm, outExtension) =>
  isEsm ? modifyEsmImports(contents, outExtension) : modifyCjsImports(contents, outExtension);

const modifyEsmImports = (contents, outExtension) => {
  return contents.replace(ESM_RELATIVE_IMPORT_EXP, (_, importPath, maybeSemicolon = '') => {
    if (importPath.endsWith('.') || importPath.endsWith('/')) {
      return `from '${importPath}/index${outExtension}'${maybeSemicolon}`;
    }

    if (importPath.endsWith(outExtension)) {
      return `from '${importPath}'${maybeSemicolon}`;
    }

    if (hasExtensionRegex.test(importPath)) {
      return `from '${importPath}'${maybeSemicolon}`;
    }

    return `from '${importPath}${outExtension}'${maybeSemicolon}`;
  });
};

const modifyCjsImports = (contents, outExtension) => {
  return contents.replace(CJS_RELATIVE_IMPORT_EXP, (_, importPath, maybeSemicolon = '') => {
    if (importPath.endsWith('.') || importPath.endsWith('/')) {
      return `require('${importPath}/index${outExtension}')${maybeSemicolon}`;
    }

    if (importPath.endsWith(outExtension)) {
      return `require('${importPath}')${maybeSemicolon}`;
    }

    if (hasExtensionRegex.test(importPath)) {
      return `require('${importPath}')${maybeSemicolon}`;
    }

    return `require('${importPath}${outExtension}')${maybeSemicolon}`;
  });
};
