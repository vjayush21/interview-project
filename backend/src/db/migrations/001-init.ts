import type { QueryInterface } from "sequelize";

export async function up({ context }: { context: QueryInterface }) {
  await context.createTable("users", {
    id: { type: "BIGINT", allowNull: false, autoIncrement: true, primaryKey: true },
    email: { type: "VARCHAR(255)", allowNull: false, unique: true },
    password_hash: { type: "VARCHAR(255)", allowNull: false },
    display_name: { type: "VARCHAR(120)", allowNull: false },
    created_at: { type: "TIMESTAMP", allowNull: false, defaultValue: context.sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: {
      type: "TIMESTAMP",
      allowNull: false,
      defaultValue: context.sequelize.literal("CURRENT_TIMESTAMP")
    }
  });

  await context.createTable("openrouter_credentials", {
    id: { type: "BIGINT", allowNull: false, autoIncrement: true, primaryKey: true },
    user_id: { type: "BIGINT", allowNull: false, unique: true },
    api_key_ciphertext: { type: "VARBINARY(2048)", allowNull: false },
    api_key_key_version: { type: "VARCHAR(50)", allowNull: false },
    api_key_hint: { type: "VARCHAR(32)", allowNull: false },
    status: { type: "ENUM('active','invalid','revoked')", allowNull: false, defaultValue: "active" },
    last_verified_at: { type: "TIMESTAMP", allowNull: true },
    created_at: { type: "TIMESTAMP", allowNull: false, defaultValue: context.sequelize.literal("CURRENT_TIMESTAMP") },
    updated_at: {
      type: "TIMESTAMP",
      allowNull: false,
      defaultValue: context.sequelize.literal("CURRENT_TIMESTAMP")
    }
  });

  await context.addConstraint("openrouter_credentials", {
    fields: ["user_id"],
    type: "foreign key",
    name: "fk_openrouter_credentials_user_id",
    references: {
      table: "users",
      field: "id"
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  });
}

export async function down({ context }: { context: QueryInterface }) {
  await context.dropTable("openrouter_credentials");
  await context.dropTable("users");
}
