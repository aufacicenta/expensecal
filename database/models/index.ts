import type { Sequelize } from "sequelize";
import Currency from "./Currency";
import Event from "./Event";
import EventInstallment from "./EventInstallment";
import ExampleModel from "./ExampleModel";

export { Currency, Event, EventInstallment, ExampleModel };

export function initModels(sequelize: Sequelize) {
  ExampleModel.initModel(sequelize);
  Currency.initModel(sequelize);
  Event.initModel(sequelize);
  EventInstallment.initModel(sequelize);

  ExampleModel.associate();
  Currency.associate();
  Event.associate();
  EventInstallment.associate();

  return {
    ExampleModel,
    Currency,
    Event,
    EventInstallment,
  };
}
