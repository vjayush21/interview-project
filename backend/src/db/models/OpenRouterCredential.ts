import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

export type OpenRouterCredentialAttributes = {
  id: number;
  userId: number;
  apiKeyCiphertext: Buffer;
  apiKeyKeyVersion: string;
  apiKeyHint: string;
  status: "active" | "invalid" | "revoked";
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OpenRouterCredentialCreationAttributes = {
  userId: number;
  apiKeyCiphertext: Buffer;
  apiKeyKeyVersion: string;
  apiKeyHint: string;
  status?: "active" | "invalid" | "revoked";
  lastVerifiedAt?: Date | null;
};

export class OpenRouterCredential
  extends Model<OpenRouterCredentialAttributes, OpenRouterCredentialCreationAttributes>
  implements OpenRouterCredentialAttributes
{
  declare id: number;
  declare userId: number;
  declare apiKeyCiphertext: Buffer;
  declare apiKeyKeyVersion: string;
  declare apiKeyHint: string;
  declare status: "active" | "invalid" | "revoked";
  declare lastVerifiedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

OpenRouterCredential.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT, allowNull: false, unique: true, field: "user_id" },
    apiKeyCiphertext: { type: DataTypes.BLOB("long"), allowNull: false, field: "api_key_ciphertext" },
    apiKeyKeyVersion: { type: DataTypes.STRING(50), allowNull: false, field: "api_key_key_version" },
    apiKeyHint: { type: DataTypes.STRING(32), allowNull: false, field: "api_key_hint" },
    status: { type: DataTypes.ENUM("active", "invalid", "revoked"), allowNull: false, defaultValue: "active" },
    lastVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: "last_verified_at" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" }
  },
  {
    sequelize,
    tableName: "openrouter_credentials",
    timestamps: true,
    underscored: true
  }
);

