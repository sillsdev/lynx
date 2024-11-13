import { basename, dirname, resolve } from 'path';

export const fixFolderImportsPlugin = () => ({
  name: 'FixFolderImportsPlugin',
  setup: (build) => {
    const outExtension = build.initialOptions.outExtension?.['.js'] ?? '.js';
    const indexFileName = `index${outExtension}`;

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        return;
      }

      const indexFilePaths = new Set();
      for (const outputFile of result.outputFiles ?? []) {
        const filePath = outputFile.path;
        if (basename(filePath) === indexFileName) {
          indexFilePaths.add(dirname(filePath));
        }
      }

      for (const outputFile of result.outputFiles ?? []) {
        if (!outputFile.path.endsWith(outExtension)) {
          continue;
        }

        const fileContents = outputFile.text;
        const filePath = outputFile.path;

        const nextFileContents = modifyFolderImports(fileContents, filePath, indexFilePaths);

        outputFile.contents = Buffer.from(nextFileContents);
      }
    });
  },
});

const ESM_RELATIVE_IMPORT_EXP = /from\s+['"](\..+?)['"]/g;
const CJS_RELATIVE_IMPORT_EXP = /require\(['"](\..+?)['"]\)/g;
const hasExtensionRegex = /\.[^./\\]+$/;

const modifyFolderImports = (contents, filePath, indexFilePaths) => {
  contents = contents.replace(ESM_RELATIVE_IMPORT_EXP, (match, importPath) => {
    const newImportPath = replaceFolderImport(importPath, filePath, indexFilePaths);
    return match.replace(importPath, newImportPath);
  });

  contents = contents.replace(CJS_RELATIVE_IMPORT_EXP, (match, importPath) => {
    const newImportPath = replaceFolderImport(importPath, filePath, indexFilePaths);
    return match.replace(importPath, newImportPath);
  });

  return contents;
};

const replaceFolderImport = (importPath, filePath, indexFilePaths) => {
  if (importPath.endsWith('/') || importPath.endsWith('.') || hasExtensionRegex.test(importPath)) {
    return importPath;
  }

  const currentDir = dirname(filePath);
  const resolvedPath = resolve(currentDir, importPath);

  if (indexFilePaths.has(resolvedPath)) {
    return `${importPath}/index`;
  }

  return importPath;
};
