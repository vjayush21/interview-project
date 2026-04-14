import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export type UserAttributes = {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserCreationAttributes = {
  email: string;
  passwordHash: string;
  displayName: string;
};

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare passwordHash: string;
  declare displayName: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: "password_hash" },
    displayName: { type: DataTypes.STRING(120), allowNull: false, field: "display_name" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" }
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true
  }
);

