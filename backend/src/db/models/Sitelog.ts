import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize";

export interface SitelogAttributes {
  id: number;
  type_id: string;
  type: string;
  function_name: string;
  created_by_id: string | null;
  reference_id: string | null;
  metadata: string | null;
  remarks: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  saas_client_id: number | null;
}

export interface SitelogCreationAttributes extends Optional<SitelogAttributes, "id" | "created_by_id" | "reference_id" | "metadata" | "remarks" | "createdAt" | "updatedAt" | "deletedAt" | "saas_client_id"> {}

export class Sitelog extends Model<SitelogAttributes, SitelogCreationAttributes> implements SitelogAttributes {
  public id!: number;
  public type_id!: string;
  public type!: string;
  public function_name!: string;
  public created_by_id!: string | null;
  public reference_id!: string | null;
  public metadata!: string | null;
  public remarks!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt!: Date | null;
  public saas_client_id!: number | null;
}

Sitelog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    type_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    function_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    created_by_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    reference_id: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    saas_client_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: "sitelog",
    timestamps: true,
    paranoid: true, // Enables soft deletes using deletedAt
  }
);
