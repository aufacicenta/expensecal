import type { Sequelize } from "sequelize";
import Category from "./Category";
import Currency from "./Currency";
import Event from "./Event";
import EventCategories from "./EventCategories";
import EventGroup from "./EventGroup";
import EventGroupEvents from "./EventGroupEvents";
import EventInstallment from "./EventInstallment";
import ExampleModel from "./ExampleModel";
import ExchangeRate from "./ExchangeRate";
import UserPreferences from "./UserPreferences";

export {
  Category,
  Currency,
  Event,
  EventCategories,
  EventGroup,
  EventGroupEvents,
  EventInstallment,
  ExampleModel,
  ExchangeRate,
  UserPreferences,
};

export function initModels(sequelize: Sequelize) {
  ExampleModel.initModel(sequelize);
  Currency.initModel(sequelize);
  Event.initModel(sequelize);
  EventInstallment.initModel(sequelize);
  ExchangeRate.initModel(sequelize);
  Category.initModel(sequelize);
  EventCategories.initModel(sequelize);
  EventGroup.initModel(sequelize);
  EventGroupEvents.initModel(sequelize);
  UserPreferences.initModel(sequelize);

  ExampleModel.associate();
  Currency.associate();
  Event.associate();
  EventInstallment.associate();
  ExchangeRate.associate();
  Category.associate();
  EventCategories.associate();
  EventGroup.associate();
  EventGroupEvents.associate();
  UserPreferences.associate();

  return {
    ExampleModel,
    Currency,
    Event,
    EventInstallment,
    ExchangeRate,
    Category,
    EventCategories,
    EventGroup,
    EventGroupEvents,
    UserPreferences,
  };
}
