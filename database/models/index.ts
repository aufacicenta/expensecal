import type { Sequelize } from "sequelize";
import ExampleModel from "./ExampleModel";

export { ExampleModel };

export function initModels(sequelize: Sequelize) {
  ExampleModel.initModel(sequelize);

  ExampleModel.associate();

  return {
    ExampleModel,
  };
}
