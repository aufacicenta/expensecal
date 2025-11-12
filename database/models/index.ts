import type { Sequelize } from "sequelize";
import Category from "./Category";
import Currency from "./Currency";
import Event from "./Event";
import EventCategories from "./EventCategories";
import EventInstallment from "./EventInstallment";
import ExampleModel from "./ExampleModel";
import ExchangeRate from "./ExchangeRate";

export { Category, Currency, Event, EventCategories, EventInstallment, ExampleModel, ExchangeRate };

export function initModels(sequelize: Sequelize) {
  ExampleModel.initModel(sequelize);
  Currency.initModel(sequelize);
  Event.initModel(sequelize);
  EventInstallment.initModel(sequelize);
  ExchangeRate.initModel(sequelize);
  Category.initModel(sequelize);
  EventCategories.initModel(sequelize);

  ExampleModel.associate();
  Currency.associate();
  Event.associate();
  EventInstallment.associate();
  ExchangeRate.associate();
  Category.associate();
  EventCategories.associate();

  return {
    ExampleModel,
    Currency,
    Event,
    EventInstallment,
    ExchangeRate,
    Category,
    EventCategories,
  };
}
