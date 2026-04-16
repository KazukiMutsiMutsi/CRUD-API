import { Sequelize } from 'sequelize';
import config from './config.json';

const { host, port, user, password, database } = config.database;

export const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false,
});
