import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

export interface QuestionAttributes {
  id: number;
  sessionId: number;
  status: "pending" | "ready" | "failed" | "answered" | "evaluated";
  promptText: string;
  model: string;
  questionText: string | null;
  answerText: string | null;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  expectedPointsJson: string[] | null;
  evaluationJson: any | null;
  timeboxSeconds: number | null;
  openrouterRawResponseJson: any | null;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export interface QuestionCreationAttributes extends Optional<QuestionAttributes, "id" | "status" | "createdAt" | "deletedAt" | "questionText" | "answerText" | "topic" | "difficulty" | "expectedPointsJson" | "evaluationJson" | "timeboxSeconds" | "openrouterRawResponseJson"> {}

export class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  declare public id: number;
  declare public sessionId: number;
  declare public status: "pending" | "ready" | "failed" | "answered" | "evaluated";
  declare public promptText: string;
  declare public model: string;
  declare public questionText: string | null;
  declare public answerText: string | null;
  declare public topic: string | null;
  declare public difficulty: "easy" | "medium" | "hard" | null;
  declare public expectedPointsJson: string[] | null;
  declare public evaluationJson: any | null;
  declare public timeboxSeconds: number | null;
  declare public openrouterRawResponseJson: any | null;
  declare public readonly createdAt: Date;
  declare public readonly deletedAt: Date | null;
}

Question.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "session_id",
    },
    status: {
      type: DataTypes.ENUM("pending", "ready", "failed", "answered", "evaluated"),
      allowNull: false,
      defaultValue: "pending",
    },
    promptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "prompt_text",
    },
    model: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "question_text",
    },
    answerText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "answer_text",
    },
    topic: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: true,
    },
    expectedPointsJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "expected_points_json",
    },
    evaluationJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "evaluation_json",
    },
    timeboxSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "timebox_seconds",
    },
    openrouterRawResponseJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "openrouter_raw_response_json",
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
    tableName: "questions",
    timestamps: true,
    updatedAt: false,
    paranoid: true, // Enables soft deletes
  }
);
