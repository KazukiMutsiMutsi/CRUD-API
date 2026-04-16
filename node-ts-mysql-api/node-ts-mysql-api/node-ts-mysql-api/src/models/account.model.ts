import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum Role {
  Admin = 'Admin',
  User = 'User',
}

interface AccountAttributes {
  id: number;
  email: string;
  passwordHash: string;
  title?: string;
  firstName: string;
  lastName: string;
  role: Role;
  verificationToken?: string;
  verified?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  passwordReset?: Date;
  isVerified: boolean;
  created: Date;
  updated: Date;
}

type AccountCreationAttributes = Optional<AccountAttributes, 'id' | 'isVerified' | 'created' | 'updated'>;

export class Account extends Model<AccountAttributes, AccountCreationAttributes> implements AccountAttributes {
  declare id: number;
  declare email: string;
  declare passwordHash: string;
  declare title?: string;
  declare firstName: string;
  declare lastName: string;
  declare role: Role;
  declare verificationToken?: string;
  declare verified?: Date;
  declare resetToken?: string;
  declare resetTokenExpires?: Date;
  declare passwordReset?: Date;
  declare isVerified: boolean;
  declare created: Date;
  declare updated: Date;
}

Account.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM(...Object.values(Role)), allowNull: false, defaultValue: Role.User },
    verificationToken: { type: DataTypes.STRING },
    verified: { type: DataTypes.DATE },
    resetToken: { type: DataTypes.STRING },
    resetTokenExpires: { type: DataTypes.DATE },
    passwordReset: { type: DataTypes.DATE },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Account',
    tableName: 'accounts',
    timestamps: false,
  }
);
