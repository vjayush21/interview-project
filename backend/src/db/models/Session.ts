import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

interface SessionAttributes {
  id: number;
  userId: number;
  role: string;
  difficulty: "easy" | "medium" | "hard";
  topicsJson: string[] | null;
  questionTargetCount: number;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export interface SessionCreationAttributes extends Optional<SessionAttributes, "id" | "questionTargetCount" | "createdAt" | "deletedAt"> {}

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  declare public id: number;
  declare public userId: number;
  declare public role: string;
  declare public difficulty: "easy" | "medium" | "hard";
  declare public topicsJson: string[] | null;
  declare public questionTargetCount: number;
  declare public readonly createdAt: Date;
  declare public readonly deletedAt: Date | null;
}

Session.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "user_id",
    },
    role: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false,
    },
    topicsJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "topics_json",
    },
    questionTargetCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: "question_target_count",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: "deleted_at",
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "sessions",
    timestamps: true,
    updatedAt: false, // Schema only has created_at
    paranoid: true, // Enables soft deletes
  }
);
