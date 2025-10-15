const path = require("path");

const promptDirectory = require("inquirer-directory");

const generatorTypes = {
  REACT_COMPONENT: "React component",
  CUSTOM_HOOK: "Custom hook",
  CUSTOM_CONTEXT: "Custom context",
  PAGE: "Next.js page",
};

const customContextGenerator = () => ({
  description: generatorTypes.CUSTOM_HOOK,
  prompts: [
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./",
    },
    {
      type: "input",
      name: "name",
      message: "context name. exclude 'context'",
    },
  ],
  actions: () => {
    const actions = [
      {
        type: "add",
        path: "{{directory}}/{{name}}/{{pascalCase name}}Context.tsx",
        templateFile: "plop-templates/context/context.hbs",
      },
      {
        type: "add",
        path: "{{directory}}/{{name}}/{{pascalCase name}}Context.types.ts",
        templateFile: "plop-templates/context/context.types.hbs",
      },
      {
        type: "add",
        path: "{{directory}}/{{name}}/{{pascalCase name}}ContextController.tsx",
        templateFile: "plop-templates/context/contextController.tsx.hbs",
      },
      {
        type: "add",
        path: "{{directory}}/{{name}}/use{{pascalCase name}}Context.tsx",
        templateFile: "plop-templates/context/useContext.tsx.hbs",
      },
    ];

    return actions;
  },
});

const customHookGenerator = () => ({
  description: generatorTypes.CUSTOM_HOOK,
  prompts: [
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./",
    },
    {
      type: "input",
      name: "name",
      message: "hook name",
    },
  ],
  actions: () => {
    const actions = [
      {
        type: "add",
        path: "{{directory}}/{{name}}/{{camelCase name}}.tsx",
        templateFile: "plop-templates/hook/hook.hbs",
      },
      {
        type: "add",
        path: "{{directory}}/{{name}}/{{camelCase name}}.test.tsx",
        templateFile: "plop-templates/hook/hook.test.hbs",
      },
    ];

    return actions;
  },
});

const reactComponentGenerator = (plop) => ({
  description: generatorTypes.REACT_COMPONENT,
  prompts: [
    {
      type: "list",
      name: "baseDir",
      message: "base directory",
      choices: ["components", "app", "ui"],
      default: 1,
    },
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./components",
      when: (answers) => answers.baseDir === "components",
    },
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./app",
      when: (answers) => answers.baseDir === "app",
    },
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./ui",
      when: (answers) => answers.baseDir === "ui",
    },
    {
      type: "input",
      name: "name",
      message: "component name",
    },
    {
      type: "confirm",
      name: "addStyles",
      message: "add styles",
      default: true,
    },
    {
      type: "confirm",
      name: "addContainer",
      message: "add container",
      default: false,
    },
    {
      type: "confirm",
      name: "addStory",
      message: "add story",
      default: false,
    },
  ],
  actions: (data) => {
    const actions = [
      {
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}.tsx`,
        templateFile: "plop-templates/component/Component.hbs",
      },
      {
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}.test.tsx`,
        templateFile: "plop-templates/component/Component.test.hbs",
      },
      {
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}.types.ts`,
        templateFile: "plop-templates/component/Component.types.hbs",
      },
    ];

    if (data.addStyles) {
      const baseFilePath = path
        .relative(`${data.baseDir}/{{directory}}/{{name}}`, "theme/_base.scss")
        .replace("../", "")
        .replace(".scss", "");

      plop.setHelper("baseFilePath", baseFilePath);

      actions.push({
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}.module.scss`,
        templateFile: "plop-templates/component/Component.module.scss.hbs",
      });
    }

    if (data.addContainer) {
      actions.push({
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}Container.tsx`,
        templateFile: "plop-templates/component/ComponentContainer.hbs",
      });
    }

    if (data.addStory) {
      actions.push({
        type: "add",
        path: `${data.baseDir}/{{directory}}/{{name}}/{{pascalCase name}}.story.tsx`,
        templateFile: "plop-templates/component/Component.story.hbs",
      });
    }

    return actions;
  },
});

const pageGenerator = () => ({
  description: generatorTypes.PAGE,
  prompts: [
    {
      type: "directory",
      name: "directory",
      message: "select directory",
      basePath: "./pages",
    },
    {
      type: "input",
      name: "name",
      message: "page name",
    },
  ],
  actions: () => {
    const actions = [
      {
        type: "add",
        path: "pages/{{directory}}/{{name}}.tsx",
        templateFile: "plop-templates/page/page.hbs",
      },
    ];

    return actions;
  },
});

module.exports = (plop) => {
  plop.setPrompt("directory", promptDirectory);
  plop.setGenerator(
    generatorTypes.REACT_COMPONENT,
    reactComponentGenerator(plop),
  );
  plop.setGenerator(generatorTypes.CUSTOM_HOOK, customHookGenerator());
  plop.setGenerator(generatorTypes.CUSTOM_CONTEXT, customContextGenerator());
  plop.setGenerator(generatorTypes.PAGE, pageGenerator());
};
