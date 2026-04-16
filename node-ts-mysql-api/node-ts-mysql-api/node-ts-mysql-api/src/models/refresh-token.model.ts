import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Account } from './account.model';

interface RefreshTokenAttributes {
  id: number;
  accountId: number;
  token: string;
  expires: Date;
  created: Date;
  createdByIp: string;
  revoked?: Date;
  revokedByIp?: string;
  replacedByToken?: string;
}

type RefreshTokenCreationAttributes = Optional<RefreshTokenAttributes, 'id' | 'created'>;

export class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes {
  declare id: number;
  declare accountId: number;
  declare token: string;
  declare expires: Date;
  declare created: Date;
  declare createdByIp: string;
  declare revoked?: Date;
  declare revokedByIp?: string;
  declare replacedByToken?: string;

  get isExpired(): boolean {
    return new Date() >= this.expires;
  }

  get isActive(): boolean {
    return !this.revoked && !this.isExpired;
  }
}

RefreshToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    accountId: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false },
    expires: { type: DataTypes.DATE, allowNull: false },
    created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdByIp: { type: DataTypes.STRING, allowNull: false },
    revoked: { type: DataTypes.DATE },
    revokedByIp: { type: DataTypes.STRING },
    replacedByToken: { type: DataTypes.STRING },
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: false,
  }
);

Account.hasMany(RefreshToken, { foreignKey: 'accountId', as: 'refreshTokens' });
RefreshToken.belongsTo(Account, { foreignKey: 'accountId' });
