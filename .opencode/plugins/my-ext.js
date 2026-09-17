import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const agentCache = new Map();

function parseDescription(value, file) {
  if (value === undefined) {
    throw new Error(`${file}: missing description`);
  }
  if (!value) {
    throw new Error(`${file}: description must be nonempty`);
  }
  if (!value.startsWith('"')) {
    return value;
  }

  let description;
  try {
    description = JSON.parse(value);
  } catch (error) {
    throw new Error(`${file}: invalid description JSON: ${error.message}`, { cause: error });
  }
  if (typeof description !== "string" || !description.trim()) {
    throw new Error(`${file}: description must be nonempty`);
  }
  return description;
}

function parseAgent(source, file) {
  const normalized = source.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!match) {
    throw new Error(`${file}: invalid frontmatter`);
  }

  const fields = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 1) {
      throw new Error(`${file}: invalid frontmatter line ${line}`);
    }
    const name = line.slice(0, separator).trim();
    if (Object.hasOwn(fields, name)) {
      throw new Error(`${file}: duplicate frontmatter field ${name}`);
    }
    fields[name] = line.slice(separator + 1).trim();
  }

  const expectedName = file.slice(0, -path.extname(file).length);
  if (!/^my-ext-[a-z0-9-]+$/.test(fields.name ?? "") || fields.name !== expectedName) {
    throw new Error(`${file}: name must be ${expectedName}`);
  }
  if (fields.mode !== "subagent") {
    throw new Error(`${file}: mode must be subagent`);
  }
  if (fields.model !== undefined) {
    throw new Error(`${file}: model must be inherited`);
  }

  const description = parseDescription(fields.description, file);
  let permission;
  try {
    permission = JSON.parse(fields.permission);
  } catch (error) {
    throw new Error(`${file}: invalid permission JSON: ${error.message}`, { cause: error });
  }
  if (permission === null || Array.isArray(permission) || typeof permission !== "object") {
    throw new Error(`${file}: permission must be a JSON object`);
  }

  const prompt = (match[2] ?? "").trim();
  if (!prompt) {
    throw new Error(`${file}: empty prompt`);
  }
  return { name: fields.name, description, mode: fields.mode, permission, prompt };
}

function loadAgents(packageRoot) {
  const cacheKey = path.resolve(packageRoot);
  if (agentCache.has(cacheKey)) {
    return agentCache.get(cacheKey);
  }

  const directory = path.join(cacheKey, ".opencode", "agents");
  const definitions = readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => parseAgent(readFileSync(path.join(directory, name), "utf8"), name));
  agentCache.set(cacheKey, definitions);
  return definitions;
}

function appendUnique(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateConfig(config) {
  if (!isObject(config)) {
    throw new Error("my-ext: config must be an object");
  }
  if (Object.hasOwn(config, "skills") && !isObject(config.skills)) {
    throw new Error("my-ext: config.skills must be an object");
  }
  if (config.skills && Object.hasOwn(config.skills, "paths") && !Array.isArray(config.skills.paths)) {
    throw new Error("my-ext: config.skills.paths must be an array");
  }
  if (Object.hasOwn(config, "instructions") && !Array.isArray(config.instructions)) {
    throw new Error("my-ext: config.instructions must be an array");
  }
  if (Object.hasOwn(config, "agent") && !isObject(config.agent)) {
    throw new Error("my-ext: config.agent must be an object");
  }
  if (Object.hasOwn(config, "plugin") && !Array.isArray(config.plugin)) {
    throw new Error("my-ext: config.plugin must be an array");
  }
}

export function registerConfig(config, { skillsPath, bootstrapPath, definitions, logger = console }) {
  validateConfig(config);

  const existingAgents = config.agent ?? {};
  const registrations = definitions
    .filter((definition) => !Object.hasOwn(existingAgents, definition.name))
    .map((definition) => ({
      name: definition.name,
      value: {
        description: definition.description,
        mode: definition.mode,
        permission: structuredClone(definition.permission),
        prompt: definition.prompt,
      },
    }));

  config.skills ??= {};
  config.skills.paths ??= [];
  config.instructions ??= [];
  config.agent ??= {};

  appendUnique(config.skills.paths, skillsPath);
  appendUnique(config.instructions, bootstrapPath);
  for (const definition of definitions) {
    if (Object.hasOwn(config.agent, definition.name)) {
      logger.info(`my-ext: preserving user agent ${definition.name}`);
    }
  }
  for (const registration of registrations) {
    config.agent[registration.name] = registration.value;
  }
}

function isDirectory(value) {
  try {
    return statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function isFile(value) {
  try {
    return statSync(value).isFile();
  } catch {
    return false;
  }
}

function isSelfSpecifier(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value === "my-ext"
    || value.startsWith("my-ext@")
    || /^(?:git\+)?https:\/\/github\.com\/yuanx123\/my-cc-ext(?:\.git)?(?:[?#].*)?$/i.test(value)
    || /^git@github\.com:yuanx123\/my-cc-ext(?:\.git)?(?:#.*)?$/i.test(value);
}

export function createHooks({ packageRoot = PACKAGE_ROOT, localEntry, logger = console } = {}) {
  const resolvedRoot = path.resolve(packageRoot);
  const skillsPath = path.join(resolvedRoot, "skills");
  const bootstrapPath = path.join(resolvedRoot, ".opencode", "bootstrap.md");
  const isLocalEntry = localEntry ?? isDirectory(path.join(PACKAGE_ROOT, ".git"));

  return {
    async config(config) {
      validateConfig(config);
      if (!isDirectory(skillsPath)) {
        throw new Error(`my-ext: skills directory not found at ${skillsPath}`);
      }
      if (!isFile(bootstrapPath)) {
        throw new Error(`my-ext: bootstrap file not found at ${bootstrapPath}`);
      }
      if (isLocalEntry && (config.plugin ?? []).some(isSelfSpecifier)) {
        logger.warn("my-ext: local plugin entry and package entry are both enabled; uninstall the package entry in this repository (see .opencode/INSTALL.md)");
      }
      registerConfig(config, {
        skillsPath,
        bootstrapPath,
        definitions: loadAgents(resolvedRoot),
        logger,
      });
    },
  };
}

export async function MyExtPlugin() {
  return createHooks();
}

export default MyExtPlugin;
