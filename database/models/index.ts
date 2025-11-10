import type { Sequelize } from "sequelize";
import Currency from "./Currency";
import Event from "./Event";
import EventInstallment from "./EventInstallment";
import ExampleModel from "./ExampleModel";
import ExchangeRate from "./ExchangeRate";

export { Currency, Event, EventInstallment, ExampleModel, ExchangeRate };

export function initModels(sequelize: Sequelize) {
  ExampleModel.initModel(sequelize);
  Currency.initModel(sequelize);
  Event.initModel(sequelize);
  EventInstallment.initModel(sequelize);
  ExchangeRate.initModel(sequelize);

  ExampleModel.associate();
  Currency.associate();
  Event.associate();
  EventInstallment.associate();
  ExchangeRate.associate();

  return {
    ExampleModel,
    Currency,
    Event,
    EventInstallment,
    ExchangeRate,
  };
}
